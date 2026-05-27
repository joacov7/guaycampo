import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@guaycampo/database';
import type { TruckShift } from '@guaycampo/database';
import { TruckShiftStatus } from '@guaycampo/shared-types';
import { createEvent } from '@guaycampo/shared-events';
import type {
  TruckCheckedInEvent,
  TruckStatusChangedEvent,
} from '@guaycampo/shared-events';
import type { CreateTruckShiftDto } from './dto/create-truck-shift.dto';
import type { UpdateTruckShiftDto } from './dto/update-truck-shift.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../queue/queue.service';
import { ShiftsService } from '../shifts/shifts.service';
import { ShiftsGateway } from '../websocket/shifts.gateway';
import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';

const QR_SECRET = process.env.QR_HMAC_SECRET ?? 'guaycampo-qr-secret';
const CHECKIN_WINDOW_MINUTES = 30;

function generateQrCode(truckShiftId: string): string {
  const uuid = randomUUID();
  const payload = `${uuid}:${truckShiftId}`;
  const sig = createHmac('sha256', QR_SECRET).update(payload).digest('hex').slice(0, 8);
  return `${uuid}:${sig}`;
}

@Injectable()
export class TrucksService {
  private readonly logger = new Logger(TrucksService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    private readonly queueService: QueueService,
    private readonly shiftsService: ShiftsService,
    private readonly shiftsGateway: ShiftsGateway,
  ) {}

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

