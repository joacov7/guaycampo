// =============================================================================
// GuayCampo IoT Bridge — Health Controller
// Exposes a rich /health endpoint showing the complete bridge status:
// local/cloud MQTT, Modbus devices, SQLite buffer, connectivity.
// =============================================================================

import { Controller, Get, Post, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MqttBridgeService } from '../mqtt/mqtt-bridge.service';
import { ConnectivityService } from '../connectivity/connectivity.service';
import { BufferService } from '../buffer/buffer.service';
import { DeviceRegistryService } from '../modbus/device-registry.service';
import { SyncService } from '../buffer/sync.service';

export interface BridgeHealth {
  status: 'ok' | 'degraded' | 'offline';
  timestamp: string;
  connectivity: {
    cloudOnline: boolean;
    localMqttConnected: boolean;
    cloudMqttConnected: boolean;
  };
  buffer: {
    total: number;
    pending: number;
    failed: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
    error: number;
    unknown: number;
  };
}

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly mqttBridge: MqttBridgeService,
    private readonly connectivity: ConnectivityService,
    private readonly buffer: BufferService,
    private readonly deviceRegistry: DeviceRegistryService,
    private readonly syncService: SyncService,
  ) {}

  // ---------------------------------------------------------------------------
  // GET /api/health
  // ---------------------------------------------------------------------------

  @Get('health')
  @ApiOperation({ summary: 'Complete bridge health status' })
  getHealth(): BridgeHealth {
    const bufferStats = this.buffer.getStats();
    const deviceSummary = this.deviceRegistry.getStatusSummary();
    const cloudOnline = this.connectivity.isOnline();
    const localMqtt = this.mqttBridge.isLocalConnected();
    const cloudMqtt = this.mqttBridge.isCloudConnected();

    const allDevices =
      deviceSummary.online +
      deviceSummary.offline +
      deviceSummary.error +
      deviceSummary.unknown;

    let status: BridgeHealth['status'] = 'ok';
    if (!cloudOnline || !localMqtt) {
      status = bufferStats.pending > 0 ? 'degraded' : 'offline';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      connectivity: {
        cloudOnline,
        localMqttConnected: localMqtt,
        cloudMqttConnected: cloudMqtt,
      },
      buffer: bufferStats,
      devices: {
        total: allDevices,
        online: deviceSummary.online,
        offline: deviceSummary.offline,
        error: deviceSummary.error,
        unknown: deviceSummary.unknown,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Buffer management endpoints
  // ---------------------------------------------------------------------------

  @Get('buffer/stats')
  @ApiOperation({ summary: 'Buffer statistics — pending messages to sync' })
  getBufferStats() {
    return this.buffer.getStats();
  }

  @Post('buffer/sync')
  @ApiOperation({ summary: 'Force manual synchronisation of buffered messages' })
  async forceSync() {
    const cloudClient = this.mqttBridge.getCloudClient();
    if (!cloudClient?.connected) {
      return { success: false, message: 'Cloud MQTT not connected' };
    }
    const result = await this.syncService.drainBuffer(cloudClient);
    return { success: true, ...result };
  }

  @Delete('buffer/synced')
  @ApiOperation({ summary: 'Delete already-synced messages from the buffer' })
  deleteSynced() {
    const deleted = this.buffer.deleteSynced();
    return { deleted };
  }
}
