/**
 * Event listener for domain events.
 * Listens to EventEmitter2 events (in-process) and triggers notifications.
 * In a distributed architecture, this would consume from Kafka topics.
 */
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DispatcherService } from '../dispatcher/dispatcher.service';
import type {
  TruckCheckedInEvent,
  TruckCalledFromQueueEvent,
  WeighingCompletedEvent,
  SiloAlertTriggeredEvent,
  UserRegisteredEvent,
} from '@guaycampo/shared-events';
import { AlertSeverity } from '@guaycampo/shared-types';

interface OperatorInfo {
  phone?: string;
  fcmToken?: string;
}

@Injectable()
export class NotificationEventsListener {
  private readonly logger = new Logger(NotificationEventsListener.name);

  constructor(private readonly dispatcher: DispatcherService) {}

  /**
   * Truck checked in → send queue position notification to driver.
   */
  @OnEvent('shifts.truck.checked_in')
  async onTruckCheckedIn(event: TruckCheckedInEvent): Promise<void> {
    this.logger.debug(`Event: truck checked in — ${event.payload.vehiclePlate}`);
    await this.dispatcher.send({
      tenantId: event.tenantId,
      type: 'queue_position',
      channel: 'whatsapp',
      phone: undefined, // driverPhone not in shared event — enrich from driver service if needed
      templateId: 'posicion_cola',
      data: {
        driverName: event.payload.driverName,
        plate: event.payload.vehiclePlate,
        position: 0,         // to be enriched
        estimatedWaitMin: 0, // to be enriched
      },
    });
  }

  /**
   * Truck called from queue → critical notification (immediate, multi-channel).
   */
  @OnEvent('queue.truck.called')
  async onTruckCalled(event: TruckCalledFromQueueEvent): Promise<void> {
    this.logger.debug(`Event: truck called — ${event.payload.vehiclePlate}`);
    await this.dispatcher.sendImmediate({
      tenantId: event.tenantId,
      type: 'driver_called',
      channel: 'multi',
      phone: event.payload.driverPhone,
      templateId: 'conductor_llamado',
      data: {
        driverName: '', // to be enriched from driver lookup
        plate: event.payload.vehiclePlate,
        scaleLabel: 'Báscula 1',
      },
    });
  }

  /**
   * Weighing completed → send ticket-ready notification to driver.
   */
  @OnEvent('scale.ticket.completed')
  async onWeighingCompleted(event: WeighingCompletedEvent): Promise<void> {
    this.logger.debug(`Event: ticket completed — ${event.payload.ticketNumber}`);
    await this.dispatcher.send({
      tenantId: event.tenantId,
      type: 'ticket_ready',
      channel: 'whatsapp',
      phone: undefined, // driver phone to be enriched
      templateId: 'ticket_listo',
      data: {
        driverName: '',
        ticketNumber: event.payload.ticketNumber,
        netWeightKg: event.payload.netWeight.toLocaleString('es-AR'),
        pdfUrl: '',
      },
    });
  }

  /**
   * Silo critical/emergency alert → notify all tenant silo operators immediately.
   */
  @OnEvent('silo.alert.triggered')
  async onSiloAlertTriggered(event: SiloAlertTriggeredEvent): Promise<void> {
    const { severity } = event.payload;
    const isCritical =
      severity === AlertSeverity.CRITICAL || severity === AlertSeverity.EMERGENCY;

    if (!isCritical) {
      this.logger.debug(`Silo alert severity ${severity} — skipping notification`);
      return;
    }

    this.logger.warn(
      `Silo CRITICAL alert: ${event.payload.siloName} — ${event.payload.message}`,
    );

    // In a real implementation, fetch operators from user service.
    // Here we dispatch a placeholder that would be enriched by a user-lookup step.
    const operators: OperatorInfo[] = await this.getOperatorsByTenant(event.tenantId);

    await Promise.allSettled(
      operators.map((op) =>
        this.dispatcher.sendImmediate({
          tenantId: event.tenantId,
          type: 'silo_emergency',
          channel: 'multi',
          phone: op.phone,
          deviceToken: op.fcmToken,
          templateId: 'alerta_silo',
          data: {
            siloName: event.payload.siloName,
            alertMessage: event.payload.message,
            severity: event.payload.severity,
          },
        }),
      ),
    );
  }

  /**
   * User registered → welcome email.
   */
  @OnEvent('auth.user.registered')
  async onUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.debug(`Event: user registered — ${event.payload.email}`);
    await this.dispatcher.send({
      tenantId: event.tenantId,
      type: 'welcome',
      channel: 'email',
      email: event.payload.email,
      templateId: 'bienvenida_email',
      data: {
        userName: event.payload.fullName,
        email: event.payload.email,
        tenantId: event.tenantId,
        tenantName: '',
        role: '',
        appUrl: process.env.APP_URL ?? 'https://app.guaycampo.com',
      },
    });
  }

  /**
   * Stub: in production, call the user/auth service to fetch operator list.
   */
  private async getOperatorsByTenant(_tenantId: string): Promise<OperatorInfo[]> {
    // TODO: replace with actual lookup via HTTP or shared DB query
    return [];
  }
}
