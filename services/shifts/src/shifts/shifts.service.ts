import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@guaycampo/database';
import type { ShiftSchedule } from '@guaycampo/database';
import { createEvent } from '@guaycampo/shared-events';
import type { ShiftCreatedEvent } from '@guaycampo/shared-events';
import type { CreateShiftDto } from './dto/create-shift.dto';
import type { UpdateShiftDto } from './dto/update-shift.dto';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';

const SHIFT_SLOTS_PREFIX = 'shift:slots:';
const SHIFT_CACHE_TTL = 3600; // 1 hour

export interface ShiftFilters {
  date?: string;
  commodityId?: string;
  status?: string;
  operationType?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedShifts {
  data: ShiftSchedule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async findAll(tenantId: string, filters: ShiftFilters = {}): Promise<PaginatedShifts> {
    const { date, commodityId, status, operationType, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = { tenantId };
    if (date) where.date = new Date(date);
    if (commodityId) where.commodityId = commodityId;
    if (status) where.status = status;
    if (operationType) where.operationType = operationType;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.shiftSchedule.findMany({
        where,
        include: {
          commodity: true,
          _count: { select: { truckShifts: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shiftSchedule.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<ShiftSchedule & { availableSlots: number }> {
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

    const cachedSlots = await this.redis.get(`${SHIFT_SLOTS_PREFIX}${id}`);
    const availableSlots =
      cachedSlots !== null
        ? parseInt(cachedSlots, 10)
        : shift.totalSlots - shift.usedSlots;

    return { ...shift, availableSlots };
  }

  async create(dto: CreateShiftDto, tenantId: string): Promise<ShiftSchedule> {
    const commodity = await prisma.commodity.findFirst({
      where: { id: dto.commodityId, tenantId },
    });
    if (!commodity) {
      throw new NotFoundException(`Commodity ${dto.commodityId} not found`);
    }

    // Check for duplicate: same date + commodity + operationType
    const existing = await prisma.shiftSchedule.findFirst({
      where: {
        tenantId,
        date: new Date(dto.date),
        commodityId: dto.commodityId,
        operationType: dto.operationType,
      },
    });
    if (existing) {
      throw new ConflictException(
        `A shift already exists for date ${dto.date}, commodity ${commodity.name}, operation ${dto.operationType}`,
      );
    }

    const shift = await prisma.shiftSchedule.create({
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

    // Initialize Redis slot counter
    await this.redis.set(
      `${SHIFT_SLOTS_PREFIX}${shift.id}`,
      dto.totalSlots,
      'EX',
      SHIFT_CACHE_TTL,
    );

    // Emit event
    const event = createEvent<ShiftCreatedEvent>(
      'shifts.schedule.created',
      tenantId,
      {
        shiftId: shift.id,
        date: dto.date,
        commodityId: commodity.id,
        commodityName: commodity.name,
        operationType: dto.operationType,
        totalSlots: dto.totalSlots,
        timeFrom: dto.timeFrom,
        timeTo: dto.timeTo,
      },
    );
    this.eventEmitter.emit('shifts.schedule.created', event);

    return shift;
  }

  async update(id: string, dto: UpdateShiftDto, tenantId: string): Promise<ShiftSchedule> {
    const existing = await this.findOne(id, tenantId);

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot update a shift in status '${existing.status}'`,
      );
    }

    const shift = await prisma.shiftSchedule.update({
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

    // Invalidate Redis cache so next read recomputes from DB
    await this.redis.del(`${SHIFT_SLOTS_PREFIX}${id}`);
    // Re-set with updated totalSlots if changed
    if (dto.totalSlots !== undefined) {
      const available = shift.totalSlots - shift.usedSlots;
      await this.redis.set(
        `${SHIFT_SLOTS_PREFIX}${id}`,
        available,
        'EX',
        SHIFT_CACHE_TTL,
      );
    }

    return shift;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const shift = await this.findOne(id, tenantId);
    if (shift.usedSlots > 0) {
      throw new BadRequestException('Cannot delete a shift with registered trucks');
    }
    await prisma.shiftSchedule.delete({ where: { id } });
    await this.redis.del(`${SHIFT_SLOTS_PREFIX}${id}`);
  }

  /**
   * Open all shifts for today that are still in 'open' status.
   * Used by manual trigger or cron job.
   */
  async openForToday(tenantId: string): Promise<ShiftSchedule[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shifts = await prisma.shiftSchedule.findMany({
      where: {
        tenantId,
        date: today,
        status: 'open',
      },
    });

    // Ensure Redis slot counters are initialized for today's shifts
    const pipeline = this.redis.pipeline();
    for (const shift of shifts) {
      const key = `${SHIFT_SLOTS_PREFIX}${shift.id}`;
      const available = shift.totalSlots - shift.usedSlots;
      pipeline.set(key, available, 'EX', SHIFT_CACHE_TTL);
    }
    await pipeline.exec();

    this.logger.log(`Opened ${shifts.length} shifts for today (tenant: ${tenantId})`);
    return shifts;
  }

  /**
   * Get available slots: Redis first, fallback to DB.
   */
  async getAvailableSlots(
    date: string,
    commodityId: string,
    operationType: string,
    tenantId: string,
  ): Promise<Array<{ shift: ShiftSchedule; availableSlots: number }>> {
    const shifts = await prisma.shiftSchedule.findMany({
      where: {
        tenantId,
        date: new Date(date),
        commodityId,
        operationType,
        status: 'open',
      },
      include: { commodity: true },
    });

    const results = await Promise.all(
      (shifts as ShiftSchedule[]).map(async (shift: ShiftSchedule) => {
        const cached = await this.redis.get(`${SHIFT_SLOTS_PREFIX}${shift.id}`);
        const availableSlots =
          cached !== null
            ? parseInt(cached, 10)
            : shift.totalSlots - shift.usedSlots;
        return { shift, availableSlots };
      }),
    );

    return results;
  }

  /**
   * Atomically decrement available slot counter (Redis DECR + DB sync).
   */
  async decrementSlot(shiftId: string, tenantId: string): Promise<number> {
    const key = `${SHIFT_SLOTS_PREFIX}${shiftId}`;

    // Ensure key exists before decrement
    const current = await this.redis.get(key);
    if (current === null) {
      // Seed from DB
      const shift = await prisma.shiftSchedule.findFirst({
        where: { id: shiftId, tenantId },
      });
      if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
      const available = shift.totalSlots - shift.usedSlots;
      await this.redis.set(key, available, 'EX', SHIFT_CACHE_TTL);
    }

    const newValue = await this.redis.decr(key);
    if (newValue < 0) {
      // Roll back - no slots available
      await this.redis.incr(key);
      throw new BadRequestException('No available slots in this shift');
    }

    // Sync DB (non-blocking — fire and forget; actual DB increment is done in trucks.service transaction)
    this.logger.debug(`Slot decremented for shift ${shiftId}: ${newValue} remaining`);
    return newValue;
  }

  /**
   * Increment slot counter when a truck shift is cancelled.
   */
  async incrementSlot(shiftId: string, tenantId: string): Promise<number> {
    const key = `${SHIFT_SLOTS_PREFIX}${shiftId}`;

    const current = await this.redis.get(key);
    if (current === null) {
      // Seed from DB
      const shift = await prisma.shiftSchedule.findFirst({
        where: { id: shiftId, tenantId },
      });
      if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
      const available = shift.totalSlots - shift.usedSlots;
      await this.redis.set(key, available + 1, 'EX', SHIFT_CACHE_TTL);
      return available + 1;
    }

    const newValue = await this.redis.incr(key);
    this.logger.debug(`Slot incremented for shift ${shiftId}: ${newValue} available`);
    return newValue;
  }
}
