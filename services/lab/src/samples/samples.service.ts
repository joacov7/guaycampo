// =============================================================================
// SamplesService — CRUD de muestras + lógica principal de lab
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma } from '@guaycampo/database';
import type { LabSample } from '@guaycampo/database';
import { createEvent } from '@guaycampo/shared-events';
import type {
  LabSampleTakenEvent,
  LabSampleAnalyzedEvent,
  LabSampleApprovedEvent,
  LabSampleRejectedEvent,
} from '@guaycampo/shared-events';
import Redis from 'ioredis';
import { QualityService } from '../quality/quality.service';
import { LabGateway } from '../websocket/lab.gateway';
import type { CreateSampleDto, SubmitResultsDto } from './dto/create-sample.dto';
import type { LabSampleInput } from '../quality/quality.types';

const LAB_SEQ_PREFIX = 'lab:seq:';

export interface SampleFilters {
  status?: string;
  scaleTicketId?: string;
  commodityId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SamplesService {
  private readonly logger = new Logger(SamplesService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly qualityService: QualityService,
    private readonly labGateway: LabGateway,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  // ---------------------------------------------------------------------------
  // Listar muestras con filtros
  // ---------------------------------------------------------------------------
  async findAll(
    tenantId: string,
    filters: SampleFilters = {},
  ): Promise<{ data: LabSample[]; total: number; page: number; limit: number; totalPages: number }> {
    const { status, scaleTicketId, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (scaleTicketId) where.scaleTicketId = scaleTicketId;
    if (dateFrom || dateTo) {
      where.takenAt = {};
      if (dateFrom) (where.takenAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.takenAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.labSample.findMany({
        where,
        include: {
          scaleTicket: {
            include: {
              vehicle: true,
              driver: true,
              client: true,
            },
          },
        },
        orderBy: { takenAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.labSample.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ---------------------------------------------------------------------------
  // Obtener muestra por ID
  // ---------------------------------------------------------------------------
  async findOne(id: string, tenantId: string): Promise<LabSample> {
    const sample = await prisma.labSample.findFirst({
      where: { id, tenantId },
      include: {
        scaleTicket: {
          include: {
            vehicle: true,
            driver: true,
            client: true,
          },
        },
      },
    });
    if (!sample) throw new NotFoundException(`Muestra ${id} no encontrada`);
    return sample;
  }

  // ---------------------------------------------------------------------------
  // Crear muestra nueva — status inicial: 'pendiente'
  // ---------------------------------------------------------------------------
  async create(dto: CreateSampleDto, tenantId: string): Promise<LabSample> {
    // Verificar que el ticket existe y pertenece al tenant
    const ticket = await prisma.scaleTicket.findFirst({
      where: { id: dto.scaleTicketId, tenantId },
      include: { vehicle: true, driver: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket de balanza ${dto.scaleTicketId} no encontrado`);
    }

    const sampleNumber = await this.generateSampleNumber(tenantId);

    const sample = await prisma.labSample.create({
      data: {
        sampleNumber,
        scaleTicketId: dto.scaleTicketId,
        takenAt: dto.takenAt ? new Date(dto.takenAt) : new Date(),
        status: 'pendiente',
        rawData: dto.rawData ?? undefined,
        tenantId,
      },
      include: {
        scaleTicket: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
    });

    // Notificar al laboratorista via WebSocket
    this.labGateway.broadcastNewSample(tenantId, {
      sampleId: sample.id,
      sampleNumber: sample.sampleNumber,
      scaleTicketId: dto.scaleTicketId,
      ticketNumber: ticket.ticketNumber,
      takenAt: sample.takenAt.toISOString(),
    });

    // Emitir evento de dominio
    const event = createEvent<LabSampleTakenEvent>('lab.sample.taken', tenantId, {
      sampleId: sample.id,
      sampleNumber: sample.sampleNumber,
      scaleTicketId: dto.scaleTicketId,
      ticketNumber: ticket.ticketNumber,
      takenAt: sample.takenAt.toISOString(),
    });
    this.eventEmitter.emit('lab.sample.taken', event);

    this.logger.log(`Muestra creada: ${sampleNumber} (ticket: ${ticket.ticketNumber})`);
    return sample;
  }

  // ---------------------------------------------------------------------------
  // Cargar resultados analíticos → calcular ajustes automáticamente
  // ---------------------------------------------------------------------------
  async submitResults(
    sampleId: string,
    dto: SubmitResultsDto,
    tenantId: string,
  ): Promise<LabSample> {
    const sample = await this.findOne(sampleId, tenantId);

    if (sample.status === 'aprobado' || sample.status === 'rechazado') {
      throw new BadRequestException(
        `No se pueden cargar resultados en una muestra con estado '${sample.status}'`,
      );
    }

    // Obtener código de cultivo del ticket
    const ticket = await prisma.scaleTicket.findFirst({
      where: { id: sample.scaleTicketId, tenantId },
      include: {
        driver: true,
      },
    });
    if (!ticket) throw new NotFoundException('Ticket asociado no encontrado');

    // Obtener nombre/código del commodity
    const commodity = await prisma.commodity.findFirst({
      where: { id: ticket.commodityId, tenantId },
    });
    const commodityCode = commodity?.code ?? 'UNK';

    // Construir input para el motor de calidad
    const sampleInput: LabSampleInput = {
      humidity: dto.humidity,
      protein: dto.protein,
      oil: dto.oil,
      gluten: dto.gluten,
      fallingNumber: dto.fallingNumber,
      testWeight: dto.testWeight,
      damagedGrains: dto.damagedGrains,
      burntGrains: dto.burntGrains,
      foreignMatter: dto.foreignMatter,
      brokenGrains: dto.brokenGrains,
    };

    // Calcular ajustes económicos con el motor SENASA
    const calcResult = await this.qualityService.calculateAdjustments(
      sampleInput,
      commodityCode,
      tenantId,
    );

    // Separar bonificaciones y descuentos para guardar en DB
    const bonuses = calcResult.adjustments.filter((a) => a.adjustmentType === 'bonus');
    const discounts = calcResult.adjustments.filter((a) => a.adjustmentType === 'discount');

    // Actualizar muestra con resultados y cálculos
    const updated = await prisma.labSample.update({
      where: { id: sampleId },
      data: {
        humidity: dto.humidity ?? undefined,
        protein: dto.protein ?? undefined,
        gluten: dto.gluten ?? undefined,
        fallingNumber: dto.fallingNumber ?? undefined,
        testWeight: dto.testWeight ?? undefined,
        damagedGrains: dto.damagedGrains ?? undefined,
        foreignMatter: dto.foreignMatter ?? undefined,
        brokenGrains: dto.brokenGrains ?? undefined,
        bonuses: bonuses.length > 0 ? (bonuses as unknown as object[]) : undefined,
        discounts: discounts.length > 0 ? (discounts as unknown as object[]) : undefined,
        netAdjustment: calcResult.totalAdjustmentPct,
        grade: calcResult.grade,
        status: calcResult.status,
        rejectionCause: calcResult.rejectionReasons.length > 0
          ? calcResult.rejectionReasons.join(' | ')
          : undefined,
        rawData: dto.rawData ? (dto.rawData as object) : undefined,
      },
      include: {
        scaleTicket: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
    });

    // --- Emitir evento analizado ---
    const analyzedEvent = createEvent<LabSampleAnalyzedEvent>('lab.sample.analyzed', tenantId, {
      sampleId: updated.id,
      sampleNumber: updated.sampleNumber,
      scaleTicketId: updated.scaleTicketId,
      humidity: dto.humidity,
      protein: dto.protein,
      gluten: dto.gluten,
      fallingNumber: dto.fallingNumber,
      testWeight: dto.testWeight,
      grade: calcResult.grade,
      netAdjustment: calcResult.totalAdjustmentPct,
    });
    this.eventEmitter.emit('lab.sample.analyzed', analyzedEvent);

    if (calcResult.status === 'rechazado') {
      await this.handleRejection(updated, ticket.driver?.phone, calcResult.rejectionReasons, tenantId);
    } else {
      // Notificar operador para continuar el pesaje
      this.labGateway.broadcastSampleResult(tenantId, {
        sampleId: updated.id,
        sampleNumber: updated.sampleNumber,
        scaleTicketId: updated.scaleTicketId,
        status: calcResult.status,
        grade: calcResult.grade,
        netAdjustment: calcResult.totalAdjustmentPct,
        summary: calcResult.summary,
      });

      const approvedEvent = createEvent<LabSampleApprovedEvent>(
        'lab.sample.approved',
        tenantId,
        {
          sampleId: updated.id,
          sampleNumber: updated.sampleNumber,
          scaleTicketId: updated.scaleTicketId,
          grade: calcResult.grade,
          netAdjustment: calcResult.totalAdjustmentPct,
          approvedBy: 'sistema',
          approvedAt: new Date().toISOString(),
          status: 'aprobado',
        },
      );
      this.eventEmitter.emit('lab.sample.approved', approvedEvent);
    }

    this.logger.log(
      `Resultados cargados: ${updated.sampleNumber} → ${calcResult.status} (grado: ${calcResult.grade}, adj: ${(calcResult.totalAdjustmentPct * 100).toFixed(2)}%)`,
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Aprobación manual (supervisor) — override de rechazo automático
  // ---------------------------------------------------------------------------
  async approve(
    sampleId: string,
    userId: string,
    reason: string,
    tenantId: string,
  ): Promise<LabSample> {
    const sample = await this.findOne(sampleId, tenantId);

    if (sample.status === 'aprobado') {
      throw new BadRequestException('La muestra ya está aprobada');
    }
    if (sample.status === 'pendiente') {
      throw new BadRequestException('No se puede aprobar una muestra sin resultados analíticos');
    }

    const updated = await prisma.labSample.update({
      where: { id: sampleId },
      data: {
        status: 'aprobado',
        // Guardar el motivo de override en rawData
        rawData: {
          ...(sample.rawData as object | null ?? {}),
          manualApproval: {
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            reason,
            previousStatus: sample.status,
          },
        } as object,
      },
      include: {
        scaleTicket: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
    });

    // Notificar operador de balanza
    this.labGateway.broadcastSampleResult(tenantId, {
      sampleId: updated.id,
      sampleNumber: updated.sampleNumber,
      scaleTicketId: updated.scaleTicketId,
      status: 'aprobado',
      grade: updated.grade ?? 'S/C',
      netAdjustment: Number(updated.netAdjustment ?? 0),
      summary: `Aprobación manual: ${reason}`,
    });

    const event = createEvent<LabSampleApprovedEvent>('lab.sample.approved', tenantId, {
      sampleId: updated.id,
      sampleNumber: updated.sampleNumber,
      scaleTicketId: updated.scaleTicketId,
      grade: updated.grade ?? 'S/C',
      netAdjustment: Number(updated.netAdjustment ?? 0),
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      status: 'aprobado',
    });
    this.eventEmitter.emit('lab.sample.approved', event);

    this.logger.warn(
      `Aprobación manual: ${updated.sampleNumber} por usuario ${userId} — motivo: ${reason}`,
    );

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Rechazo manual
  // ---------------------------------------------------------------------------
  async reject(
    sampleId: string,
    userId: string,
    reason: string,
    tenantId: string,
  ): Promise<LabSample> {
    const sample = await this.findOne(sampleId, tenantId);

    if (sample.status === 'rechazado') {
      throw new BadRequestException('La muestra ya está rechazada');
    }

    const updated = await prisma.labSample.update({
      where: { id: sampleId },
      data: {
        status: 'rechazado',
        rejectionCause: reason,
        rawData: {
          ...(sample.rawData as object | null ?? {}),
          manualRejection: {
            rejectedBy: userId,
            rejectedAt: new Date().toISOString(),
            reason,
          },
        } as object,
      },
      include: {
        scaleTicket: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
    });

    await this.handleRejection(updated, undefined, [reason], tenantId, userId);

    this.logger.warn(`Rechazo manual: ${updated.sampleNumber} por usuario ${userId}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Muestras de un ticket de balanza
  // ---------------------------------------------------------------------------
  async getForTicket(scaleTicketId: string, tenantId: string): Promise<LabSample[]> {
    return prisma.labSample.findMany({
      where: { scaleTicketId, tenantId },
      orderBy: { takenAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Muestras pendientes de análisis (dashboard lab)
  // ---------------------------------------------------------------------------
  async getPending(tenantId: string): Promise<LabSample[]> {
    return prisma.labSample.findMany({
      where: { tenantId, status: { in: ['pendiente', 'en_proceso'] } },
      include: {
        scaleTicket: {
          include: { vehicle: true, driver: true, client: true },
        },
      },
      orderBy: { takenAt: 'asc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Generar número de muestra secuencial — LAB-2025-000001
  // Usa Redis INCR para secuencia por tenant + año
  // ---------------------------------------------------------------------------
  async generateSampleNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const key = `${LAB_SEQ_PREFIX}${tenantId}:${year}`;
    const seq = await this.redis.incr(key);
    // TTL de 2 años por si el key no expira solo
    await this.redis.expire(key, 60 * 60 * 24 * 365 * 2);
    return `LAB-${year}-${String(seq).padStart(6, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // Handlers privados
  // ---------------------------------------------------------------------------

  private async handleRejection(
    sample: LabSample,
    driverPhone: string | undefined | null,
    reasons: string[],
    tenantId: string,
    rejectedBy = 'sistema',
  ): Promise<void> {
    // Notificar operador de balanza via WebSocket
    this.labGateway.broadcastSampleRejection(tenantId, {
      sampleId: sample.id,
      sampleNumber: sample.sampleNumber,
      scaleTicketId: sample.scaleTicketId,
      reasons,
    });

    // Notificar al chofer via WhatsApp (si tiene teléfono)
    if (driverPhone) {
      const whatsappEvent = createEvent(
        'notification.whatsapp.send' as 'notification.whatsapp.send',
        tenantId,
        {
          to: driverPhone,
          templateName: 'lab_rejection',
          templateParams: {
            sampleNumber: sample.sampleNumber,
            reason: reasons.join(', '),
          },
          relatedEntityType: 'lab_sample',
          relatedEntityId: sample.id,
        },
      );
      this.eventEmitter.emit('notification.whatsapp.send', whatsappEvent);
    }

    // Emitir evento de rechazo
    const rejectedEvent = createEvent<LabSampleRejectedEvent>('lab.sample.rejected', tenantId, {
      sampleId: sample.id,
      sampleNumber: sample.sampleNumber,
      scaleTicketId: sample.scaleTicketId,
      rejectionCause: reasons.join(' | '),
      rejectedBy,
      rejectedAt: new Date().toISOString(),
    });
    this.eventEmitter.emit('lab.sample.rejected', rejectedEvent);
  }
}
