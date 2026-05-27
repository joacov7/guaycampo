import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { RetentionsService } from '../retentions/retentions.service';
import { AfipBillingService } from '../afip/afip-billing.service';
import { PdfService } from '../pdf/pdf.service';
import { AccountService } from '../account/account.service';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateLiquidationDto {
  @ApiProperty({ description: 'ID del cliente (productor)' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: 'ID del commodity (grano)' })
  @IsString()
  commodityId: string;

  @ApiProperty({ description: 'Fecha inicio del período (ISO)' })
  @IsDateString()
  periodFrom: string;

  @ApiProperty({ description: 'Fecha fin del período (ISO)' })
  @IsDateString()
  periodTo: string;

  @ApiProperty({ description: 'CUIT del productor' })
  @IsString()
  producerCuit: string;

  @ApiProperty({ description: 'Código del commodity (para retenciones)' })
  @IsString()
  commodityCode: string;

  @ApiProperty({ description: 'Precio por tonelada (ARS)' })
  @IsNumber()
  @Min(0)
  pricePerTon: number;

  @ApiPropertyOptional({ description: 'Tasa de comisión (0.02 = 2%)', default: 0.02 })
  @IsNumber()
  @IsOptional()
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Costo almacenaje por tonelada (ARS)' })
  @IsNumber()
  @IsOptional()
  storagePerTon?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export interface LiquidationFilters {
  clientId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

interface ScaleTicketWithLab {
  id: string;
  ticketNumber: string;
  netWeight: number | null;
  grossWeight: number | null;
  tareWeight: number | null;
  createdAt: Date;
  labSamples: Array<{
    id: string;
    netAdjustment: number | null;
    humidity: number | null;
    grade: string | null;
  }>;
}

@Injectable()
export class LiquidationsService {
  private readonly logger = new Logger(LiquidationsService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly retentionsService: RetentionsService,
    private readonly afipBillingService: AfipBillingService,
    private readonly pdfService: PdfService,
    private readonly accountService: AccountService,
  ) {}

  async generate(dto: GenerateLiquidationDto, userId: string, tenantId: string) {
    const periodFrom = new Date(dto.periodFrom);
    const periodTo = new Date(dto.periodTo);

    // 1. Validate client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);
    }

    const commodity = await this.prisma.commodity.findFirst({
      where: { id: dto.commodityId },
    });
    if (!commodity) {
      throw new NotFoundException(`Commodity ${dto.commodityId} no encontrado`);
    }

    // 2. Fetch completed scale tickets for the period
    const tickets = await this.getTicketsForPeriod(
      dto.clientId,
      dto.commodityId,
      periodFrom,
      periodTo,
      tenantId,
    );

    if (tickets.length === 0) {
      throw new BadRequestException(
        `No hay tickets completados para el período ${format(periodFrom, 'dd/MM/yyyy')} - ${format(periodTo, 'dd/MM/yyyy')}`,
      );
    }

    // 3. Calculate totals
    const grossKg = tickets.reduce((sum, t) => sum + (Number(t.netWeight) ?? 0), 0);

    // 4. Weighted quality adjustment
    const weightedAdjustment = this.calculateWeightedAdjustment(tickets);
    const adjustedKg = grossKg * (1 + weightedAdjustment / 100);

    // 5. Calculate amounts
    const basePrice = dto.pricePerTon;
    const grossAmount = (adjustedKg / 1000) * basePrice;
    const commission = grossAmount * (dto.commissionRate ?? 0.02);
    const storageFee = (adjustedKg / 1000) * (dto.storagePerTon ?? 0);

    // 6. Calculate retentions
    const retentions = await this.retentionsService.calculate({
      producerCuit: dto.producerCuit,
      subtotal: grossAmount,
      commodity: dto.commodityCode,
      tenantId,
    });

    // 7. Net to pay
    const netAmount =
      grossAmount - commission - storageFee - retentions.iva - retentions.iibb - retentions.ganancias;

    // 8. Generate liquidation number
    const liquidationNumber = await this.generateNumber(tenantId);

    // 9. Create liquidation in DB
    const liquidation = await this.prisma.liquidation.create({
      data: {
        liquidationNumber,
        clientId: dto.clientId,
        commodityId: dto.commodityId,
        periodFrom,
        periodTo,
        grossKg,
        netKg: adjustedKg,
        pricePerTon: basePrice,
        grossAmount,
        bonusAmount: 0,
        discountAmount: 0,
        storageFee,
        commission,
        otherCharges: retentions.iva + retentions.iibb + retentions.ganancias,
        netAmount,
        currency: 'ARS',
        status: 'borrador',
        notes: dto.notes,
        tenantId,
        createdBy: userId,
        liquidationItems: {
          create: tickets.map((ticket) => {
            const tKg = Number(ticket.netWeight) ?? 0;
            const adj = Number(ticket.labSamples?.[0]?.netAdjustment) ?? 0;
            const adjKg = tKg * (1 + adj / 100);
            return {
              scaleTicketId: ticket.id,
              labSampleId: ticket.labSamples?.[0]?.id,
              grossKg: Number(ticket.grossWeight) ?? tKg,
              tareKg: Number(ticket.tareWeight) ?? 0,
              netKg: tKg,
              humidity: ticket.labSamples?.[0]?.humidity
                ? Number(ticket.labSamples[0].humidity)
                : null,
              netAdjustment: adj,
              adjustedKg: adjKg,
              unitPrice: basePrice / 1000,
              amount: (adjKg / 1000) * basePrice,
              tenantId,
            };
          }),
        },
      },
      include: {
        client: true,
        commodity: true,
        liquidationItems: true,
      },
    });

    this.logger.log(
      `Liquidación ${liquidationNumber} generada para cliente ${client.name}, ${tickets.length} tickets`,
    );

    return liquidation;
  }

  async approve(id: string, userId: string, tenantId: string) {
    const liquidation = await this.findOne(id, tenantId);

    if (liquidation.status !== 'borrador') {
      throw new BadRequestException(`La liquidación ya está en estado ${liquidation.status}`);
    }

    const updated = await this.prisma.liquidation.update({
      where: { id },
      data: {
        status: 'pendiente',
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: { client: true, commodity: true },
    });

    // Register movement in current account
    await this.accountService.registerMovement(
      {
        clientId: liquidation.clientId,
        movementType: 'factura',
        referenceType: 'liquidation',
        referenceId: id,
        debit: 0,
        credit: Number(liquidation.netAmount),
        description: `Liquidación ${liquidation.liquidationNumber}`,
        documentNumber: liquidation.liquidationNumber,
      },
      userId,
      tenantId,
    );

    this.logger.log(`Liquidación ${liquidation.liquidationNumber} aprobada por usuario ${userId}`);
    return updated;
  }

  async emitirFactura(liquidationId: string, userId: string, tenantId: string) {
    const liquidation = await this.findOne(liquidationId, tenantId);

    if (liquidation.status === 'borrador') {
      throw new BadRequestException('La liquidación debe estar aprobada antes de emitir factura');
    }
    if (liquidation.status === 'facturada') {
      throw new BadRequestException('Esta liquidación ya fue facturada');
    }

    const client = await this.prisma.client.findFirst({
      where: { id: liquidation.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente de la liquidación no encontrado`);
    }

    // Determine invoice type based on IVA condition
    const invoiceType =
      client.ivaCondition === 'responsable_inscripto'
        ? 'FC-A'
        : client.ivaCondition === 'monotributo'
          ? 'FC-C'
          : 'FC-B';

    const subtotal = Number(liquidation.netAmount);
    const ivaRate =
      client.ivaCondition === 'responsable_inscripto' ? 0.21 : 0;
    const ivaAmount = subtotal * ivaRate;
    const total = subtotal + ivaAmount;

    const afipResult = await this.afipBillingService.emitirFactura(
      {
        type: invoiceType,
        clientCuit: client.cuit,
        subtotal,
        ivaAmount,
        total,
        notes: `Liquidación N° ${liquidation.liquidationNumber}`,
      },
      tenantId,
    );

    const invoiceNumber = `${String(afipResult.puntoVenta).padStart(4, '0')}-${String(afipResult.numeroComprobante).padStart(8, '0')}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: this.extractTypeLetter(invoiceType),
        clientId: client.id,
        liquidationId,
        issueDate: new Date(),
        subtotal,
        ivaAmount,
        ivaRate: ivaRate * 100,
        otherTaxes: 0,
        total,
        currency: 'ARS',
        caeNumber: afipResult.cae,
        caeExpiry: afipResult.caeVto ? this.parseAfipDate(afipResult.caeVto) : null,
        afipResponse: {
          cae: afipResult.cae,
          caeVto: afipResult.caeVto,
          puntoVenta: afipResult.puntoVenta,
          numeroComprobante: afipResult.numeroComprobante,
        },
        status: 'emitida',
        notes: `Liquidación ${liquidation.liquidationNumber}`,
        tenantId,
        createdBy: userId,
      },
    });

    // Update liquidation status to 'facturada'
    await this.prisma.liquidation.update({
      where: { id: liquidationId },
      data: { status: 'facturada' },
    });

    // Register in account
    await this.accountService.registerMovement(
      {
        clientId: client.id,
        movementType: 'factura',
        referenceType: 'invoice',
        referenceId: invoice.id,
        debit: total,
        credit: 0,
        description: `Factura ${invoiceNumber}`,
        documentNumber: invoiceNumber,
      },
      userId,
      tenantId,
    );

    this.logger.log(
      `Factura ${invoiceNumber} emitida para liquidación ${liquidation.liquidationNumber}, CAE: ${afipResult.cae}`,
    );

    return invoice;
  }

  async findOne(id: string, tenantId: string) {
    const liquidation = await this.prisma.liquidation.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        commodity: true,
        liquidationItems: {
          include: {
            scaleTicket: { select: { ticketNumber: true, createdAt: true } },
            labSample: { select: { humidity: true, grade: true, netAdjustment: true } },
          },
        },
      },
    });

    if (!liquidation) {
      throw new NotFoundException(`Liquidación ${id} no encontrada`);
    }

    return liquidation;
  }

  async list(tenantId: string, filters: LiquidationFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (filters.clientId) where['clientId'] = filters.clientId;
    if (filters.status) where['status'] = filters.status;
    if (filters.dateFrom ?? filters.dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.dateFrom) dateFilter['gte'] = filters.dateFrom;
      if (filters.dateTo) dateFilter['lte'] = filters.dateTo;
      where['periodFrom'] = dateFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.liquidation.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, cuit: true } },
          commodity: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.liquidation.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async generatePdf(id: string, tenantId: string): Promise<Buffer> {
    const liquidation = await this.findOne(id, tenantId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    const items = (liquidation.liquidationItems ?? []).map((item) => ({
      ticketNumber: item.scaleTicket?.ticketNumber ?? '',
      date: item.scaleTicket?.createdAt ?? new Date(),
      grossKg: Number(item.grossKg),
      tare: Number(item.tareKg),
      netKg: Number(item.netKg),
      adjustment: Number(item.netAdjustment) ?? 0,
      adjustedKg: Number(item.adjustedKg) ?? Number(item.netKg),
      unitPrice: Number(item.unitPrice) * 1000,
      amount: Number(item.amount),
      humidity: item.labSample?.humidity ? Number(item.labSample.humidity) : undefined,
      grade: item.labSample?.grade ?? undefined,
    }));

    const retIva = Number(liquidation.otherCharges) * 0.4; // rough split for display
    const retIibb = Number(liquidation.otherCharges) * 0.3;
    const retGcias = Number(liquidation.otherCharges) * 0.3;

    return this.pdfService.generateLiquidationPdf({
      liquidationNumber: liquidation.liquidationNumber,
      issueDate: liquidation.createdAt,
      periodFrom: liquidation.periodFrom,
      periodTo: liquidation.periodTo,
      tenantName: tenant?.name ?? tenantId,
      tenantCuit: tenant?.cuit ?? '',
      clientName: liquidation.client?.name ?? '',
      clientCuit: liquidation.client?.cuit ?? '',
      commodityName: liquidation.commodity?.name ?? '',
      items,
      totalGrossKg: Number(liquidation.grossKg),
      totalNetKg: Number(liquidation.netKg),
      basePrice: Number(liquidation.pricePerTon) ?? 0,
      grossAmount: Number(liquidation.grossAmount),
      commission: Number(liquidation.commission),
      storageFee: Number(liquidation.storageFee),
      retentionIva: retIva,
      retentionIibb: retIibb,
      retentionGcias: retGcias,
      totalToPay: Number(liquidation.netAmount),
      currency: liquidation.currency,
      notes: liquidation.notes ?? undefined,
    });
  }

  private async getTicketsForPeriod(
    clientId: string,
    commodityId: string,
    from: Date,
    to: Date,
    tenantId: string,
  ): Promise<ScaleTicketWithLab[]> {
    const tickets = await this.prisma.scaleTicket.findMany({
      where: {
        clientId,
        commodityId,
        tenantId,
        status: 'completado',
        createdAt: { gte: from, lte: to },
      },
      include: {
        labSamples: {
          where: { status: { in: ['aprobado', 'condicional'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            netAdjustment: true,
            humidity: true,
            grade: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      netWeight: t.netWeight ? Number(t.netWeight) : null,
      grossWeight: t.grossWeight ? Number(t.grossWeight) : null,
      tareWeight: t.tareWeight ? Number(t.tareWeight) : null,
      createdAt: t.createdAt,
      labSamples: t.labSamples.map((s) => ({
        id: s.id,
        netAdjustment: s.netAdjustment ? Number(s.netAdjustment) : null,
        humidity: s.humidity ? Number(s.humidity) : null,
        grade: s.grade,
      })),
    }));
  }

  private calculateWeightedAdjustment(tickets: ScaleTicketWithLab[]): number {
    const totalWeight = tickets.reduce((s, t) => s + (t.netWeight ?? 0), 0);
    if (totalWeight === 0) return 0;

    return (
      tickets.reduce((sum, t) => {
        const adj = t.labSamples?.[0]?.netAdjustment ?? 0;
        return sum + (Number(adj) * (t.netWeight ?? 0));
      }, 0) / totalWeight
    );
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.liquidation.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `LIQ-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private extractTypeLetter(type: string): string {
    const match = type.match(/-([A-Z])(-[A-Z])?$/);
    return match ? match[1] : 'B';
  }

  private parseAfipDate(dateStr: string): Date | null {
    if (dateStr.length === 8) {
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);
      return new Date(year, month, day);
    }
    return null;
  }
}