  async findByQr(qrCode: string): Promise<TruckShift> {
    const truck = await prisma.truckShift.findFirst({
      where: { qrCode },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        commodity: true,
        shift: { include: { commodity: true } },
        queuePosition: true,
      },
    });
    if (!truck) throw new NotFoundException(`QR code not found`);
    return truck;
  }

  async getDriverShifts(driverId: string, tenantId: string): Promise<TruckShift[]> {
    return prisma.truckShift.findMany({
      where: { driverId, tenantId },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        commodity: true,
        shift: true,
        queuePosition: true,
        scaleTickets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a truck shift:
   * - Verify slot availability via Redis
   * - Decrement slot atomically
   * - Generate QR with HMAC signature
   * - Emit ShiftCreated event
   * - Send WhatsApp confirmation (fire-and-forget)
   */
  async createTruckShift(dto: CreateTruckShiftDto, tenantId: string): Promise<TruckShift> {
    const shift = await prisma.shiftSchedule.findFirst({
      where: { id: dto.shiftId, tenantId },
      include: { commodity: true },
    });
    if (!shift) throw new NotFoundException(`Shift ${dto.shiftId} not found`);

    if (shift.status !== 'open') {
      throw new BadRequestException(`Shift is not open (status: ${shift.status})`);
    }

    // Decrement slot atomically in Redis (will throw if no slots)
    await this.shiftsService.decrementSlot(dto.shiftId, tenantId);

    const [vehicle, driver, client] = await Promise.all([
      prisma.vehicle.findFirst({ where: { id: dto.vehicleId, tenantId } }),
      prisma.driver.findFirst({ where: { id: dto.driverId, tenantId } }),
      prisma.client.findFirst({ where: { id: dto.clientId, tenantId } }),
    ]);

    if (!vehicle) {
      await this.shiftsService.incrementSlot(dto.shiftId, tenantId);
      throw new NotFoundException(`Vehicle ${dto.vehicleId} not found`);
    }
    if (!driver) {
      await this.shiftsService.incrementSlot(dto.shiftId, tenantId);
      throw new NotFoundException(`Driver ${dto.driverId} not found`);
    }
    if (!client) {
      await this.shiftsService.incrementSlot(dto.shiftId, tenantId);
      throw new NotFoundException(`Client ${dto.clientId} not found`);
    }

    const qrCode = generateQrCode(dto.shiftId);

    let truckShift: TruckShift;
    try {
      const [created] = await prisma.$transaction([
        prisma.truckShift.create({
          data: {
            shiftId: dto.shiftId,
            vehicleId: dto.vehicleId,
            driverId: dto.driverId,
            clientId: dto.clientId,
            commodityId: dto.commodityId,
            estimatedQty: dto.estimatedQty ? parseFloat(dto.estimatedQty) : undefined,
            cpeNumber: dto.cpeNumber,
            qrCode,
            status: TruckShiftStatus.CONFIRMADO,
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
      truckShift = created;
    } catch (err) {
      // Roll back Redis decrement if DB fails
      await this.shiftsService.incrementSlot(dto.shiftId, tenantId);
      throw err;
    }

    // Emit event
    const event = createEvent<TruckStatusChangedEvent>(
      'shifts.truck.status_changed',
      tenantId,
      {
        truckShiftId: truckShift.id,
        vehiclePlate: vehicle.plate,
        previousStatus: TruckShiftStatus.PENDIENTE,
        newStatus: TruckShiftStatus.CONFIRMADO,
        changedAt: new Date().toISOString(),
      },
    );
    this.eventEmitter.emit('shifts.truck.status_changed', event);

    // Fire-and-forget WhatsApp confirmation
    void this.notificationsService.sendShiftConfirmation({
      phone: driver.phone,
      driverName: driver.fullName,
      shiftDate: shift.date.toISOString().split('T')[0],
      timeFrom: shift.timeFrom ?? '',
      commodity: shift.commodity.name,
      qrCodeUrl: `${process.env.APP_BASE_URL ?? 'https://app.guaycampo.com'}/qr/${qrCode}`,
      shiftNumber: truckShift.id.slice(-6).toUpperCase(),
    });

    return truckShift;
  }

  /**
   * Check-in via QR code:
   * - Validate QR
   * - Verify time window (±30 min of shift time)
   * - Update status → en_planta
   * - Create QueuePosition
   * - Emit TruckCheckedIn event
   * - Send WhatsApp with position (fire-and-forget)
   */
  async checkIn(qrCode: string, tenantId: string): Promise<TruckShift> {
    const truckShift = await prisma.truckShift.findFirst({
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

    if (!truckShift) throw new NotFoundException(`Invalid QR code`);

    if (
      truckShift.status === TruckShiftStatus.CANCELADO ||
      truckShift.status === TruckShiftStatus.RECHAZADO ||
      truckShift.status === TruckShiftStatus.COMPLETADO
    ) {
      throw new BadRequestException(
        `Cannot check in: truck shift is in status '${truckShift.status}'`,
      );
    }

    if (truckShift.checkinAt) {
      throw new BadRequestException('Truck has already checked in');
    }

    // Validate time window if shift has timeFrom
    if (truckShift.shift.timeFrom) {
      const shiftDate = truckShift.shift.date;
      const [hours, minutes] = truckShift.shift.timeFrom.split(':').map(Number);
      const shiftTime = new Date(shiftDate);
      shiftTime.setHours(hours, minutes, 0, 0);
      const windowMs = CHECKIN_WINDOW_MINUTES * 60 * 1000;
      const now = Date.now();
      if (
        now < shiftTime.getTime() - windowMs ||
        now > shiftTime.getTime() + windowMs
      ) {
        throw new BadRequestException(
          `Check-in window is ±${CHECKIN_WINDOW_MINUTES} minutes of the shift time (${truckShift.shift.timeFrom})`,
        );
      }
    }

    const checkinAt = new Date();

    const updated = await prisma.truckShift.update({
      where: { id: truckShift.id },
      data: {
        status: TruckShiftStatus.EN_PLANTA,
        checkinAt,
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

    // Add to queue
    const queuePos = await this.queueService.addToQueue(
      truckShift.id,
      tenantId,
      0,
    );

    // Emit TruckCheckedIn event
    const event = createEvent<TruckCheckedInEvent>(
      'shifts.truck.checked_in',
      tenantId,
      {
        truckShiftId: truckShift.id,
        shiftId: truckShift.shiftId,
        vehiclePlate: truckShift.vehicle.plate,
        vehicleId: truckShift.vehicleId,
        driverId: truckShift.driverId,
        driverName: truckShift.driver.fullName,
        clientId: truckShift.clientId,
        clientName: truckShift.client.name,
        commodityId: truckShift.commodityId,
        checkinAt: checkinAt.toISOString(),
      },
    );
    this.eventEmitter.emit('shifts.truck.checked_in', event);

    // Broadcast queue update via WebSocket
    void this.queueService
      .getQueueState(tenantId)
      .then((state) => {
        this.shiftsGateway.broadcastQueueUpdate(tenantId, {
          ...state,
        });
      })
      .catch((err) => this.logger.warn(`Failed to broadcast queue state: ${String(err)}`));

    // Fire-and-forget WhatsApp queue position
    const estimatedWaitMin = await this.queueService.estimateWaitTime(
      queuePos.position,
      tenantId,
    );
    void this.notificationsService.sendQueuePosition({
      phone: truckShift.driver.phone,
      driverName: truckShift.driver.fullName,
      plate: truckShift.vehicle.plate,
      position: queuePos.position,
      estimatedWaitMin,
    });

    return updated;
  }

  /**
   * Call next truck (operator action):
   * - Get first truck in queue with status 'en_planta'
   * - Update status → llamado
   * - Emit via WebSocket (display + driver app)
   * - Notify WhatsApp (fire-and-forget)
   */
  async callNext(tenantId: string, operatorId?: string): Promise<TruckShift | null> {
    const queuePos = await this.queueService.callNext(tenantId, operatorId);
    if (!queuePos) return null;

    const ts = queuePos.truckShift as TruckShift & {
      vehicle: { plate: string };
      driver: { fullName: string; phone: string };
    };

    // Broadcast via WebSocket to display and driver
    this.shiftsGateway.broadcastDriverCalled(ts.driverId, {
      truckShiftId: ts.id,
      driverId: ts.driverId,
      plate: (ts as any).vehicle.plate,
      calledAt: queuePos.calledAt?.toISOString() ?? new Date().toISOString(),
    });

    // Broadcast updated queue state
    void this.queueService
      .getQueueState(tenantId)
      .then((state) => this.shiftsGateway.broadcastQueueUpdate(tenantId, state))
      .catch((err) => this.logger.warn(`Failed to broadcast queue state: ${String(err)}`));

    // Fire-and-forget WhatsApp
    void this.notificationsService.sendDriverCalled({
      phone: (ts as any).driver.phone,
      driverName: (ts as any).driver.fullName,
      plate: (ts as any).vehicle.plate,
    });

    return prisma.truckShift.findFirst({
      where: { id: ts.id },
      include: { vehicle: true, driver: true, client: true, commodity: true, shift: true, queuePosition: true },
    });
  }

  /**
   * Confirm truck entered scale: status → en_balanza.
   */
  async confirmEntry(truckShiftId: string, tenantId: string): Promise<TruckShift> {
    await this.queueService.confirmEntry(truckShiftId, tenantId);

    const updated = await prisma.truckShift.update({
      where: { id: truckShiftId },
      data: { status: TruckShiftStatus.EN_BALANZA },
      include: { vehicle: true, driver: true, client: true, commodity: true, shift: true, queuePosition: true },
    });

    // Broadcast queue update
    void this.queueService
      .getQueueState(tenantId)
      .then((state) => this.shiftsGateway.broadcastQueueUpdate(tenantId, state))
      .catch((err) => this.logger.warn(`Failed to broadcast queue state: ${String(err)}`));

    return updated;
  }

  /**
   * Cancel a truck shift:
   * - Set status → CANCELADO
   * - Return slot to shift
   * - Remove from queue if waiting
   */
  async cancel(truckShiftId: string, tenantId: string): Promise<TruckShift> {
    const truckShift = await this.findOne(truckShiftId, tenantId);

    if (
      truckShift.status === TruckShiftStatus.CANCELADO ||
      truckShift.status === TruckShiftStatus.COMPLETADO
    ) {
      throw new BadRequestException(
        `Cannot cancel: truck shift is in status '${truckShift.status}'`,
      );
    }

    const previousStatus = truckShift.status as TruckShiftStatus;

    const updated = await prisma.$transaction(
      async (tx: {
        truckShift: typeof prisma.truckShift;
        shiftSchedule: typeof prisma.shiftSchedule;
      }) => {
        const ts = await tx.truckShift.update({
          where: { id: truckShiftId },
          data: { status: TruckShiftStatus.CANCELADO },
          include: { vehicle: true, driver: true, client: true, commodity: true, shift: true, queuePosition: true },
        });
        await tx.shiftSchedule.update({
          where: { id: truckShift.shiftId },
          data: { usedSlots: { decrement: 1 } },
        });
        return ts;
      },
    );

    // Return slot to Redis
    await this.shiftsService.incrementSlot(truckShift.shiftId, tenantId);

    // Remove from queue if present
    if (truckShift.queuePosition) {
      try {
        await this.queueService.removeFromQueue(truckShiftId, tenantId);
      } catch {
        // Queue position may already not exist; ignore
      }
    }

    const event = createEvent<TruckStatusChangedEvent>(
      'shifts.truck.status_changed',
      tenantId,
      {
        truckShiftId,
        vehiclePlate: (truckShift as any).vehicle?.plate ?? '',
        previousStatus,
        newStatus: TruckShiftStatus.CANCELADO,
        changedAt: new Date().toISOString(),
      },
    );
    this.eventEmitter.emit('shifts.truck.status_changed', event);

    // Broadcast queue update
    void this.queueService
      .getQueueState(tenantId)
      .then((state) => this.shiftsGateway.broadcastQueueUpdate(tenantId, state))
      .catch((err) => this.logger.warn(`Failed to broadcast queue state: ${String(err)}`));

    return updated;
  }

  async update(id: string, dto: UpdateTruckShiftDto, tenantId: string): Promise<TruckShift> {
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

  // Backwards-compatible alias
  async create(dto: CreateTruckShiftDto, tenantId: string): Promise<TruckShift> {
    return this.createTruckShift(dto, tenantId);
  }
}
