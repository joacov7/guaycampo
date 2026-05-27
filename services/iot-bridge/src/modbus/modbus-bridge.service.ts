// =============================================================================
// GuayCampo IoT Bridge — Modbus Bridge Service
// Polls multiple Modbus devices (TCP or serial) in parallel, publishes
// readings to the local MQTT broker, and buffers them offline when needed.
// =============================================================================

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  forwardRef,
  Inject,
} from '@nestjs/common';
import ModbusRTU from 'modbus-serial';
import { DeviceRegistryService } from './device-registry.service';
import { BufferService } from '../buffer/buffer.service';
import { ConnectivityService } from '../connectivity/connectivity.service';
import type { IoTDevice } from '../devices/devices.service';

// Forward reference to MqttBridgeService to avoid circular dependency
// (MqttBridge → Buffer; ModbusBridge → MqttBridge)
import type { MqttBridgeService } from '../mqtt/mqtt-bridge.service';

@Injectable()
export class ModbusBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModbusBridgeService.name);

  private readonly clients = new Map<string, ModbusRTU>();
  private readonly pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private readonly lastValues = new Map<string, number>();

  // Injected lazily to avoid circular-dep bootstrap issues
  private mqttBridge: MqttBridgeService | null = null;

  constructor(
    private readonly deviceRegistry: DeviceRegistryService,
    private readonly bufferService: BufferService,
    private readonly connectivityService: ConnectivityService,
  ) {}

  // Called by MqttBridgeModule after both modules are set up
  setMqttBridge(bridge: MqttBridgeService): void {
    this.mqttBridge = bridge;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async onModuleInit(): Promise<void> {
    this.logger.log('ModbusBridgeService initializing — loading active devices…');
    const devices = this.deviceRegistry.getActiveDevices();
    for (const device of devices) {
      await this.connectDevice(device).catch((err: Error) =>
        this.logger.warn(`Initial connect failed for ${device.name}: ${err.message}`),
      );
    }
    this.logger.log(
      `Connected to ${this.clients.size}/${devices.length} Modbus devices`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    for (const interval of this.pollingIntervals.values()) clearInterval(interval);
    for (const [id, client] of this.clients) {
      try {
        client.close(() => void 0);
      } catch {
        this.logger.debug(`Could not close client ${id}`);
      }
    }
    this.clients.clear();
    this.pollingIntervals.clear();
  }

  // ---------------------------------------------------------------------------
  // Connection management
  // ---------------------------------------------------------------------------

  async connectDevice(device: IoTDevice): Promise<void> {
    if (this.clients.has(device.id)) return;

    const client = new ModbusRTU();
    client.setTimeout(3000);

    try {
      if (device.connectionType === 'tcp') {
        await client.connectTCP(device.ipAddress!, { port: device.port! });
      } else if (device.connectionType === 'serial') {
        await client.connectRTUBuffered(device.serialPort!, {
          baudRate: device.baudRate ?? 9600,
        });
      } else {
        throw new Error(`Unknown connection type: ${device.connectionType}`);
      }

      client.setID(device.unitId ?? 1);
      this.clients.set(device.id, client);
      this.deviceRegistry.setStatus(device.id, 'online');
      this.startPolling(device);
      this.logger.log(
        `Connected: ${device.name} (${device.type}) via ${device.connectionType}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to connect ${device.name}: ${msg}`);
      this.deviceRegistry.setStatus(device.id, 'offline');
      // Retry in 30 s
      setTimeout(() => {
        void this.connectDevice(device);
      }, 30_000);
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const interval = this.pollingIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(deviceId);
    }
    const client = this.clients.get(deviceId);
    if (client) {
      client.close(() => void 0);
      this.clients.delete(deviceId);
    }
    this.deviceRegistry.setStatus(deviceId, 'offline');
  }

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  startPolling(device: IoTDevice): void {
    if (this.pollingIntervals.has(device.id)) return;

    const interval = this.getPollingInterval(device.type);
    const timer = setInterval(() => {
      void this.pollDevice(device);
    }, interval);

    this.pollingIntervals.set(device.id, timer);
    this.logger.log(
      `Polling started for ${device.name} every ${interval}ms`,
    );
  }

  stopPolling(deviceId: string): void {
    const timer = this.pollingIntervals.get(deviceId);
    if (timer) {
      clearInterval(timer);
      this.pollingIntervals.delete(deviceId);
    }
  }

  private async pollDevice(device: IoTDevice): Promise<void> {
    try {
      const value = await this.readDevice(device);

      // Dead-band filter — skip if value hasn't changed meaningfully
      const lastValue = this.lastValues.get(device.id);
      if (
        lastValue !== undefined &&
        Math.abs(value - lastValue) < (device.minChange ?? 0.1)
      ) {
        return;
      }

      this.lastValues.set(device.id, value);
      this.deviceRegistry.updateReading(device.id, value);

      const topic = `guaycampo/${device.tenantSlug}/${device.category}/${device.targetId}/${device.sensorType}`;
      const payload = value.toString();

      // Publish to local MQTT broker (always)
      if (this.mqttBridge) {
        await this.mqttBridge.publishLocal(topic, payload);
      }

      // If offline, also persist to SQLite buffer
      if (!this.connectivityService.isOnline()) {
        this.bufferService.store({ topic, payload, timestamp: new Date() });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Read error on ${device.name}: ${msg}`);
      this.deviceRegistry.setStatus(device.id, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Reading helpers
  // ---------------------------------------------------------------------------

  async readDevice(device: IoTDevice): Promise<number> {
    const client = this.clients.get(device.id);
    if (!client) {
      throw new Error(`Device ${device.id} not connected`);
    }

    const registers = await client.readHoldingRegisters(
      device.registerAddress ?? 0,
      device.registerCount ?? 2,
    );

    return this.decodeValue(
      registers.data,
      device.encoding ?? 'float32_be',
      device.multiplier ?? 1,
    );
  }

  /** One-shot read (used by the test endpoint) */
  async testRead(deviceId: string): Promise<number> {
    const device = this.deviceRegistry.getDevice(deviceId);
    return this.readDevice(device);
  }

  // ---------------------------------------------------------------------------
  // Value decoding
  // ---------------------------------------------------------------------------

  private decodeValue(
    data: number[],
    encoding: string,
    multiplier: number,
  ): number {
    let raw: number;

    switch (encoding) {
      case 'float32_be': {
        const buf = Buffer.allocUnsafe(4);
        buf.writeUInt16BE(data[0] ?? 0, 0);
        buf.writeUInt16BE(data[1] ?? 0, 2);
        raw = buf.readFloatBE(0);
        break;
      }
      case 'float32_le': {
        const buf = Buffer.allocUnsafe(4);
        buf.writeUInt16LE(data[0] ?? 0, 0);
        buf.writeUInt16LE(data[1] ?? 0, 2);
        raw = buf.readFloatLE(0);
        break;
      }
      case 'int16':
        raw = data[0] ?? 0;
        break;
      case 'int32_be':
        raw = ((data[0] ?? 0) << 16) | (data[1] ?? 0);
        break;
      case 'bcd': {
        // BCD used by older Toledo/Mettler scales
        const hi =
          (((data[0] ?? 0) >> 8) & 0xf) * 1000 +
          ((data[0] ?? 0) & 0xf) * 100;
        const lo =
          (((data[1] ?? 0) >> 8) & 0xf) * 10 +
          ((data[1] ?? 0) & 0xf);
        raw = hi + lo;
        break;
      }
      default:
        raw = data[0] ?? 0;
    }

    return parseFloat((raw * multiplier).toFixed(3));
  }

  // ---------------------------------------------------------------------------
  // Polling interval by device type
  // ---------------------------------------------------------------------------

  private getPollingInterval(deviceType: string): number {
    const intervals: Record<string, number> = {
      scale: 300,         // weight scale: 300 ms (near real-time)
      temperature: 30_000, // silo temperature: 30 s
      humidity: 60_000,   // humidity: 1 min
      level: 120_000,     // silo level: 2 min
      co2: 60_000,        // CO2: 1 min
      plc: 1_000,         // generic PLC: 1 s
    };
    return intervals[deviceType] ?? 10_000;
  }

  // ---------------------------------------------------------------------------
  // Status helpers
  // ---------------------------------------------------------------------------

  isConnected(deviceId: string): boolean {
    return this.clients.has(deviceId);
  }

  isPolling(deviceId: string): boolean {
    return this.pollingIntervals.has(deviceId);
  }
}
