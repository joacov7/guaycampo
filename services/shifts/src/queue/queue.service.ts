import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@guaycampo/database';
import type { QueuePosition } from '@guaycampo/database';
import { createEvent } from '@guaycampo/shared-events';
import type { TruckAddedToQueueEvent, TruckCalledFromQueueEvent } from '@guaycampo/shared-events';
import Redis from 'ioredis';

const QUEUE_KEY = (tenantId: string, date: string) => `queue:${tenantId}:${date}`;
const AVG_PROCESS_TIME_KEY = (tenantId: string) => `queue:avgprocess:${tenantId}`;
const DEFAULT_AVG_PROCESS_MINUTES = 15;
const EMA_ALPHA = 0.2;

export interface QueueItem {
  truckShiftId: string;
  position: number;
  plate: string;
  driverName: string;
  driverId: string;
  clientName: string;
  estimatedWaitMin: number;
  status: string;
  checkinAt?: string;
  calledAt?: string;
  parkingZone?: string;
  priority: number;
}

export interface QueueStateResult {
  tenantId: string;
  items: QueueItem[];
  total: number;
  updatedAt: string;
}

export interface QueueMetrics {
  total: number;
  avgWaitMin: number;
  maxWaitMin: number;
  processingNow: number;
}

// Enriched types for Prisma includes
interface QueuePositionWithTruckShift {
  id: string;
  truckShiftId: string;
  position: number;
  parkingZone: string | null;
  calledAt: Date | null;
  enteredAt: Date | null;
  estimatedWait: number | null;
  priority: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  truckShift: {
    id: string;
    driverId: string;
    vehicleId: string;
    clientId: string;
    status: string;
    checkinAt: Date | null;
    checkoutAt: Date | null;
    vehicle: { id: string; plate: string };
    driver: { id: string; fullName: string; phone: string };
    client: { id: string; name: string };
  };
}

interface TimestampedPosition {
  id: string;
  calledAt: Date | null;
  enteredAt: Date | null;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Add truck to Redis sorted set queue.
   * Score: timestamp - (priority * 1_000_000) so higher priority = lower score = earlier in queue.
   */
  async addToQueue(
    truckShiftId: string,
    tenantId: string,
    priority: number = 0,
    parkingZone?: string,
  ): Promise<QueuePosition> {
    const truckShift = await prisma.truckShift.findFirst({
      where: { id: truckShiftId, tenantId },
      include: { vehicle: true, driver: true },
    });
    if (!truckShift) {
      throw new NotFoundException(`TruckShift ${truckShiftId} not found`);
    }

    const existing = await prisma.queuePosition.findUnique({
      where: { truckShiftId },
    });
    if (existing) {
      throw new BadRequestException('Truck is already in the queue');
    }

    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);

    const score = Date.now() - priority * 1_000_000;
    await this.redis.zadd(key, score, truckShiftId);
    await this.redis.expire(key, 86400);

    const rank = await this.redis.zrank(key, truckShiftId);
    const position = (rank ?? 0) + 1;

    const estimatedWaitMin = await this.estimateWaitTime(position, tenantId);

    const queuePosition = await prisma.queuePosition.create({
      data: {
        truckShiftId,
        position,
        parkingZone,
        estimatedWait: estimatedWaitMin,
        priority,
        tenantId,
      },
      include: {
        truckShift: {
          include: { vehicle: true, driver: true },
        },
      },
    });

    const vehicle = (truckShift as { vehicle: { plate: string } }).vehicle;

    const event = createEvent<TruckAddedToQueueEvent>(
      'queue.truck.added',
      tenantId,
      {
        queuePositionId: queuePosition.id,
        truckShiftId,
        vehiclePlate: vehicle.plate,
        position,
        parkingZone,
        estimatedWait: estimatedWaitMin,
      },
    );
    this.eventEmitter.emit('queue.truck.added', event);

