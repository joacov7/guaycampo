// =============================================================================
// GuayCampo IoT Bridge — Sync Service
// Drains the SQLite buffer when cloud connectivity is restored, replaying
// stored MQTT messages in chronological order with QoS-1 delivery.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { BufferService } from './buffer.service';

export interface SyncResult {
  synced: number;
  failed: number;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private draining = false;

  constructor(private readonly bufferService: BufferService) {}

  /**
   * Replay all pending buffered messages through the given cloud MQTT client.
   * Safe to call multiple times — concurrent drains are suppressed.
   */
  async drainBuffer(cloudClient: MqttClient): Promise<SyncResult> {
    if (this.draining) {
      this.logger.debug('Buffer drain already in progress — skipping');
      return { synced: 0, failed: 0 };
    }

    this.draining = true;
    let synced = 0;
    let failed = 0;

    try {
      const pending = this.bufferService.getPending(500);
      if (pending.length === 0) {
        this.logger.debug('Buffer is empty — nothing to sync');
        return { synced: 0, failed: 0 };
      }

      this.logger.log(`Syncing ${pending.length} buffered messages to cloud…`);

      for (const msg of pending) {
        try {
          await this.publishWithTimeout(cloudClient, msg.topic, msg.payload);
          this.bufferService.markSynced(msg.id!);
          synced++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to sync message ${msg.id} (${msg.topic}): ${errMsg}`,
          );
          this.bufferService.incrementRetry(msg.id!);
          failed++;

          // Abort the drain if the cloud client disconnects mid-flight
          if (!cloudClient.connected) {
            this.logger.warn('Cloud disconnected during drain — aborting');
            break;
          }
        }
      }

      this.logger.log(
        `Sync complete: ${synced} sent, ${failed} failed`,
      );
    } finally {
      this.draining = false;
    }

    return { synced, failed };
  }

  private publishWithTimeout(
    client: MqttClient,
    topic: string,
    payload: string,
    timeoutMs = 5_000,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Publish timeout on ${topic}`)),
        timeoutMs,
      );

      client.publish(topic, payload, { qos: 1 }, (err) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
