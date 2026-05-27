/**
 * Firebase Cloud Messaging (FCM) push notification service.
 * Uses Firebase Admin SDK to send push notifications to Flutter app.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { ChannelResult } from '../channel.types';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private messaging!: admin.messaging.Messaging;

  onModuleInit(): void {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
      }
      this.messaging = admin.messaging();
      this.logger.log('Firebase Admin SDK initialized');
    } else {
      this.logger.warn('Firebase credentials not configured — push notifications disabled');
    }
  }

  async send(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<ChannelResult> {
    if (!this.messaging) {
      this.logger.warn('Push skipped: Firebase not configured');
      return { externalId: '', status: 'failed' };
    }

    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      data: data ?? {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'guaycampo_alerts' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    const messageId = await this.messaging.send(message);
    this.logger.debug(`FCM sent to ${token.slice(0, 10)}...: ${messageId}`);
    return { externalId: messageId, status: 'sent' };
  }

  /**
   * Send to multiple device tokens (for tenant-wide broadcasts).
   * FCM supports up to 500 tokens per multicast request.
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging || tokens.length === 0) return;

    const chunks = this.chunkArray(tokens, 500);
    for (const chunk of chunks) {
      await this.messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
      });
    }
    this.logger.debug(`FCM multicast sent to ${tokens.length} devices`);
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    return Array.from(
      { length: Math.ceil(arr.length / size) },
      (_, i) => arr.slice(i * size, i * size + size),
    );
  }
}