    return queuePosition;
  }

  /**
   * Get position of a truck in the queue (1-indexed).
   */
  async getPosition(truckShiftId: string, tenantId: string): Promise<number> {
    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);
    const rank = await this.redis.zrank(key, truckShiftId);
    if (rank === null) {
      const pos = await prisma.queuePosition.findFirst({
        where: { truckShiftId, tenantId },
      });
      if (!pos) throw new NotFoundException(`No queue position found for ${truckShiftId}`);
      return pos.position;
    }
    return rank + 1;
  }

  /**
   * Get full queue state with enriched data from DB.
   */
  async getQueueState(tenantId: string): Promise<QueueStateResult> {
    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);

    const members = await this.redis.zrange(key, 0, -1);

    const queuePositions = (await prisma.queuePosition.findMany({
      where: { tenantId },
      include: {
        truckShift: {
          include: {
            vehicle: true,
            driver: true,
            client: true,
            commodity: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    })) as QueuePositionWithTruckShift[];

    const posMap = new Map(
      queuePositions.map((p: QueuePositionWithTruckShift) => [p.truckShiftId, p]),
    );

    const items: QueueItem[] = [];

    const orderedIds =
      members.length > 0
        ? members
        : queuePositions.map((p: QueuePositionWithTruckShift) => p.truckShiftId);

    let position = 1;
    for (const truckShiftId of orderedIds) {
      const pos = posMap.get(truckShiftId);
      if (!pos) continue;
      const ts = pos.truckShift;
      const estimatedWaitMin = await this.estimateWaitTime(position, tenantId);
      items.push({
        truckShiftId,
        position,
        plate: ts.vehicle.plate,
        driverName: ts.driver.fullName,
        driverId: ts.driverId,
        clientName: ts.client.name,
        estimatedWaitMin,
        status: ts.status,
        checkinAt: ts.checkinAt?.toISOString(),
        calledAt: pos.calledAt?.toISOString(),
        parkingZone: pos.parkingZone ?? undefined,
        priority: pos.priority,
      });
      position++;
    }

    return {
      tenantId,
      items,
      total: items.length,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Remove a truck from the Redis queue.
   */
  async removeFromQueue(truckShiftId: string, tenantId: string): Promise<void> {
    const position = await prisma.queuePosition.findFirst({
      where: { truckShiftId, tenantId },
    });
    if (!position) {
      throw new NotFoundException(
        `No queue position found for truck shift ${truckShiftId}`,
      );
    }

    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);
    await this.redis.zrem(key, truckShiftId);
    await prisma.queuePosition.delete({ where: { id: position.id } });
  }

  /**
   * Peek at the next truck in the queue without removing it.
   */
  async peekNext(tenantId: string): Promise<string | null> {
    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);
    const result = await this.redis.zrange(key, 0, 0);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Pop the next truck from the Redis queue (ZPOPMIN).
   */
  async popNext(tenantId: string): Promise<string | null> {
    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);
    const result = await this.redis.zpopmin(key, 1);
    return result.length >= 2 ? result[0] : null;
  }

  /**
   * Call the next truck: update DB + emit events.
   */
  async callNext(tenantId: string, _operatorId?: string): Promise<QueuePosition | null> {
    const next = (await prisma.queuePosition.findFirst({
      where: { tenantId, calledAt: null, enteredAt: null },
      include: {
        truckShift: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    })) as QueuePositionWithTruckShift | null;
    if (!next) return null;

    const updated = (await prisma.$transaction(
      async (tx: {
        queuePosition: typeof prisma.queuePosition;
        truckShift: typeof prisma.truckShift;
      }) => {
        const pos = await tx.queuePosition.update({
          where: { id: next.id },
          data: { calledAt: new Date() },
          include: {
            truckShift: {
              include: { vehicle: true, driver: true, client: true },
            },
          },
        });
        await tx.truckShift.update({
          where: { id: next.truckShiftId },
          data: { status: 'llamado' },
        });
        return pos;
      },
    )) as QueuePositionWithTruckShift;

    const ts = updated.truckShift;

    const event = createEvent<TruckCalledFromQueueEvent>(
      'queue.truck.called',
      tenantId,
      {
        queuePositionId: updated.id,
        truckShiftId: updated.truckShiftId,
        vehiclePlate: ts.vehicle.plate,
        driverPhone: ts.driver.phone,
        position: updated.position,
        calledAt: updated.calledAt!.toISOString(),
      },
    );
    this.eventEmitter.emit('queue.truck.called', event);

    void this.updateAvgProcessTime(tenantId);

    return updated as unknown as QueuePosition;
  }

  /**
   * Call a specific truck by truckShiftId.
   */
  async callSpecific(
    truckShiftId: string,
    tenantId: string,
    scaleNumber?: string,
  ): Promise<QueuePosition> {
    const pos = (await prisma.queuePosition.findFirst({
      where: { truckShiftId, tenantId },
      include: {
        truckShift: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
    })) as QueuePositionWithTruckShift | null;
    if (!pos) throw new NotFoundException(`Queue position for ${truckShiftId} not found`);

    const updated = (await prisma.$transaction(
      async (tx: {
        queuePosition: typeof prisma.queuePosition;
        truckShift: typeof prisma.truckShift;
      }) => {
        const p = await tx.queuePosition.update({
          where: { id: pos.id },
          data: { calledAt: new Date() },
          include: {
            truckShift: {
              include: { vehicle: true, driver: true, client: true },
            },
          },
        });
        await tx.truckShift.update({
          where: { id: truckShiftId },
          data: { status: 'llamado' },
        });
        return p;
      },
    )) as QueuePositionWithTruckShift;

    const ts = updated.truckShift;
    const event = createEvent<TruckCalledFromQueueEvent>(
      'queue.truck.called',
      tenantId,
      {
        queuePositionId: updated.id,
        truckShiftId,
        vehiclePlate: ts.vehicle.plate,
        driverPhone: ts.driver.phone,
        position: updated.position,
        calledAt: updated.calledAt!.toISOString(),
      },
    );
    this.eventEmitter.emit('queue.truck.called', event);

    void this.eventEmitter.emitAsync('queue.truck.called.scale', {
      ...event,
      scaleNumber,
    });

    return updated as unknown as QueuePosition;
  }

  /**
   * Confirm a truck entered the scale.
   */
  async confirmEntry(truckShiftId: string, tenantId: string): Promise<QueuePosition> {
    const pos = await prisma.queuePosition.findFirst({
      where: { truckShiftId, tenantId },
    });
    if (!pos) throw new NotFoundException(`Queue position for ${truckShiftId} not found`);

    return prisma.$transaction(
      async (tx: {
        queuePosition: typeof prisma.queuePosition;
        truckShift: typeof prisma.truckShift;
      }) => {
        const updated = await tx.queuePosition.update({
          where: { id: pos.id },
          data: { enteredAt: new Date() },
        });
        await tx.truckShift.update({
          where: { id: truckShiftId },
          data: { status: 'en_balanza' },
        });
        return updated;
      },
    );
  }

  /**
   * Mark truck as entered (legacy compatibility).
   */
  async markEntered(queuePositionId: string, tenantId: string): Promise<QueuePosition> {
    const position = await prisma.queuePosition.findFirst({
      where: { id: queuePositionId, tenantId },
    });
    if (!position) {
      throw new NotFoundException(`Queue position ${queuePositionId} not found`);
    }
    return prisma.queuePosition.update({
      where: { id: queuePositionId },
      data: { enteredAt: new Date() },
    });
  }

  /**
   * Estimate wait time using cached avg process time.
   */
  async estimateWaitTime(position: number, tenantId: string): Promise<number> {
    const avgKey = AVG_PROCESS_TIME_KEY(tenantId);
    const cached = await this.redis.get(avgKey);
    const avgMinutes = cached ? parseFloat(cached) : DEFAULT_AVG_PROCESS_MINUTES;
    return Math.round(avgMinutes * position);
  }

  /**
   * Get queue metrics.
   */
  async getQueueMetrics(tenantId: string): Promise<QueueMetrics> {
    const date = this.getTodayDateString();
    const key = QUEUE_KEY(tenantId, date);

    const total = await this.redis.zcard(key);

    const processingNow = await prisma.queuePosition.count({
      where: {
        tenantId,
        enteredAt: { not: null },
        truckShift: { checkoutAt: null },
      },
    });

    const avgKey = AVG_PROCESS_TIME_KEY(tenantId);
    const cached = await this.redis.get(avgKey);
    const avgWaitMin = cached ? parseFloat(cached) : DEFAULT_AVG_PROCESS_MINUTES;
    const maxWaitMin = total > 0 ? Math.round(avgWaitMin * total) : 0;

    return {
      total,
      avgWaitMin: Math.round(avgWaitMin),
      maxWaitMin,
      processingNow,
    };
  }

  /**
   * Update the average process time with exponential moving average.
   */
  private async updateAvgProcessTime(tenantId: string): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 3600_000);
      const recentCompleted = (await prisma.queuePosition.findMany({
        where: {
          tenantId,
          enteredAt: { not: null, gte: oneHourAgo },
          calledAt: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      })) as TimestampedPosition[];

      if (recentCompleted.length === 0) return;

      const times = recentCompleted
        .filter((p: TimestampedPosition) => p.calledAt && p.enteredAt)
        .map(
          (p: TimestampedPosition) =>
            (p.enteredAt!.getTime() - p.calledAt!.getTime()) / 60_000,
        );

      if (times.length === 0) return;

      const sampleAvg = times.reduce((a: number, b: number) => a + b, 0) / times.length;

      const avgKey = AVG_PROCESS_TIME_KEY(tenantId);
      const current = await this.redis.get(avgKey);
      const currentAvg = current ? parseFloat(current) : DEFAULT_AVG_PROCESS_MINUTES;

      const newAvg = EMA_ALPHA * sampleAvg + (1 - EMA_ALPHA) * currentAvg;

      await this.redis.set(avgKey, newAvg.toFixed(2), 'EX', 86400);
      this.logger.debug(`Updated avgProcessTime for tenant ${tenantId}: ${newAvg.toFixed(2)} min`);
    } catch (err) {
      this.logger.warn(`Failed to update avgProcessTime: ${String(err)}`);
    }
  }

  /**
   * Get the full queue (legacy compatibility method).
   */
  async getQueue(tenantId: string): Promise<QueuePosition[]> {
    return prisma.queuePosition.findMany({
      where: { tenantId },
      include: {
        truckShift: {
          include: {
            vehicle: true,
            driver: true,
            client: true,
            commodity: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    });
  }
}
