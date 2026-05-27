// =============================================================================
// GuayCampo IoT Bridge — Buffer Service
// SQLite-backed offline buffer for MQTT messages.
// Uses better-sqlite3 (synchronous) so there are no concurrency issues.
// =============================================================================

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import BetterSqlite3 from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BufferMessage {
  id?: number;
  topic: string;
  payload: string;
  timestamp: Date | string;
  synced?: number;
  retry_count?: number;
  created_at?: string;
}

export interface BufferStats {
  total: number;
  pending: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class BufferService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BufferService.name);
  private db!: BetterSqlite3.Database;

  onModuleInit(): void {
    const dbPath = process.env.BUFFER_DB_PATH ?? './buffer.db';
    this.db = new BetterSqlite3(dbPath);

    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mqtt_buffer (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        topic       TEXT    NOT NULL,
        payload     TEXT    NOT NULL,
        timestamp   TEXT    NOT NULL,
        synced      INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        created_at  TEXT    DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_mqtt_buffer_synced
        ON mqtt_buffer (synced);
      CREATE INDEX IF NOT EXISTS idx_mqtt_buffer_retry
        ON mqtt_buffer (retry_count);
    `);

    const stats = this.getStats();
    this.logger.log(
      `Buffer DB ready at ${dbPath} — ${stats.pending} pending, ${stats.failed} failed`,
    );
  }

  onModuleDestroy(): void {
    try {
      this.db?.close();
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  store(message: Pick<BufferMessage, 'topic' | 'payload' | 'timestamp'>): void {
    const ts =
      message.timestamp instanceof Date
        ? message.timestamp.toISOString()
        : message.timestamp;

    this.db
      .prepare(
        `INSERT INTO mqtt_buffer (topic, payload, timestamp)
         VALUES (?, ?, ?)`,
      )
      .run(message.topic, message.payload, ts);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  getPending(limit = 100): BufferMessage[] {
    return this.db
      .prepare(
        `SELECT * FROM mqtt_buffer
         WHERE synced = 0 AND retry_count < 5
         ORDER BY created_at ASC
         LIMIT ?`,
      )
      .all(limit) as BufferMessage[];
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  markSynced(id: number): void {
    this.db.prepare('UPDATE mqtt_buffer SET synced = 1 WHERE id = ?').run(id);
  }

  incrementRetry(id: number): void {
    this.db
      .prepare('UPDATE mqtt_buffer SET retry_count = retry_count + 1 WHERE id = ?')
      .run(id);
  }

  // ---------------------------------------------------------------------------
  // Housekeeping
  // ---------------------------------------------------------------------------

  deleteSynced(): number {
    const result = this.db
      .prepare('DELETE FROM mqtt_buffer WHERE synced = 1')
      .run();
    return result.changes;
  }

  getStats(): BufferStats {
    const total = (
      this.db.prepare('SELECT COUNT(*) as count FROM mqtt_buffer').get() as {
        count: number;
      }
    ).count;

    const pending = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM mqtt_buffer WHERE synced = 0')
        .get() as { count: number }
    ).count;

    const failed = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM mqtt_buffer WHERE retry_count >= 5')
        .get() as { count: number }
    ).count;

    return { total, pending, failed };
  }
}
