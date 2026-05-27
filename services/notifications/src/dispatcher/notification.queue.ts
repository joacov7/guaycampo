/**
 * BullMQ queue configuration for async notification processing.
 * Uses Redis as the queue backend.
 */
import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export interface NotificationJobData {
  notificationId: string;
  tenantId: string;
  type: string;
  channel: string;
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

function parseRedisUrl(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.slice(1) || '0', 10) : 0,
  };
}

export function createNotificationQueue(redisUrl: string): Queue<NotificationJobData> {
  const connection = parseRedisUrl(redisUrl);
  return new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
}

export function createNotificationWorker(
  redisUrl: string,
  processor: (job: Job<NotificationJobData>) => Promise<void>,
): Worker<NotificationJobData> {
  const connection = parseRedisUrl(redisUrl);
  return new Worker<NotificationJobData>(NOTIFICATION_QUEUE_NAME, processor, {
    connection,
    concurrency: 10,
  });
}
