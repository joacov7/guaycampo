import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import { Pool } from 'pg';
import { MqttService } from '../mqtt/mqtt.service';
import { MqttTopicParser } from '../mqtt/mqtt-topic.parser';
import { SilosGateway } from '../websocket/silos.gateway';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface AerationEvent {
  id: string;
  siloId: string;
  isActive: boolean;
  startedAt: Date | null;
  stoppedAt: Date | null;
  startedBy: string | null;
  stoppedBy: string | null;
  durationMinutes: number | null;
  notes: string | null;
  tenantId: string;
}

export interface AerationSchedule {
  cronExpression?: string;    // e.g. "0 6 * * *" for 6am daily
  durationMinutes: number;
  tempThreshold?: number;     // auto-start when avg temp exceeds this
  humidityMax?: number;       // only start when ambient humidity < this
}

export interface AerationStatus {
  siloId: string;
  isActive: boolean;
  startedAt: string | null;
  startedBy: string | null;
  totalMinutesLast7Days: number;
  lastEvent: AerationEvent | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AerationService {
  private readonly logger = new Logger(AerationService.name);

  constructor(
    @Inject('PG_POOL') private readonly db: Pool,
    @Inject(forwardRef(() => MqttService))
    private readonly mqttService: MqttService,
    @Inject(forwardRef(() => SilosGateway))
    private readonly silosGateway: SilosGateway,
  ) {}

  async getStatus(siloId: string, tenantId: string): Promise<AerationStatus> {
    const silo = await prisma.silo.findFirst({ where: { id: siloId, tenantId } });
    if (!silo) throw new NotFoundException(`Silo ${siloId} not found`);

    const lastEvent = await this.getLastAerationEvent(siloId, tenantId);
    const isActive = lastEvent ? lastEvent.isActive && lastEvent.stoppedAt === null : false;

    const totalMinutes = await this.getTotalAerationMinutes(siloId, 7, tenantId);

    return {
      siloId,
      isActive,
      startedAt: lastEvent?.startedAt?.toISOString() ?? null,
      startedBy: lastEvent?.startedBy ?? null,
      totalMinutesLast7Days: totalMinutes,
      lastEvent,
    };
  }

  async startAeration(
    siloId: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<AerationEvent> {
    const silo = await prisma.silo.findFirst({ where: { id: siloId, tenantId } });
    if (!silo) throw new NotFoundException(`Silo ${siloId} not found`);

    // Check if aeration is already active
    const current = await this.getLastAerationEvent(siloId, tenantId);
    if (current && current.isActive && current.stoppedAt === null) {
      throw new BadRequestException(`Aeration is already active for silo ${siloId}`);
    }

    // Create event record
    const event = await this.createAerationEvent({
      siloId,
      isActive: true,
      startedAt: new Date(),
      stoppedAt: null,
      startedBy: userId,
      stoppedBy: null,
      notes: notes ?? null,
      tenantId,
    });

    // Send MQTT command if actuator is available
    await this.sendAerationCommand(silo.tenantId, silo, 'ON');

    // Broadcast WebSocket
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      this.silosGateway.broadcastAerationStatus(tenant.slug, {
        siloId,
        isActive: true,
        changedAt: event.startedAt!.toISOString(),
        changedBy: userId,
      });
    }

    this.logger.log(`Aeration started for silo ${siloId} by user ${userId}`);
    return event;
  }

  async stopAeration(
    siloId: string,
    userId: string,
    tenantId: string,
    notes?: string,
  ): Promise<AerationEvent> {
    const silo = await prisma.silo.findFirst({ where: { id: siloId, tenantId } });
    if (!silo) throw new NotFoundException(`Silo ${siloId} not found`);

    const current = await this.getLastAerationEvent(siloId, tenantId);
    if (!current || !current.isActive || current.stoppedAt !== null) {
      throw new BadRequestException(`Aeration is not currently active for silo ${siloId}`);
    }

    const stoppedAt = new Date();
    const durationMinutes = current.startedAt
      ? Math.round((stoppedAt.getTime() - current.startedAt.getTime()) / 60000)
      : null;

    // Update record
    const updated = await this.updateAerationEvent(current.id, {
      isActive: false,
      stoppedAt,
      stoppedBy: userId,
      durationMinutes,
      notes: notes ?? current.notes,
    });

    // MQTT OFF command
    await this.sendAerationCommand(silo.tenantId, silo, 'OFF');

    // Broadcast WebSocket
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      this.silosGateway.broadcastAerationStatus(tenant.slug, {
        siloId,
        isActive: false,
        changedAt: stoppedAt.toISOString(),
        changedBy: userId,
      });
    }

    this.logger.log(
      `Aeration stopped for silo ${siloId} by user ${userId} (${durationMinutes ?? '?'} min)`,
    );
    return updated;
  }

  async getHistory(
    siloId: string,
    days: number,
    tenantId: string,
  ): Promise<AerationEvent[]> {
    const silo = await prisma.silo.findFirst({ where: { id: siloId, tenantId } });
    if (!silo) throw new NotFoundException(`Silo ${siloId} not found`);

    const safeDays = Math.min(Math.max(days, 1), 365);
    const result = await this.db.query<AerationEvent>(
      `SELECT id, silo_id as "siloId", is_active as "isActive",
              started_at as "startedAt", stopped_at as "stoppedAt",
              started_by as "startedBy", stopped_by as "stoppedBy",
              duration_minutes as "durationMinutes", notes, tenant_id as "tenantId"
       FROM silo_aeration_events
       WHERE silo_id = $1 AND tenant_id = $2
         AND started_at > NOW() - ($3 || ' days')::INTERVAL
       ORDER BY started_at DESC`,
      [siloId, tenantId, safeDays],
    );
    return result.rows;
  }

