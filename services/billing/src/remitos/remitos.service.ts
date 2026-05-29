import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { PdfService } from '../pdf/pdf.service';

export interface RemitoFilters {
  type?: string;
  status?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class RemitosService {
  private readonly logger = new Logger(RemitosService.name);
  private readonly prisma = new PrismaClient();

  constructor(private readonly pdfService: PdfService) {}

  async create(dto: CreateRemitoDto, userId: string, tenantId: string) {
    // Validate client
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);
    }

    // Validate commodity
    const commodity = await this.prisma.commodity.findFirst({
      where: { id: dto.commodityId },
    });
    if (!commodity) {
      throw new NotFoundException(`Commodity ${dto.commodityId} no encontrado`);
    }

    // Generate remito number: R-YYYY-NNNNNN
    const remitoNumber = await this.generateNumber(tenantId);

    const remito = await this.prisma.remito.create({
      data: {
        remitoNumber,
        remitoType: dto.remitoType as string,
        clientId: dto.clientId,
        vehicleId: dto.vehicleId ?? null,
        driverId: dto.driverId ?? null,
        commodityId: dto.commodityId,
        scaleTicketId: dto.scaleTicketId ?? null,
        grossWeightKg: dto.grossWeightKg ?? null,
        tareWeightKg: dto.tareWeightKg ?? null,
        netWeightKg: dto.netWeightKg ?? null,
        origin: dto.origin ?? null,
        destination: dto.destination ?? null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        status: 'emitido',
        notes: dto.notes ?? null,
        tenantId,
        createdBy: userId,
      },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, fullName: true, licenseNumber: true } },
      },
    });

    this.logger.log(
      `Remito ${remitoNumber} creado para cliente ${client.name}`,
    );

    return remito;
  }

  async sign(
    id: string,
    signatureData: string,
    signerName: string,
    tenantId: string,
  ) {
    const remito = await this.findOne(id, tenantId);

    if (remito.status !== 'emitido') {
      throw new BadRequestException(
        `Solo se pueden firmar remitos en estado "emitido". Estado actual: ${remito.status}`,
      );
    }

    const updated = await this.prisma.remito.update({
      where: { id },
      data: {
        signatureData,
        signerName,
        signedAt: new Date(),
        status: 'firmado',
      },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, fullName: true, licenseNumber: true } },
      },
    });

    this.logger.log(`Remito ${remito.remitoNumber} firmado por ${signerName}`);
    return updated;
  }

  async cancel(id: string, tenantId: string) {
    const remito = await this.findOne(id, tenantId);

    if (remito.status === 'anulado') {
      throw new BadRequestException('El remito ya está anulado');
    }

    const updated = await this.prisma.remito.update({
      where: { id },
      data: { status: 'anulado' },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, fullName: true, licenseNumber: true } },
      },
    });

    this.logger.log(`Remito ${remito.remitoNumber} anulado`);
    return updated;
  }

  async findAll(tenantId: string, filters: RemitoFilters = {}) {
    const where: Prisma.RemitoWhereInput = { tenantId };

    if (filters.type) where.remitoType = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;

    if (filters.dateFrom || filters.dateTo) {
      where.issueDate = {};
      if (filters.dateFrom) {
        (where.issueDate as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.issueDate as Prisma.DateTimeFilter).lte = new Date(filters.dateTo);
      }
    }

    return this.prisma.remito.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, fullName: true, licenseNumber: true } },
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const remito = await this.prisma.remito.findFirst({
      where: { id, tenantId },
      include: {
        client: { select: { id: true, name: true, cuit: true, address: true } },
        commodity: { select: { id: true, name: true, code: true } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
        driver: { select: { id: true, fullName: true, licenseNumber: true } },
        scaleTicket: { select: { id: true, ticketNumber: true } },
      },
    });

    if (!remito) {
      throw new NotFoundException(`Remito ${id} no encontrado`);
    }

    return remito;
  }

  async generatePdf(id: string, tenantId: string): Promise<Buffer> {
    const remito = await this.findOne(id, tenantId);

    // Get tenant info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, cuit: true },
    });

    // Adapt Prisma shape to PDF service expected interface
    const remitoForPdf = {
      ...remito,
      vehicle: remito.vehicle
        ? {
            id: remito.vehicle.id,
            licensePlate: remito.vehicle.plate,
            brand: remito.vehicle.brand,
            model: remito.vehicle.model,
          }
        : null,
      driver: remito.driver
        ? {
            id: remito.driver.id,
            name: remito.driver.fullName,
            licenseNumber: remito.driver.licenseNumber,
          }
        : null,
    };

    return this.pdfService.generateRemitoPdf({
      remito: remitoForPdf,
      tenantName: tenant?.name ?? 'GuayCampo',
      tenantCuit: tenant?.cuit ?? '',
    });
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.remito.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `R-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
