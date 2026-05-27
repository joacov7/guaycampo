import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AfipBillingService } from '../afip/afip-billing.service';
import { PdfService } from '../pdf/pdf.service';
import type { EmitInvoiceDto } from '../afip/dto/emit-invoice.dto';

export interface InvoiceFilters {
  clientId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  type?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly prisma = new PrismaClient();

  constructor(
    private readonly afipBillingService: AfipBillingService,
    private readonly pdfService: PdfService,
  ) {}

  async list(tenantId: string, filters: InvoiceFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (filters.clientId) where['clientId'] = filters.clientId;
    if (filters.status) where['status'] = filters.status;
    if (filters.type) where['invoiceType'] = filters.type;
    if (filters.dateFrom ?? filters.dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.dateFrom) dateFilter['gte'] = filters.dateFrom;
      if (filters.dateTo) dateFilter['lte'] = filters.dateTo;
      where['issueDate'] = dateFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, cuit: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        invoiceItems: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Factura ${id} no encontrada`);
    }

    return invoice;
  }

  async emit(dto: EmitInvoiceDto, userId: string, tenantId: string) {
    // 1. Validate client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);
    }

    // 2. Call AFIP WSFE to get CAE
    const afipResult = await this.afipBillingService.emitirFactura(
      {
        type: dto.type,
        clientCuit: dto.clientCuit,
        subtotal: dto.subtotal,
        ivaAmount: dto.ivaAmount,
        total: dto.total,
        items: dto.items,
        notes: dto.notes,
      },
      tenantId,
    );

    // 3. Build invoice number: PPPP-NNNNNNNN
    const invoiceNumber = `${String(afipResult.puntoVenta).padStart(4, '0')}-${String(afipResult.numeroComprobante).padStart(8, '0')}`;

    // 4. Determine invoice type letter for DB
    const invoiceType = this.extractTypeLetter(dto.type);

    // 5. Persist invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceType,
        clientId: dto.clientId,
        liquidationId: dto.liquidationId,
        issueDate: new Date(),
        subtotal: dto.subtotal,
        ivaAmount: dto.ivaAmount,
        ivaRate: 21,
        otherTaxes: 0,
        total: dto.total,
        currency: 'ARS',
        caeNumber: afipResult.cae,
        caeExpiry: afipResult.caeVto
          ? this.parseAfipDate(afipResult.caeVto)
          : null,
        afipResponse: {
          cae: afipResult.cae,
          caeVto: afipResult.caeVto,
          puntoVenta: afipResult.puntoVenta,
          numeroComprobante: afipResult.numeroComprobante,
        },
        status: 'emitida',
        notes: dto.notes,
        tenantId,
        createdBy: userId,
        invoiceItems: {
          create: (dto.items ?? []).map((item, idx) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            ivaRate: item.ivaRate ?? 21,
            subtotal: item.quantity * item.unitPrice,
            sortOrder: idx,
            tenantId,
          })),
        },
      },
      include: { invoiceItems: true },
    });

    this.logger.log(
      `Factura ${invoiceNumber} emitida para tenant ${tenantId}, CAE: ${afipResult.cae}`,
    );

    return invoice;
  }

  async generatePdf(id: string, tenantId: string): Promise<Buffer> {
    const invoice = await this.findOne(id, tenantId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const items = (invoice.invoiceItems ?? []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      ivaRate: Number(item.ivaRate),
      subtotal: Number(item.subtotal),
    }));

    return this.pdfService.generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate ?? undefined,
      tenantName: tenant?.name ?? tenantId,
      tenantCuit: tenant?.cuit ?? '',
      clientName: invoice.client?.name ?? '',
      clientCuit: invoice.client?.cuit ?? '',
      items,
      subtotal: Number(invoice.subtotal),
      ivaAmount: Number(invoice.ivaAmount),
      ivaRate: Number(invoice.ivaRate),
      total: Number(invoice.total),
      cae: invoice.caeNumber ?? undefined,
      caeExpiry: invoice.caeExpiry ?? undefined,
      notes: invoice.notes ?? undefined,
      currency: invoice.currency,
    });
  }

  async cancel(id: string, _userId: string, tenantId: string) {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status === 'anulada') {
      throw new BadRequestException('La factura ya está anulada');
    }

    // AFIP does not allow cancellation; must emit credit note
    // This marks the invoice as requiring a credit note and changes status
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'anulada' },
    });

    this.logger.warn(
      `Factura ${invoice.invoiceNumber} marcada como anulada. Debe emitirse Nota de Crédito.`,
    );

    return {
      invoice: updated,
      warning: 'AFIP no permite anular facturas electrónicas. Recuerde emitir la Nota de Crédito correspondiente.',
    };
  }

  private extractTypeLetter(type: string): string {
    // 'FC-A' → 'A', 'FC-B' → 'B', 'FC-E-A' → 'E'
    const match = type.match(/-([A-Z])(-[A-Z])?$/);
    return match ? match[1] : 'B';
  }

  private parseAfipDate(dateStr: string): Date | null {
    // AFIP returns dates as YYYYMMDD
    if (dateStr.length === 8) {
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);
      return new Date(year, month, day);
    }
    return null;
  }
}
