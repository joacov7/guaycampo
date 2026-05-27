// =============================================================================
// GuayCampo - Scale Devices Service
// =============================================================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '@guaycampo/database';
import { CreateScaleDeviceDto, UpdateScaleDeviceDto } from '../modbus/dto/scale-device.dto';

export interface ScaleDevice {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  unitId: number;
  protocol: string;
  config: Record<string, unknown>;
  location: string | null;
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Runtime status enriched with connection state (not persisted to DB)
export interface ScaleDeviceStatus extends ScaleDevice {
  online: boolean;
  currentWeightKg: number | null;
  lastReadAt: string | null;
  errorMessage: string | null;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  // In-memory runtime status map — reset on restart
  private readonly runtimeStatus = new Map<
    string,
    { online: boolean; currentWeightKg: number | null; lastReadAt: string | null; errorMessage: string | null }
  >();

  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateScaleDeviceDto, tenantId: string): Promise<ScaleDevice> {
    const device = await this.db.scaleDevice.create({
      data: {
        name: dto.name,
        ipAddress: dto.ipAddress,
        port: dto.port,
        unitId: dto.unitId ?? 1,
        protocol: dto.protocol,
        config: (dto.config as object) ?? {},
        location: dto.location ?? null,
        isActive: true,
        tenantId,
      },
    });
    this.logger.log(`Created device ${device.id} (${device.name}) for tenant ${tenantId}`);
    return device as ScaleDevice;
  }

  async findAll(tenantId: string): Promise<ScaleDevice[]> {
    const devices = await this.db.scaleDevice.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return devices as ScaleDevice[];
  }

  async findActive(): Promise<ScaleDevice[]> {
    const devices = await this.db.scaleDevice.findMany({
      where: { isActive: true },
    });
    return devices as ScaleDevice[];
  }

  async findOne(id: string): Promise<ScaleDevice> {
    const device = await this.db.scaleDevice.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Scale device ${id} not found`);
    }
    return device as ScaleDevice;
  }

  async update(id: string, dto: UpdateScaleDeviceDto, tenantId: string): Promise<ScaleDevice> {
    await this.findOneForTenant(id, tenantId);
    const updated = await this.db.scaleDevice.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.ipAddress !== undefined && { ipAddress: dto.ipAddress }),
        ...(dto.port !== undefined && { port: dto.port }),
        ...(dto.unitId !== undefined && { unitId: dto.unitId }),
        ...(dto.protocol !== undefined && { protocol: dto.protocol }),
        ...(dto.config !== undefined && { config: dto.config as object }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return updated as ScaleDevice;
  }

  async deactivate(id: string, tenantId: string): Promise<ScaleDevice> {
    await this.findOneForTenant(id, tenantId);
    const updated = await this.db.scaleDevice.update({
      where: { id },
      data: { isActive: false },
    });
    this.runtimeStatus.delete(id);
    return updated as ScaleDevice;
  }

  // -------------------------------------------------------------------------
  // Runtime status helpers (used by ModbusService)
  // -------------------------------------------------------------------------

  setOnline(deviceId: string): void {
    const existing = this.runtimeStatus.get(deviceId) ?? {
      online: false,
      currentWeightKg: null,
      lastReadAt: null,
      errorMessage: null,
    };
    this.runtimeStatus.set(deviceId, { ...existing, online: true, errorMessage: null });
  }

  setOffline(deviceId: string, errorMessage: string): void {
    const existing = this.runtimeStatus.get(deviceId) ?? {
      online: false,
      currentWeightKg: null,
      lastReadAt: null,
      errorMessage: null,
    };
    this.runtimeStatus.set(deviceId, { ...existing, online: false, errorMessage });
  }

  updateWeight(deviceId: string, weightKg: number): void {
    const existing = this.runtimeStatus.get(deviceId) ?? {
      online: true,
      currentWeightKg: null,
      lastReadAt: null,
      errorMessage: null,
    };
    this.runtimeStatus.set(deviceId, {
      ...existing,
      currentWeightKg: weightKg,
      lastReadAt: new Date().toISOString(),
    });
  }

  getStatus(deviceId: string): ScaleDeviceStatus | null {
    const status = this.runtimeStatus.get(deviceId);
    return status ? ({ id: deviceId, ...status } as unknown as ScaleDeviceStatus) : null;
  }

  async getStatusFull(id: string, tenantId: string): Promise<ScaleDeviceStatus> {
    const device = await this.findOneForTenant(id, tenantId);
    const runtime = this.runtimeStatus.get(id) ?? {
      online: false,
      currentWeightKg: null,
      lastReadAt: null,
      errorMessage: null,
    };
    return { ...device, ...runtime };
  }

  private async findOneForTenant(id: string, tenantId: string): Promise<ScaleDevice> {
    const device = await this.db.scaleDevice.findFirst({ where: { id, tenantId } });
    if (!device) {
      throw new NotFoundException(`Scale device ${id} not found`);
    }
    return device as ScaleDevice;
  }
}
