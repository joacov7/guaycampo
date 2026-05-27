import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { TruckShift } from '@guaycampo/database';
import { TruckShiftStatus } from '@guaycampo/shared-types';
import type { CreateTruckShiftDto } from './dto/create-truck-shift.dto';
import type { UpdateTruckShiftDto } from './dto/update-truck-shift.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class TrucksService {
  async findAll(
    tenantId: string,
    shiftId?: string,
    status?: string,
  ): Promise<TruckShift[]> {
    return prisma.truckShift.findMany({
      where: {
        tenantId,
        ...(shiftId ? { shiftId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        commodity: true,
        shift: true,
        queuePosition: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<TruckShift> {
    const truck = await prisma.truckShift.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        commodity: true,
        shift: true,
        queuePosition: true,
        scaleTickets: { include: { labSamples: true } },
      },
    });
    if (!truck) throw new NotFoundException(`TruckShift ${id} not found`);
    return truck;
  }

  async findByQrCode(qrCode: string, tenantId: string): Promise<TruckShift> {
    const truck = await prisma.truckShift.findFirst({
      where: { qrCode, tenantId },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        commodity: true,
        shift: true,
        queuePosition: true,
      },
    });
    if (!truck) throw new NotFoundException(`QR code not found`);
    return truck;
  }

  async create(
    dto: CreateTruckShiftDto,
    tenantId: string,
  ): Promise<TruckShift> {
    const shift = await prisma.shiftSchedule.findFirst({
      where: { id: dto.shiftId, tenantId },
    });
    if (!shift) throw new NotFoundException(`Shift ${dto.shiftId} not found`);

    if (shift.usedSlots >= shift.totalSlots) {
      throw new BadRequestException('No available slots in this shift');
    }
    if (shift.status !== 'open') {
      throw new BadRequestException(
        `Shift is not open (status: ${shift.status})`,
      );
    }

    const [vehicle, driver, client] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: dto.vehicleId, tenantId } }),
      prisma.driver.findFirst({ where: { id: dto.driverId, tenantId } }),
      prisma.client.findFirst({ where: { id: dto.clientId, tenantId } }),
    ]);

    if (!vehicle) throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    if (!driver) throw new NotFoundException(`Driver ${dto.driverId} not found`);
    if (!client) throw new NotFoundException(`Client ${dto.clientId} not found`);

    const qrCode = randomUUID();

    const [truckShift] = await prisma.$transaction([
      prisma.truckShift.create({
        data: {
          shiftId: dto.shiftId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          clientId: dto.clientId,
          commodityId: dto.commodityId,
          estimatedQty: dto.estimatedQty ? parseFloat(dto.estimatedQty) : undefined,
          cpeNumber: dto.cpeNumber,
          checkinAt: dto.checkinAt ? new Date(dto.checkinAt) : undefined,
          qrCode,
          status: TruckShiftStatus.PENDIENTE,
          tenantId,
        },
        include: {
          vehicle: true,
          driver: true,
          client: true,
          commodity: true,
          shift: true,
        },
      }),
      prisma.shiftSchedule.update({
        where: { id: dto.shiftId },
        data: { usedSlots: { increment: 1 } },
      }),
    ]);

    return truckShift;
  }

  async update(
    id: string,
    dto: UpdateTruckShiftDto,
    tenantId: string,
  ): Promise<TruckShift> {
    await this.findOne(id, tenantId);

    return prisma.truckShift.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.cpeNumber !== undefined ? { cpeNumber: dto.cpeNumber } : {}),
        ...(dto.checkinAt ? { checkinAt: new Date(dto.checkinAt) } : {}),
        ...(dto.checkoutAt ? { checkoutAt: new Date(dto.checkoutAt) } : {}),
        ...(dto.estimatedQty !== undefined
          ? { estimatedQty: parseFloat(dto.estimatedQty) }
          : {}),
      },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        commodity: true,
        shift: true,
        queuePosition: true,
      },
    });
  }
}
