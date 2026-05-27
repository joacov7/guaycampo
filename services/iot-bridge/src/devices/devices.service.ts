// =============================================================================
// GuayCampo IoT Bridge — Devices Service
// In-memory CRUD for IoT device configuration. In production this would
// persist to a database; for now a JSON file acts as persistent storage.
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

// ---------------------------------------------------------------------------
// IoT Device model
// ---------------------------------------------------------------------------

export type ConnectionType = 'tcp' | 'serial';
export type DeviceStatus = 'online' | 'offline' | 'error' | 'unknown';

export interface IoTDevice {
  id: string;
  name: string;
  type: string; // scale | temperature | humidity | level | co2 | plc | camera
  category: string; // silo | scale | plc | camera
  connectionType: ConnectionType;
  ipAddress?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  unitId?: number;
  registerAddress?: number;
  registerCount?: number;
  encoding?: string; // float32_be | float32_le | int16 | int32_be | bcd
  multiplier?: number;
  minChange?: number;
  tenantSlug: string;
  targetId: string; // siloId, scaleId, etc.
  sensorType: string; // temperature | humidity | level | weight | co2
  active: boolean;
  status: DeviceStatus;
  lastValue?: number;
  lastReadAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class DevicesService implements OnModuleInit {
  private readonly logger = new Logger(DevicesService.name);
  private devices = new Map<string, IoTDevice>();
  private readonly storagePath: string;

  constructor() {
    this.storagePath =
      process.env.DEVICES_CONFIG_PATH ?? path.join(process.cwd(), 'devices.json');
  }

  onModuleInit(): void {
    this.loadFromDisk();
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  findAll(): IoTDevice[] {
    return Array.from(this.devices.values());
  }

  findActive(): IoTDevice[] {
    return this.findAll().filter((d) => d.active);
  }

  findOne(id: string): IoTDevice {
    const device = this.devices.get(id);
    if (!device) throw new NotFoundException(`Device ${id} not found`);
    return device;
  }

  create(dto: CreateDeviceDto): IoTDevice {
    const now = new Date().toISOString();
    const device: IoTDevice = {
      id: crypto.randomUUID(),
      ...dto,
      active: dto.active ?? true,
      status: 'unknown',
      createdAt: now,
      updatedAt: now,
    };
    this.devices.set(device.id, device);
    this.saveToDisk();
    this.logger.log(`Device created: ${device.name} (${device.id})`);
    return device;
  }

  update(id: string, dto: UpdateDeviceDto): IoTDevice {
    const existing = this.findOne(id);
    const updated: IoTDevice = {
      ...existing,
      ...dto,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  remove(id: string): void {
    this.findOne(id); // throws if not found
    this.devices.delete(id);
    this.saveToDisk();
    this.logger.log(`Device removed: ${id}`);
  }

  // ---------------------------------------------------------------------------
  // Status helpers (called by ModbusBridgeService)
  // ---------------------------------------------------------------------------

  setStatus(id: string, status: DeviceStatus): void {
    const device = this.devices.get(id);
    if (!device) return;
    device.status = status;
    device.updatedAt = new Date().toISOString();
  }

  updateReading(id: string, value: number): void {
    const device = this.devices.get(id);
    if (!device) return;
    device.lastValue = value;
    device.lastReadAt = new Date().toISOString();
    device.status = 'online';
  }

  // ---------------------------------------------------------------------------
  // Persistence helpers
  // ---------------------------------------------------------------------------

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        this.logger.log('No devices.json found — starting with empty device registry');
        return;
      }
      const raw = fs.readFileSync(this.storagePath, 'utf-8');
      const list: IoTDevice[] = JSON.parse(raw);
      for (const d of list) {
        d.status = 'unknown'; // reset status on startup
        this.devices.set(d.id, d);
      }
      this.logger.log(`Loaded ${this.devices.size} devices from ${this.storagePath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load devices from disk: ${msg}`);
    }
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify(Array.from(this.devices.values()), null, 2),
        'utf-8',
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to persist devices to disk: ${msg}`);
    }
  }
}
