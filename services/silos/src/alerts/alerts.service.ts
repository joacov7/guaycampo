import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { SiloAlert } from '@guaycampo/database';
import { AlertRulesService } from './alert-rules.service';
import type { AlertRule } from './alert-rules.service';
import type { ParsedTopic } from '../mqtt/mqtt-topic.parser';
import { SilosGateway } from '../websocket/silos.gateway';
import { NotificationsService } from '../notifications/notifications.service';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface CreateAlertDto {
  siloId: string;
  alertType: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly alertRulesService: AlertRulesService,
    @Inject(forwardRef(() => SilosGateway))
    private readonly silosGateway: SilosGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Real-time alert evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluate all applicable rules for a sensor reading.
   * Creates alerts and notifies only when thresholds are exceeded.
   */
  async evaluate(
    parsed: ParsedTopic & { siloId: string },
    value: number,
    tenantId: string,
  ): Promise<void> {
    const rules = await this.alertRulesService.getRulesForSensor(
      parsed.siloId,
      parsed.sensorType,
      tenantId,
    );

    for (const rule of rules) {
      if (!this.evaluateRule(rule, value)) continue;

      // Avoid duplicate active alerts of the same type/silo
      const existing = await this.findActiveAlert(parsed.siloId, rule.alertType, tenantId);
      if (existing) continue;

      const alert = await this.createAlert({
        siloId: parsed.siloId,
        alertType: rule.alertType,
        severity: rule.severity,
        message: this.buildAlertMessage(rule, value, parsed),
        value,
        threshold: rule.threshold,
        tenantId,
      });

      // WebSocket broadcast
      this.silosGateway.broadcastAlert(parsed.tenantSlug, {
        id: alert.id,
        siloId: alert.siloId,
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        value: alert.value ? Number(alert.value) : undefined,
        threshold: alert.threshold ? Number(alert.threshold) : undefined,
        triggeredAt: alert.triggeredAt.toISOString(),
      });

      // WhatsApp notification for critical/emergency alerts
      if (rule.severity === 'critical' || rule.severity === 'emergency') {
        this.sendAlertNotification(alert).catch((err: Error) =>
          this.logger.error(`Notification failed for alert ${alert.id}: ${err.message}`),
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async findActiveByTenant(tenantId: string): Promise<SiloAlert[]> {
    return prisma.siloAlert.findMany({
      where: { tenantId, resolvedAt: null },
      include: { silo: { select: { id: true, name: true } } },
      orderBy: [{ severity: 'desc' }, { triggeredAt: 'desc' }],
    });
  }

  async findBySilo(
    siloId: string,
    tenantId: string,
    resolved = false,
  ): Promise<SiloAlert[]> {
    return prisma.siloAlert.findMany({
      where: {
        siloId,
        tenantId,
        ...(resolved ? {} : { resolvedAt: null }),
      },
      orderBy: { triggeredAt: 'desc' },
      take: 100,
    });
  }

  async findHistory(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: SiloAlert[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.siloAlert.findMany({
        where: { tenantId },
        include: { silo: { select: { id: true, name: true } } },
        orderBy: { triggeredAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.siloAlert.count({ where: { tenantId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async acknowledge(
    alertId: string,
    userId: string,
    tenantId: string,
  ): Promise<SiloAlert> {
    const alert = await prisma.siloAlert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) throw new NotFoundException(`Alert ${alertId} not found`);

    return prisma.siloAlert.update({
      where: { id: alertId },
      data: { acknowledgedAt: new Date() },
    });
  }

  async resolve(alertId: string, userId: string, tenantId: string): Promise<SiloAlert> {
    const alert = await prisma.siloAlert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) throw new NotFoundException(`Alert ${alertId} not found`);

    const resolved = await prisma.siloAlert.update({
      where: { id: alertId },
      data: { resolvedAt: new Date() },
      include: { silo: { select: { id: true, name: true } } },
    });

    return resolved;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async createAlert(dto: CreateAlertDto): Promise<SiloAlert> {
    return prisma.siloAlert.create({
      data: {
        siloId: dto.siloId,
        alertType: dto.alertType,
        severity: dto.severity,
        message: dto.message,
        value: dto.value,
        threshold: dto.threshold,
        tenantId: dto.tenantId,
        triggeredAt: new Date(),
      },
    });
  }

  private async findActiveAlert(
    siloId: string,
    alertType: string,
    tenantId: string,
  ): Promise<SiloAlert | null> {
    return prisma.siloAlert.findFirst({
      where: { siloId, alertType, tenantId, resolvedAt: null },
    });
  }

  private evaluateRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case 'gt': return value > rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lte': return value <= rule.threshold;
      default: return false;
    }
  }

  private buildAlertMessage(
    rule: AlertRule,
    value: number,
    parsed: ParsedTopic,
  ): string {
    const sensorLabels: Record<string, string> = {
      temperature: 'Temperatura',
      humidity: 'Humedad',
      level: 'Nivel',
      co2: 'CO₂',
    };
    const units: Record<string, string> = {
      temperature: '°C',
      humidity: '%',
      level: '%',
      co2: 'ppm',
    };

    const label = sensorLabels[parsed.sensorType] ?? parsed.sensorType;
    const unit = units[parsed.sensorType] ?? '';
    const pos = parsed.position ? ` (${parsed.position})` : '';
    const direction = rule.operator === 'gt' || rule.operator === 'gte' ? 'máximo' : 'mínimo';

    return `${label}${pos}: ${value}${unit} — umbral ${direction}: ${rule.threshold}${unit}`;
  }

  private async sendAlertNotification(alert: SiloAlert): Promise<void> {
    // Get silo and tenant info to find the responsible contact
    const silo = await prisma.silo.findUnique({
      where: { id: alert.siloId },
      include: { tenant: { select: { id: true, name: true, config: true } } },
    });

    if (!silo) return;

    // Get alert contact from tenant config or fall back silently
    const config = silo.tenant?.config as Record<string, unknown> | null;
    const alertPhone = config?.siloAlertPhone as string | undefined;
    if (!alertPhone) {
      this.logger.debug(
        `No siloAlertPhone configured for tenant ${silo.tenantId}, skipping WhatsApp alert`,
      );
      return;
    }

    await this.notificationsService.sendSiloAlert({
      phone: alertPhone,
      siloName: silo.name,
      alertMessage: alert.message,
      severity: alert.severity,
      triggeredAt: alert.triggeredAt.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
    });
  }
}
