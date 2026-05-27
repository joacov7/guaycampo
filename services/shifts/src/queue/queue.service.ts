import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { QueuePosition } from '@guaycampo/database';

@Injectable()
export class QueueService {
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

  async addToQueue(
    truckShiftId: string,
    tenantId: string,
    parkingZone?: string,
  ): Promise<QueuePosition> {
    const truckShift = await prisma.truckShift.findFirst({
      where: { id: truckShiftId, tenantId },
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

    const lastPosition = await prisma.queuePosition.findFirst({
      where: { tenantId },
      orderBy: { position: 'desc' },
    });
    const nextPosition = (lastPosition?.position ?? 0) + 1;

    const estimatedWait = nextPosition * 15; // ~15 min per truck

    return prisma.queuePosition.create({
      data: {
        truckShiftId,
        position: nextPosition,
        parkingZone,
        estimatedWait,
        tenantId,
      },
      include: {
        truckShift: {
          include: { vehicle: true, driver: true },
        },
      },
    });
  }

  async callNext(tenantId: string): Promise<QueuePosition | null> {
    const next = await prisma.queuePosition.findFirst({
      where: { tenantId, calledAt: null, enteredAt: null },
      include: {
        truckShift: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { position: 'asc' }],
    });
    if (!next) return null;

    const updated = await prisma.queuePosition.update({
      where: { id: next.id },
      data: { calledAt: new Date() },
      include: {
        truckShift: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
    });

    return updated;
  }

  async markEntered(
    queuePositionId: string,
    tenantId: string,
  ): Promise<QueuePosition> {
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

  async removeFromQueue(truckShiftId: string, tenantId: string): Promise<void> {
    const position = await prisma.queuePosition.findFirst({
      where: { truckShiftId, tenantId },
    });
    if (!position) {
      throw new NotFoundException(
        `No queue position found for truck shift ${truckShiftId}`,
      );
    }
    await prisma.queuePosition.delete({ where: { id: position.id } });
  }
}
