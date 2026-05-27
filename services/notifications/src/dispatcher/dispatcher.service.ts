/**
 * Central notification dispatcher.
 * Orchestrates channels, BullMQ queuing, retries, and history tracking.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import { WhatsAppService } from '../channels/whatsapp/whatsapp.service';
import { PushService } from '../channels/push/push.service';
import { EmailService } from '../channels/email/email.service';
import { SmsService } from '../channels/sms/sms.service';
import { TemplatesService } from '../templates/templates.service';
import { HistoryService } from '../history/history.service';
import type { ChannelResult } from '../channels/channel.types';

export interface SendNotificationDto {
  notificationId?: string;
  tenantId: string;
  type: string;
  channel: 'whatsapp' | 'push' | 'email' | 'sms' | 'multi';
  phone?: string;
  deviceToken?: string;
  email?: string;
  message?: string;
  title?: string;
  body?: string;
  subject?: string;
  htmlBody?: string;
  mediaUrl?: string;
  templateId?: string;
  data?: Record<string, unknown>;
}

export interface NotificationResult {
  jobId?: string | null;
  notificationId: string;
  status: 'queued' | 'sent' | 'failed';
  externalId?: string;
}

const NOTIFICATION_QUEUE = 'notifications';

const PRIORITIES: Record<string, number> = {
  driver_called: 1,
  silo_emergency: 1,
  shift_confirmation: 5,
  queue_position: 5,
  ticket_ready: 10,
  liquidation_ready: 20,
  reminder: 50,
};

@Injectable()
export class DispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatcherService.name);
  private queue!: Queue<SendNotificationDto>;
  private worker!: Worker<SendNotificationDto>;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly templatesService: TemplatesService,
    private readonly historyService: HistoryService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    // Parse URL into host/port for BullMQ ConnectionOptions (avoids ioredis version mismatch)
    const url = new URL(redisUrl);
    const connection: ConnectionOptions = {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1) || '0', 10) : 0,
    };

    this.queue = new Queue<SendNotificationDto>(NOTIFICATION_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.worker = new Worker<SendNotificationDto>(
      NOTIFICATION_QUEUE,
      async (job: Job<SendNotificationDto>) => {
        await this.processNotification(job.data);
      },
      { connection, concurrency: 10 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Notification queue worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  /**
   * Enqueue a notification for async processing with retries.
   */
  async send(notification: SendNotificationDto): Promise<NotificationResult> {
    const notificationId = notification.notificationId ?? crypto.randomUUID();
    const enriched = { ...notification, notificationId };

    // Register in history immediately
    this.historyService.create(
      {
        tenantId: notification.tenantId,
        type: notification.type,
        channel: notification.channel,
        recipient: this.getRecipient(notification),
        templateId: notification.templateId,
        message: notification.message,
        status: 'queued',
      },
      notificationId,
    );

    const job = await this.queue.add('send', enriched, {
      priority: this.getPriority(notification.type),
    });

    this.logger.debug(`Notification ${notificationId} enqueued (job ${job.id})`);
    return { jobId: job.id, notificationId, status: 'queued' };
  }

  /**
   * Send a notification immediately without queueing.
   * Use for critical notifications (driver called, silo emergency).
   */
  async sendImmediate(notification: SendNotificationDto): Promise<NotificationResult> {
    const notificationId = notification.notificationId ?? crypto.randomUUID();
    const enriched = { ...notification, notificationId };

    this.historyService.create(
      {
        tenantId: notification.tenantId,
        type: notification.type,
        channel: notification.channel,
        recipient: this.getRecipient(notification),
        templateId: notification.templateId,
        message: notification.message,
        status: 'queued',
      },
      notificationId,
    );

    return this.processNotification(enriched);
  }

  async processNotification(n: SendNotificationDto): Promise<NotificationResult> {
    const notificationId = n.notificationId ?? crypto.randomUUID();

    // Render template if provided
    const rendered = n.templateId && n.data
      ? this.templatesService.render(n.templateId, n.data)
      : null;

    const message = rendered?.message ?? n.message ?? '';
    const title = rendered?.pushTitle ?? n.title ?? '';
    const body = rendered?.pushBody ?? n.body ?? '';
    const subject = rendered?.subject ?? n.subject ?? '';
    const htmlBody = rendered?.html ?? n.htmlBody ?? '';

    try {
      let result: ChannelResult;

      switch (n.channel) {
        case 'whatsapp':
          result = await this.whatsappService.send(n.phone!, message, n.mediaUrl);
          break;
        case 'push':
          result = await this.pushService.send(n.deviceToken!, title, body);
          break;
        case 'email':
          result = await this.emailService.send(n.email!, subject, htmlBody);
          break;
        case 'sms':
          result = await this.smsService.send(n.phone!, message);
          break;
        case 'multi':
          result = await this.sendMultiChannel({ ...n, message, title, body });
          break;
        default:
          throw new Error(`Unknown channel: ${String(n.channel)}`);
      }

      await this.historyService.markSent(notificationId, result);
      this.logger.log(`Notification ${notificationId} sent via ${n.channel}`);
      return { notificationId, status: 'sent', externalId: result.externalId };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      await this.historyService.markFailed(notificationId, errMessage);
      this.logger.error(`Notification ${notificationId} failed: ${errMessage}`);
      throw err;
    }
  }

  private async sendMultiChannel(
    n: SendNotificationDto & { message: string; title: string; body: string },
  ): Promise<ChannelResult> {
    // Attempt WhatsApp → Push → SMS in order
    if (n.phone) {
      try {
        return await this.whatsappService.send(n.phone, n.message, n.mediaUrl);
      } catch (err) {
        this.logger.warn(`WhatsApp failed, trying next channel: ${String(err)}`);
      }
    }

    if (n.deviceToken) {
      try {
        return await this.pushService.send(n.deviceToken, n.title, n.body);
      } catch (err) {
        this.logger.warn(`Push failed, trying SMS: ${String(err)}`);
      }
    }

    if (n.phone) {
      return await this.smsService.send(n.phone, n.message);
    }

    throw new Error('No se pudo enviar por ningún canal disponible');
  }

  private getPriority(type: string): number {
    return PRIORITIES[type] ?? 10;
  }

  private getRecipient(n: SendNotificationDto): string {
    if (n.phone) return n.phone;
    if (n.email) return n.email;
    if (n.deviceToken) return `${n.deviceToken.slice(0, 12)}...`;
    return 'unknown';
  }
}
