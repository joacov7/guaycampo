// =============================================================================
// GuayCampo - Modbus Service
// Manages Modbus TCP connections to physical scale devices.
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
  forwardRef,
  Inject,
} from '@nestjs/common';
import ModbusRTU from 'modbus-serial';
import { DevicesService } from '../devices/devices.service';
import type { ScaleDevice } from '../devices/devices.service';
import { ScaleGateway } from '../websocket/scale.gateway';
import { ToledoAdapter } from './adapters/toledo.adapter';
import { MettlerAdapter } from './adapters/mettler.adapter';
import { GenericAdapter } from './adapters/generic.adapter';
import type { ScaleAdapter } from './adapters/scale-adapter.interface';

// Stability detection: max spread (kg) over last N readings considered "stable"
const STABILITY_WINDOW = 5;
const STABILITY_THRESHOLD_KG = 2.0;
const POLL_INTERVAL_MS = 300;

@Injectable()
export class ModbusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModbusService.name);

  private readonly clients = new Map<string, ModbusRTU>();
  private readonly pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private readonly weightBuffers = new Map<string, number[]>();

  constructor(
    @Inject(forwardRef(() => DevicesService))
    private readonly devicesService: DevicesService,
    private readonly scaleGateway: ScaleGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('ModbusService initializing — loading active devices…');
    const devices = await this.devicesService.findActive();
    for (const device of devices) {
      await this.connectDevice(device).catch((err: Error) =>
        this.logger.warn(`Failed to connect ${device.name}: ${err.message}`),
      );
    }
    this.logger.log(`Connected to ${this.clients.size}/${devices.length} devices`);
  }

  async onModuleDestroy(): Promise<void> {
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
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

  async connectDevice(device: ScaleDevice): Promise<void> {
    if (this.clients.has(device.id)) {
      this.logger.debug(`Device ${device.id} already connected`);
      return;
    }

    const client = new ModbusRTU();
    await client.connectTCP(device.ipAddress, { port: device.port });
    client.setID(device.unitId ?? 1);
    client.setTimeout(3000);

    this.clients.set(device.id, client);
    this.devicesService.setOnline(device.id);
    this.logger.log(`Connected to ${device.name} @ ${device.ipAddress}:${device.port}`);
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) return;

    await this.stopWeighing(deviceId);
    client.close(() => void 0);
    this.clients.delete(deviceId);
    this.devicesService.setOffline(deviceId, 'Manually disconnected');
  }

  // ---------------------------------------------------------------------------
  // Polling (active weighing session)
  // ---------------------------------------------------------------------------

  async startWeighing(deviceId: string): Promise<void> {
    if (this.pollingIntervals.has(deviceId)) {
      this.logger.debug(`Polling already running for ${deviceId}`);
      return;
    }

    this.weightBuffers.set(deviceId, []);

    const interval = setInterval(() => {
      void this.pollDevice(deviceId);
    }, POLL_INTERVAL_MS);

    this.pollingIntervals.set(deviceId, interval);
    this.logger.log(`Started polling for device ${deviceId} (${POLL_INTERVAL_MS}ms interval)`);
  }

  async stopWeighing(deviceId: string): Promise<void> {
    const interval = this.pollingIntervals.get(deviceId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(deviceId);
    }
    this.weightBuffers.delete(deviceId);
    this.logger.log(`Stopped polling for device ${deviceId}`);
  }

  // ---------------------------------------------------------------------------
  // Weight reading
  // ---------------------------------------------------------------------------

  async readWeight(deviceId: string): Promise<number> {
    const client = this.clients.get(deviceId);
    if (!client) {
      throw new NotFoundException(`Device ${deviceId} not connected`);
    }
    const device = await this.devicesService.findOne(deviceId);
    return this.getAdapter(device.protocol).readWeight(
      client as unknown as import('./adapters/scale-adapter.interface').ModbusClient,
      device.config,
    );
  }

  async tareDevice(deviceId: string): Promise<void> {
    const client = this.clients.get(deviceId);
    if (!client) throw new NotFoundException(`Device ${deviceId} not connected`);
    const device = await this.devicesService.findOne(deviceId);
    await this.getAdapter(device.protocol).tare(
      client as unknown as import('./adapters/scale-adapter.interface').ModbusClient,
      device.config,
    );
  }

  // ---------------------------------------------------------------------------
  // Connection test
  // ---------------------------------------------------------------------------

  async testConnection(
    device: ScaleDevice,
  ): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    const testClient = new ModbusRTU();
    try {
      await testClient.connectTCP(device.ipAddress, { port: device.port });
      testClient.setID(device.unitId ?? 1);
      testClient.setTimeout(3000);
      const adapter = this.getAdapter(device.protocol);
      await adapter.readWeight(
        testClient as unknown as import('./adapters/scale-adapter.interface').ModbusClient,
        device.config,
      );
      const latencyMs = Date.now() - start;
      return { success: true, latencyMs };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error };
    } finally {
      try {
        testClient.close(() => void 0);
      } catch {
        // ignore
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async pollDevice(deviceId: string): Promise<void> {
    try {
      const weight = await this.readWeight(deviceId);
      this.devicesService.updateWeight(deviceId, weight);
      this.scaleGateway.broadcastWeight(deviceId, weight);
      this.checkStability(deviceId, weight);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Read error on device ${deviceId}: ${msg}`);
      this.devicesService.setOffline(deviceId, msg);
      this.scaleGateway.broadcastError(deviceId, 'read_error', msg);
    }
  }

  private checkStability(deviceId: string, weight: number): void {
    const buffer = this.weightBuffers.get(deviceId) ?? [];
    buffer.push(weight);
    if (buffer.length > STABILITY_WINDOW) {
      buffer.shift();
    }
    this.weightBuffers.set(deviceId, buffer);

    if (buffer.length < STABILITY_WINDOW) return;

    const max = Math.max(...buffer);
    const min = Math.min(...buffer);
    if (max - min < STABILITY_THRESHOLD_KG) {
      const stable = buffer[buffer.length - 1] ?? weight;
      this.scaleGateway.broadcastWeightStable(deviceId, stable);
      this.logger.debug(`Weight stable for device ${deviceId}: ${stable} kg`);
    }
  }

  private getAdapter(protocol: string): ScaleAdapter {
    switch (protocol) {
      case 'toledo':
        return new ToledoAdapter();
      case 'mettler':
        return new MettlerAdapter();
      default:
        return new GenericAdapter();
    }
  }

  isConnected(deviceId: string): boolean {
    return this.clients.has(deviceId);
  }

  isPolling(deviceId: string): boolean {
    return this.pollingIntervals.has(deviceId);
  }
}