  /**
   * Evaluate automatic aeration based on average temperature.
   * Called periodically or when a temperature reading is processed.
   */
  async evaluateAutoAeration(
    siloId: string,
    avgTemp: number,
    tenantId: string,
  ): Promise<void> {
    const silo = await prisma.silo.findFirst({ where: { id: siloId, tenantId } });
    if (!silo) return;

    const config = silo as unknown as Record<string, unknown>;
    const autoAerationTemp = (config.autoAerationTemp as number | undefined) ?? 28;

    const current = await this.getLastAerationEvent(siloId, tenantId);
    const isActive = current ? current.isActive && current.stoppedAt === null : false;

    if (avgTemp > autoAerationTemp && !isActive) {
      this.logger.log(
        `Auto-starting aeration for silo ${siloId} (avgTemp=${avgTemp}°C > threshold=${autoAerationTemp}°C)`,
      );
      await this.startAeration(
        siloId,
        'system',
        tenantId,
        `Aireación automática: temperatura promedio ${avgTemp}°C supera umbral ${autoAerationTemp}°C`,
      ).catch((err: Error) =>
        this.logger.error(`Auto-aeration start failed: ${err.message}`),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async sendAerationCommand(
    tenantId: string,
    silo: { id: string; name: string },
    command: 'ON' | 'OFF',
  ): Promise<void> {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return;

      const topic = MqttTopicParser.aerationCommand(tenant.slug, silo.id);
      await this.mqttService.publish(topic, command, { qos: 1, retain: false });
      this.logger.debug(`Sent aeration command ${command} to ${topic}`);
    } catch (err) {
      // Log but don't fail — manual operation should still record in DB
      this.logger.warn(`Failed to send MQTT aeration command: ${String(err)}`);
    }
  }

  private async getLastAerationEvent(
    siloId: string,
    tenantId: string,
  ): Promise<AerationEvent | null> {
    try {
      const result = await this.db.query<AerationEvent>(
        `SELECT id, silo_id as "siloId", is_active as "isActive",
                started_at as "startedAt", stopped_at as "stoppedAt",
                started_by as "startedBy", stopped_by as "stoppedBy",
                duration_minutes as "durationMinutes", notes, tenant_id as "tenantId"
         FROM silo_aeration_events
         WHERE silo_id = $1 AND tenant_id = $2
         ORDER BY started_at DESC
         LIMIT 1`,
        [siloId, tenantId],
      );
      return result.rows[0] ?? null;
    } catch {
      return null;
    }
  }

  private async createAerationEvent(data: {
    siloId: string;
    isActive: boolean;
    startedAt: Date;
    stoppedAt: Date | null;
    startedBy: string;
    stoppedBy: string | null;
    notes: string | null;
    tenantId: string;
  }): Promise<AerationEvent> {
    const result = await this.db.query<AerationEvent>(
      `INSERT INTO silo_aeration_events
         (silo_id, is_active, started_at, stopped_at, started_by, stopped_by, notes, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, silo_id as "siloId", is_active as "isActive",
                 started_at as "startedAt", stopped_at as "stoppedAt",
                 started_by as "startedBy", stopped_by as "stoppedBy",
                 duration_minutes as "durationMinutes", notes, tenant_id as "tenantId"`,
      [
        data.siloId,
        data.isActive,
        data.startedAt,
        data.stoppedAt,
        data.startedBy,
        data.stoppedBy,
        data.notes,
        data.tenantId,
      ],
    );
    return result.rows[0];
  }

  private async updateAerationEvent(
    id: string,
    data: {
      isActive: boolean;
      stoppedAt: Date;
      stoppedBy: string;
      durationMinutes: number | null;
      notes: string | null;
    },
  ): Promise<AerationEvent> {
    const result = await this.db.query<AerationEvent>(
      `UPDATE silo_aeration_events
       SET is_active = $1, stopped_at = $2, stopped_by = $3,
           duration_minutes = $4, notes = $5
       WHERE id = $6
       RETURNING id, silo_id as "siloId", is_active as "isActive",
                 started_at as "startedAt", stopped_at as "stoppedAt",
                 started_by as "startedBy", stopped_by as "stoppedBy",
                 duration_minutes as "durationMinutes", notes, tenant_id as "tenantId"`,
      [data.isActive, data.stoppedAt, data.stoppedBy, data.durationMinutes, data.notes, id],
    );
    return result.rows[0];
  }

  private async getTotalAerationMinutes(
    siloId: string,
    days: number,
    tenantId: string,
  ): Promise<number> {
    try {
      const result = await this.db.query<{ total: number }>(
        `SELECT COALESCE(SUM(duration_minutes), 0) AS total
         FROM silo_aeration_events
         WHERE silo_id = $1 AND tenant_id = $2
           AND started_at > NOW() - ($3 || ' days')::INTERVAL`,
        [siloId, tenantId, days],
      );
      return Number(result.rows[0]?.total ?? 0);
    } catch {
      return 0;
    }
  }
}
