// =============================================================================
// GuayCampo - Scale Devices Service
// =============================================================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { ScaleDevice } from '@guaycampo/database';
import { CreateScaleDeviceDto, UpdateScaleDeviceDto } from '../modbus/dto/scale-device.dto';

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

  // In-memory runtime status map — reset on service restart
  private readonly runtimeStatus = new Map<
    string,
    { online: boolean; currentWeightKg: number | null; lastReadAt: string | null; errorMessage: string | null }
  >();

  async create(dto: CreateScaleDeviceDto, tenantId: string): Promise<ScaleDevice> {
    const device = await prisma.scaleDevice.create({
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
    return device;
  }

  async findAll(tenantId: string): Promise<ScaleDevice[]> {
    return prisma.scaleDevice.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findActive(): Promise<ScaleDevice[]> {
    return prisma.scaleDevice.findMany({
      where: { isActive: true },
    });
  }

  async findOne(id: string): Promise<ScaleDevice> {
    const device = await prisma.scaleDevice.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Scale device ${id} not found`);
    }
    return device;
  }

  async update(id: string, dto: UpdateScaleDeviceDto, tenantId: string): Promise<ScaleDevice> {
    await this.findOneForTenant(id, tenantId);
    return prisma.scaleDevice.update({
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
  }

  async deactivate(id: string, tenantId: string): Promise<ScaleDevice> {
    await this.findOneForTenant(id, tenantId);
    const updated = await prisma.scaleDevice.update({
      where: { id },
      data: { isActive: false },
    });
    this.runtimeStatus.delete(id);
    return updated;
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
    const device = await prisma.scaleDevice.findFirst({ where: { id, tenantId } });
    if (!device) {
      throw new NotFoundException(`Scale device ${id} not found`);
    }
    return device;
  }
}
