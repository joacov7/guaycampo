import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { ShiftSchedule } from '@guaycampo/database';
import type { CreateShiftDto } from './dto/create-shift.dto';
import type { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  async findAll(tenantId: string, date?: string): Promise<ShiftSchedule[]> {
    return prisma.shiftSchedule.findMany({
      where: {
        tenantId,
        ...(date ? { date: new Date(date) } : {}),
      },
      include: {
        commodity: true,
        _count: { select: { truckShifts: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ShiftSchedule> {
    const shift = await prisma.shiftSchedule.findFirst({
      where: { id, tenantId },
      include: {
        commodity: true,
        truckShifts: {
          include: {
            vehicle: true,
            driver: true,
            client: true,
            queuePosition: true,
          },
        },
      },
    });
    if (!shift) throw new NotFoundException(`Shift ${id} not found`);
    return shift;
  }

  async create(
    dto: CreateShiftDto,
    tenantId: string,
  ): Promise<ShiftSchedule> {
    const commodity = await prisma.commodity.findFirst({
      where: { id: dto.commodityId, tenantId },
    });
    if (!commodity) {
      throw new NotFoundException(`Commodity ${dto.commodityId} not found`);
    }

    return prisma.shiftSchedule.create({
      data: {
        date: new Date(dto.date),
        commodityId: dto.commodityId,
        operationType: dto.operationType,
        totalSlots: dto.totalSlots,
        timeFrom: dto.timeFrom,
        timeTo: dto.timeTo,
        tenantId,
        status: 'open',
      },
      include: { commodity: true },
    });
  }

  async update(
    id: string,
    dto: UpdateShiftDto,
    tenantId: string,
  ): Promise<ShiftSchedule> {
    const existing = await this.findOne(id, tenantId);

    if (
      existing.status === 'completed' ||
      existing.status === 'cancelled'
    ) {
      throw new BadRequestException(
        `Cannot update a shift in status '${existing.status}'`,
      );
    }

    return prisma.shiftSchedule.update({
      where: { id },
      data: {
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.commodityId ? { commodityId: dto.commodityId } : {}),
        ...(dto.operationType ? { operationType: dto.operationType } : {}),
        ...(dto.totalSlots !== undefined ? { totalSlots: dto.totalSlots } : {}),
        ...(dto.timeFrom !== undefined ? { timeFrom: dto.timeFrom } : {}),
        ...(dto.timeTo !== undefined ? { timeTo: dto.timeTo } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: { commodity: true },
    });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const shift = await this.findOne(id, tenantId);
    if (shift.usedSlots > 0) {
      throw new BadRequestException(
        'Cannot delete a shift with registered trucks',
      );
    }
    await prisma.shiftSchedule.delete({ where: { id } });
  }
}
