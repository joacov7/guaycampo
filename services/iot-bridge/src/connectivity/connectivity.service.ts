// =============================================================================
// GuayCampo IoT Bridge — Connectivity Service
// Periodically pings the cloud API to determine online/offline state.
// Emits 'connectivity.restored' and 'connectivity.lost' application events
// that other services listen to (e.g. MqttBridgeService triggers a buffer
// drain when connectivity is restored).
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';

@Injectable()
export class ConnectivityService {
  private readonly logger = new Logger(ConnectivityService.name);
  private online = false;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ---------------------------------------------------------------------------
  // Periodic connectivity check (every 30 seconds)
  // ---------------------------------------------------------------------------

  @Cron('*/30 * * * * *')
  async checkConnectivity(): Promise<void> {
    const apiUrl = process.env.CLOUD_API_URL;
    if (!apiUrl) {
      // No cloud URL configured — assume offline mode permanently
      return;
    }

    try {
      await axios.get(`${apiUrl}/health`, {
        timeout: 5_000,
        validateStatus: (status) => status < 500,
      });

      if (!this.online) {
        this.online = true;
        this.logger.log('Cloud connection restored');
        this.eventEmitter.emit('connectivity.restored');
      }
    } catch {
      if (this.online) {
        this.online = false;
        this.logger.warn(
          'Lost connection to cloud — switching to offline mode',
        );
        this.eventEmitter.emit('connectivity.lost');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  isOnline(): boolean {
    return this.online;
  }

  /** Force-set online state (useful in tests or manual override) */
  forceOnline(value: boolean): void {
    const prev = this.online;
    this.online = value;

    if (value && !prev) {
      this.eventEmitter.emit('connectivity.restored');
    } else if (!value && prev) {
      this.eventEmitter.emit('connectivity.lost');
    }
  }
}
