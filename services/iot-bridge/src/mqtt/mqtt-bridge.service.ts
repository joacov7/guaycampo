// =============================================================================
// GuayCampo IoT Bridge — MQTT Bridge Service
// Bridges the local plant MQTT broker (EMQX on-prem) with the cloud MQTT
// broker (EMQX Cloud / any MQTT 3.1.1+ broker).
//
// When cloud is reachable:  local messages are forwarded in real-time.
// When cloud is unreachable: messages are stored in the SQLite buffer and
//   replayed automatically once the connection is restored.
// =============================================================================

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';
import { BufferService } from '../buffer/buffer.service';
import { SyncService } from '../buffer/sync.service';
import { TopicMapperService } from './topic-mapper.service';

@Injectable()
export class MqttBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBridgeService.name);

  private localClient!: MqttClient;
  private cloudClient: MqttClient | null = null;

  constructor(
    private readonly bufferService: BufferService,
    private readonly syncService: SyncService,
    private readonly topicMapper: TopicMapperService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onModuleInit(): Promise<void> {
    this.connectLocal();
    await this.connectCloud();
  }

  onModuleDestroy(): void {
    this.localClient?.end(true);
    this.cloudClient?.end(true);
  }

  // ---------------------------------------------------------------------------
  // Local broker
  // ---------------------------------------------------------------------------

  private connectLocal(): void {
    const url = process.env.MQTT_LOCAL_URL ?? 'mqtt://localhost:1883';
    const username = process.env.MQTT_LOCAL_USERNAME;
    const password = process.env.MQTT_LOCAL_PASSWORD;

    this.localClient = mqtt.connect(url, {
      clientId: `iot-bridge-local-${Date.now()}`,
      username,
      password,
      keepalive: 30,
      reconnectPeriod: 5_000,
      clean: true,
    });

    this.localClient.on('connect', () => {
      this.logger.log(`Connected to local MQTT broker at ${url}`);
      this.localClient.subscribe('guaycampo/#', { qos: 1 }, (err) => {
        if (err)
          this.logger.error(`Subscribe error on local broker: ${err.message}`);
      });
    });

    this.localClient.on('message', (topic: string, payload: Buffer) => {
      void this.forwardToCloud(topic, payload);
    });

    this.localClient.on('error', (err: Error) => {
      this.logger.error(`Local MQTT error: ${err.message}`);
    });

    this.localClient.on('reconnect', () => {
      this.logger.warn('Reconnecting to local MQTT broker…');
    });

    this.localClient.on('offline', () => {
      this.logger.warn('Local MQTT client offline');
    });
  }

  // ---------------------------------------------------------------------------
  // Cloud broker
  // ---------------------------------------------------------------------------

  private async connectCloud(): Promise<void> {
    const url = process.env.MQTT_CLOUD_URL;
    if (!url) {
      this.logger.warn(
        'MQTT_CLOUD_URL not set — running in local-only mode (buffer enabled)',
      );
      return;
    }

    try {
      this.cloudClient = mqtt.connect(url, {
        clientId: `iot-bridge-cloud-${process.env.TENANT_SLUG ?? 'default'}-${Date.now()}`,
        username: process.env.MQTT_CLOUD_USERNAME,
        password: process.env.MQTT_CLOUD_PASSWORD,
        keepalive: 60,
        reconnectPeriod: 10_000,
        clean: true,
      });

      this.cloudClient.on('connect', async () => {
        this.logger.log('Connected to cloud MQTT broker');
        // Drain any messages buffered while offline
        await this.syncService.drainBuffer(this.cloudClient!);
      });

      this.cloudClient.on('error', (err: Error) => {
        this.logger.warn(`Cloud MQTT error: ${err.message}`);
      });

      this.cloudClient.on('reconnect', () => {
        this.logger.warn('Reconnecting to cloud MQTT broker…');
      });

      this.cloudClient.on('offline', () => {
        this.logger.warn(
          'Cloud MQTT client offline — messages will be buffered',
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not connect to cloud MQTT: ${msg} — running offline`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Bridging
  // ---------------------------------------------------------------------------

  private async forwardToCloud(
    topic: string,
    payload: Buffer,
  ): Promise<void> {
    const cloudTopic = this.topicMapper.toCloudTopic(topic);
    const payloadStr = payload.toString();

    if (this.cloudClient?.connected) {
      try {
        await this.publishCloud(cloudTopic, payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to forward ${topic} to cloud: ${msg} — buffering`,
        );
        this.bufferService.store({
          topic: cloudTopic,
          payload: payloadStr,
          timestamp: new Date(),
        });
      }
    } else {
      // Cloud unreachable — buffer the message
      this.bufferService.store({
        topic: cloudTopic,
        payload: payloadStr,
        timestamp: new Date(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Publish a message to the local MQTT broker.
   * Used by ModbusBridgeService to inject Modbus readings into the pipeline.
   */
  publishLocal(topic: string, payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.localClient.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private publishCloud(topic: string, payload: Buffer | string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.cloudClient) {
        reject(new Error('Cloud client not initialised'));
        return;
      }
      this.cloudClient.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getCloudClient(): MqttClient | null {
    return this.cloudClient;
  }

  isCloudConnected(): boolean {
    return this.cloudClient?.connected === true;
  }

  isLocalConnected(): boolean {
    return this.localClient?.connected === true;
  }

  // ---------------------------------------------------------------------------
  // Event hooks (from ConnectivityService)
  // ---------------------------------------------------------------------------

  @OnEvent('connectivity.restored')
  async onConnectivityRestored(): Promise<void> {
    if (this.cloudClient?.connected) {
      await this.syncService.drainBuffer(this.cloudClient);
    }
  }
}
