import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import type { IClientPublishOptions } from 'mqtt';
import { MqttTopicParser } from './mqtt-topic.parser';
import type { ParsedTopic } from './mqtt-topic.parser';
import { ReadingsService } from '../readings/readings.service';
import { AlertsService } from '../alerts/alerts.service';
import { SilosGateway } from '../websocket/silos.gateway';
import { prisma } from '@guaycampo/database';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client!: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);

  // In-memory cache for tenant/silo id lookups to avoid DB hits on every message
  private readonly tenantCache = new Map<string, string>();
  private readonly siloCache = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ReadingsService))
    private readonly readingsService: ReadingsService,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertsService: AlertsService,
    @Inject(forwardRef(() => SilosGateway))
    private readonly silosGateway: SilosGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    const mqttUrl = this.configService.get<string>('MQTT_URL', 'mqtt://localhost:1883');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    this.client = mqtt.connect(mqttUrl, {
      clientId: `guaycampo-silos-${Date.now()}`,
      username,
      password,
      keepalive: 60,
      reconnectPeriod: 5000,
      clean: true,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${mqttUrl}`);
      // Subscribe to flat sensor topics: humidity, level, co2, aeration/status
      this.client.subscribe('guaycampo/+/silo/+/+', { qos: 1 }, (err) => {
        if (err) this.logger.error(`Subscribe error: ${err.message}`);
      });
      // Subscribe to temperature with cable/position: temperature/{cable}/{position}
      this.client.subscribe('guaycampo/+/silo/+/temperature/+/+', { qos: 1 }, (err) => {
        if (err) this.logger.error(`Subscribe error (temperature): ${err.message}`);
      });
    });

    this.client.on('message', (topic: string, payload: Buffer) => {
      this.handleMessage(topic, payload).catch((err: Error) =>
        this.logger.error(`Error handling MQTT message on ${topic}: ${err.message}`),
      );
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT client offline');
    });
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    const parsed = MqttTopicParser.parse(topic);
    if (!parsed) return;

    // Ignore aeration status messages — those are command acknowledgements, not readings
    if (parsed.sensorType === 'aeration') return;

    const raw = payload.toString().trim();
    const value = parseFloat(raw);
    if (isNaN(value)) {
      this.logger.warn(`Invalid payload on ${topic}: "${raw}"`);
      return;
    }

    // Resolve IDs (with cache)
    const tenantId = await this.resolveTenantId(parsed.tenantSlug);
    if (!tenantId) return;

    const siloDbId = await this.resolveSiloId(parsed.siloId, tenantId);
    if (!siloDbId) return;

    const unit = MqttTopicParser.getUnit(parsed.sensorType);

    // 1. Insert into TimescaleDB hypertable
    await this.readingsService.insert({
      time: new Date(),
      siloId: siloDbId,
      sensorType: parsed.sensorType,
      sensorPosition: parsed.position ?? null,
      value,
      unit,
      tenantId,
    });

    // 2. Evaluate alert rules (non-blocking)
    this.alertsService
      .evaluate({ ...parsed, siloId: siloDbId }, value, tenantId)
      .catch((err: Error) =>
        this.logger.error(`Alert evaluation error: ${err.message}`),
      );

    // 3. Broadcast reading to WebSocket clients
    this.silosGateway.broadcastReading(parsed.tenantSlug, {
      siloId: siloDbId,
      sensorType: parsed.sensorType,
      position: parsed.position,
      cable: parsed.cable,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish a message to an MQTT topic.
   */
  async publish(
    topic: string,
    payload: string,
    options?: IClientPublishOptions,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, options ?? {}, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.client.end();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async resolveTenantId(tenantSlug: string): Promise<string | null> {
    if (this.tenantCache.has(tenantSlug)) {
      return this.tenantCache.get(tenantSlug)!;
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      this.logger.warn(`Tenant not found for slug: ${tenantSlug}`);
      return null;
    }

    this.tenantCache.set(tenantSlug, tenant.id);
    // Expire cache entry after 5 minutes
    setTimeout(() => this.tenantCache.delete(tenantSlug), 5 * 60 * 1000);
    return tenant.id;
  }

  private async resolveSiloId(
    mqttSiloId: string,
    tenantId: string,
  ): Promise<string | null> {
    const cacheKey = `${tenantId}:${mqttSiloId}`;
    if (this.siloCache.has(cacheKey)) {
      return this.siloCache.get(cacheKey)!;
    }

    // The mqttSiloId could be either the DB UUID or the silo name
    const silo = await prisma.silo.findFirst({
      where: {
        tenantId,
        OR: [{ id: mqttSiloId }, { name: mqttSiloId }],
      },
    });

    if (!silo) {
      this.logger.warn(`Silo not found for id/name: ${mqttSiloId} (tenant: ${tenantId})`);
      return null;
    }

    this.siloCache.set(cacheKey, silo.id);
    setTimeout(() => this.siloCache.delete(cacheKey), 5 * 60 * 1000);
    return silo.id;
  }
}
