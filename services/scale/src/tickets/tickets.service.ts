// =============================================================================
// GuayCampo - Tickets Service
// Manages the full weighing lifecycle for scale tickets.
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@guaycampo/database';
import type { ScaleTicket } from '@guaycampo/database';
import { ScaleStatus } from '@guaycampo/shared-types';
import { createEvent } from '@guaycampo/shared-events';
import type {
  ScaleTicketCreatedEvent,
  GrossWeightRecordedEvent,
  TareWeightRecordedEvent,
  WeighingCompletedEvent,
} from '@guaycampo/shared-events';
import type Redis from 'ioredis';
import { ScaleGateway } from '../websocket/scale.gateway';
import { ModbusService } from '../modbus/modbus.service';
import { PdfService } from './pdf.service';
import type { StartEntryDto } from './dto/create-ticket.dto';
import type {
  ConfirmGrossWeightDto,
  ConfirmTareWeightDto,
  RejectTicketDto,
} from './dto/complete-weighing.dto';
import type { ScaleTicketForPdf } from './pdf.service';
import type { IScaleTicket } from '@guaycampo/shared-types';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly scaleGateway: ScaleGateway,
    private readonly modbusService: ModbusService,
    private readonly pdfService: PdfService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Start entry — generate ticket, start polling
  // ---------------------------------------------------------------------------

  async startEntry(dto: StartEntryDto, tenantId: string): Promise<ScaleTicket> {
    const ticketNumber = await this.generateTicketNumber(tenantId);

    const ticket = await prisma.scaleTicket.create({
      data: {
        ticketNumber,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        clientId: dto.clientId,
        commodityId: dto.commodityId,
        ...(dto.truckShiftId ? { truckShiftId: dto.truckShiftId } : {}),
        status: ScaleStatus.PESADA_BRUTA,
        observations: dto.observations ?? null,
        tenantId,
      },
      include: { vehicle: true, driver: true, client: true },
    });

    this.logger.log(`Ticket created: ${ticketNumber} for tenant ${tenantId}`);

    // Start Modbus polling if a device was specified
    if (dto.deviceId) {
      void this.modbusService.startWeighing(dto.deviceId).catch((err: Error) =>
        this.logger.warn(`Could not start weighing on device ${dto.deviceId}: ${err.message}`),
      );
    }

    // Broadcast to operations dashboard
    this.scaleGateway.broadcastTicketUpdate(tenantId, ticket as unknown as Partial<IScaleTicket>);

    // Emit domain event
    const event = createEvent<ScaleTicketCreatedEvent>(
      'scale.ticket.created',
      tenantId,
      {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        truckShiftId: ticket.truckShiftId ?? undefined,
        vehiclePlate:
          (ticket as ScaleTicket & { vehicle?: { plate?: string } }).vehicle?.plate ?? '',
        vehicleId: ticket.vehicleId,
        driverId: ticket.driverId,
        clientId: ticket.clientId,
        commodityId: ticket.commodityId,
      },
    );
    this.eventEmitter.emit('scale.ticket.created', event);

    return ticket;
  }

  // ---------------------------------------------------------------------------
  // 2. Confirm gross weight
  // ---------------------------------------------------------------------------

  async confirmGrossWeight(
    ticketId: string,
    dto: ConfirmGrossWeightDto,
    tenantId: string,
    _operatorId: string,
  ): Promise<ScaleTicket> {
    const ticket = await this.findOneForTenant(ticketId, tenantId);

    if (ticket.status !== ScaleStatus.PESADA_BRUTA) {
      throw new BadRequestException(
        `Ticket is in status "${ticket.status}", expected "${ScaleStatus.PESADA_BRUTA}"`,
      );
    }

    const updated = await prisma.scaleTicket.update({
      where: { id: ticketId },
      data: {
        grossWeight: dto.grossWeightKg,
        grossAt: new Date(),
        grossPhotoUrl: dto.grossPhotoUrl ?? null,
        plateConfirmed: dto.plateConfirmed ?? ticket.plateConfirmed,
        status: ScaleStatus.PESADA_TARA,
        ...(dto.observations ? { observations: dto.observations } : {}),
      },
      include: { vehicle: true, driver: true, client: true },
    });

    this.scaleGateway.broadcastTicketUpdate(tenantId, updated as unknown as Partial<IScaleTicket>);

    const event = createEvent<GrossWeightRecordedEvent>(
      'scale.ticket.gross_weight_recorded',
      tenantId,
      {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        vehiclePlate: ticket.plateConfirmed ?? ticket.plateDetected ?? '',
        grossWeight: dto.grossWeightKg,
        grossAt: new Date().toISOString(),
        plateDetected: ticket.plateDetected ?? undefined,
        ocrConfidence: ticket.ocrConfidence ? Number(ticket.ocrConfidence) : undefined,
      },
    );
    this.eventEmitter.emit('scale.ticket.gross_weight_recorded', event);

    this.logger.log(
      `Gross weight recorded for ticket ${ticket.ticketNumber}: ${dto.grossWeightKg} kg`,
    );
    return updated;
  }

  // ---------------------------------------------------------------------------
  // 3. Confirm tare weight — calculate net
  // ---------------------------------------------------------------------------

  async confirmTareWeight(
    ticketId: string,
    dto: ConfirmTareWeightDto,
    tenantId: string,
    _operatorId: string,
  ): Promise<ScaleTicket> {
    const ticket = await this.findOneForTenant(ticketId, tenantId);

    if (ticket.status !== ScaleStatus.PESADA_TARA) {
      throw new BadRequestException(
        `Ticket is in status "${ticket.status}", expected "${ScaleStatus.PESADA_TARA}"`,
      );
    }
    if (!ticket.grossWeight) {
      throw new BadRequestException('Gross weight not recorded — cannot compute net weight');
    }

    const grossKg = Number(ticket.grossWeight);
    const tareKg = dto.tareWeightKg;
    const netKg = parseFloat((grossKg - tareKg).toFixed(2));

    if (netKg <= 0) {
      throw new BadRequestException(
        `Net weight (${netKg} kg) is not positive — tare (${tareKg}) exceeds gross (${grossKg})`,
      );
    }

    const updated = await prisma.scaleTicket.update({
      where: { id: ticketId },
      data: {
        tareWeight: tareKg,
        tareAt: new Date(),
        tarePhotoUrl: dto.tarePhotoUrl ?? null,
        netWeight: netKg,
        status: ScaleStatus.COMPLETADO,
        ...(dto.observations ? { observations: dto.observations } : {}),
      },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        truckShift: { include: { shift: true } },
      },
    });

    // Update silo stock if requested
    if (dto.siloId) {
      await prisma.siloMovement.create({
        data: {
          siloId: dto.siloId,
          movementType: 'entrada',
          quantityKg: netKg,
          scaleTicketId: ticketId,
          tenantId,
        },
      });
      await prisma.silo.update({
        where: { id: dto.siloId },
        data: {
          currentStock: { increment: netKg / 1000 }, // convert kg → tons
        },
      });
    }

    this.scaleGateway.broadcastTicketUpdate(tenantId, updated as unknown as Partial<IScaleTicket>);

    // Emit domain events
    const tareEvent = createEvent<TareWeightRecordedEvent>(
      'scale.ticket.tare_weight_recorded',
      tenantId,
      {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        vehiclePlate: ticket.plateConfirmed ?? ticket.plateDetected ?? '',
        tareWeight: tareKg,
        netWeight: netKg,
        tareAt: new Date().toISOString(),
      },
    );
    this.eventEmitter.emit('scale.ticket.tare_weight_recorded', tareEvent);

    const completedEvent = createEvent<WeighingCompletedEvent>(
      'scale.ticket.completed',
      tenantId,
      {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        vehiclePlate: ticket.plateConfirmed ?? ticket.plateDetected ?? '',
        grossWeight: grossKg,
        tareWeight: tareKg,
        netWeight: netKg,
        commodityId: ticket.commodityId,
        clientId: ticket.clientId,
        status: ScaleStatus.COMPLETADO,
      },
    );
    this.eventEmitter.emit('scale.ticket.completed', completedEvent);

    this.logger.log(
      `Weighing completed for ticket ${ticket.ticketNumber}: gross=${grossKg}, tare=${tareKg}, net=${netKg}`,
    );
    return updated;
  }

  // ---------------------------------------------------------------------------
  // 4. Reject ticket
  // ---------------------------------------------------------------------------

  async reject(
    ticketId: string,
    dto: RejectTicketDto,
    tenantId: string,
  ): Promise<ScaleTicket> {
    const ticket = await this.findOneForTenant(ticketId, tenantId);

    if (ticket.status === ScaleStatus.COMPLETADO || ticket.status === ScaleStatus.ANULADO) {
      throw new BadRequestException(`Cannot reject a ticket in status "${ticket.status}"`);
    }

    const updated = await prisma.scaleTicket.update({
      where: { id: ticketId },
      data: {
        status: ScaleStatus.ANULADO,
        observations: dto.reason,
      },
    });

    this.scaleGateway.broadcastTicketUpdate(tenantId, updated as unknown as Partial<IScaleTicket>);
    this.logger.log(`Ticket ${ticket.ticketNumber} rejected: ${dto.reason}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // 5. Generate PDF
  // ---------------------------------------------------------------------------

  async generatePdf(ticketId: string, tenantId: string): Promise<Buffer> {
    const ticket = await prisma.scaleTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        vehicle: true,
        driver: true,
        client: true,
        truckShift: { include: { shift: true } },
      },
    });

    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    return this.pdfService.generateScaleTicket(ticket as unknown as ScaleTicketForPdf);
  }

  // ---------------------------------------------------------------------------
  // List / find
  // ---------------------------------------------------------------------------

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      plate?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (filters?.status) where['status'] = filters.status;
    if (filters?.plate) {
      where['OR'] = [
        { plateDetected: { contains: filters.plate, mode: 'insensitive' } },
        { plateConfirmed: { contains: filters.plate, mode: 'insensitive' } },
      ];
    }
    if (filters?.dateFrom ?? filters?.dateTo) {
      where['createdAt'] = {
        ...(filters?.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.scaleTicket.findMany({
        where,
        include: { vehicle: true, driver: true, client: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.scaleTicket.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(ticketId: string, tenantId: string): Promise<ScaleTicket> {
    return this.findOneForTenant(ticketId, tenantId);
  }

  async updateOcrResult(
    ticketId: string,
    tenantId: string,
    plate: string | null,
    confidence: number,
  ): Promise<ScaleTicket> {
    const ticket = await this.findOneForTenant(ticketId, tenantId);
    return prisma.scaleTicket.update({
      where: { id: ticket.id },
      data: {
        plateDetected: plate ?? ticket.plateDetected,
        ocrConfidence: confidence,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Ticket number generation (Redis atomic counter)
  // ---------------------------------------------------------------------------

  async generateTicketNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const redisKey = `ticket_seq:${tenantId}:${year}`;
    const seq = await this.redis.incr(redisKey);
    return `${year}-${String(seq).padStart(6, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findOneForTenant(ticketId: string, tenantId: string): Promise<ScaleTicket> {
    const ticket = await prisma.scaleTicket.findFirst({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);
    return ticket;
  }
}
