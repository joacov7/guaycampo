/**
 * In-memory notification history store.
 * In production, replace with a database (PostgreSQL via Prisma).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ChannelResult } from '../channels/channel.types';

export type NotificationStatus = 'queued' | 'sent' | 'failed';
export type NotificationChannel = 'whatsapp' | 'push' | 'email' | 'sms' | 'multi';

export interface NotificationRecord {
  id: string;
  tenantId: string;
  type: string;
  channel: NotificationChannel;
  recipient: string; // phone, email, or deviceToken (truncated)
  templateId?: string;
  message?: string;
  status: NotificationStatus;
  externalId?: string;
  errorMessage?: string;
  createdAt: Date;
  sentAt?: Date;
  failedAt?: Date;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  byChannel: Record<string, number>;
}

export interface HistoryFilter {
  tenantId?: string;
  type?: string;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);
  // In-memory store; swap for DB in production
  private readonly records = new Map<string, NotificationRecord>();

  create(
    data: Omit<NotificationRecord, 'id' | 'createdAt'>,
    existingId?: string,
  ): NotificationRecord {
    const record: NotificationRecord = {
      ...data,
      id: existingId ?? crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async markSent(notificationId: string, result: ChannelResult): Promise<void> {
    const record = this.records.get(notificationId);
    if (!record) {
      this.logger.warn(`History record not found for notification ${notificationId}`);
      return;
    }
    record.status = 'sent';
    record.externalId = result.externalId;
    record.sentAt = new Date();
  }

  async markFailed(notificationId: string, errorMessage: string): Promise<void> {
    const record = this.records.get(notificationId);
    if (!record) {
      this.logger.warn(`History record not found for notification ${notificationId}`);
      return;
    }
    record.status = 'failed';
    record.errorMessage = errorMessage;
    record.failedAt = new Date();
  }

  findById(id: string): NotificationRecord {
    const record = this.records.get(id);
    if (!record) throw new NotFoundException(`Notification ${id} not found`);
    return record;
  }

  findAll(filter: HistoryFilter): { data: NotificationRecord[]; total: number } {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    let results = Array.from(this.records.values());

    if (filter.tenantId) results = results.filter((r) => r.tenantId === filter.tenantId);
    if (filter.type) results = results.filter((r) => r.type === filter.type);
    if (filter.channel) results = results.filter((r) => r.channel === filter.channel);
    if (filter.status) results = results.filter((r) => r.status === filter.status);
    if (filter.dateFrom) results = results.filter((r) => r.createdAt >= filter.dateFrom!);
    if (filter.dateTo) results = results.filter((r) => r.createdAt <= filter.dateTo!);

    // Sort by most recent first
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const data = results.slice((page - 1) * limit, page * limit);

    return { data, total };
  }

  getStats(tenantId?: string): NotificationStats {
    let records = Array.from(this.records.values());
    if (tenantId) records = records.filter((r) => r.tenantId === tenantId);

    const byChannel: Record<string, number> = {};
    for (const record of records) {
      byChannel[record.channel] = (byChannel[record.channel] ?? 0) + 1;
    }

    return {
      total: records.length,
      sent: records.filter((r) => r.status === 'sent').length,
      failed: records.filter((r) => r.status === 'failed').length,
      queued: records.filter((r) => r.status === 'queued').length,
      byChannel,
    };
  }
}
