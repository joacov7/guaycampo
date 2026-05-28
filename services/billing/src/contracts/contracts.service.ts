import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateContractDto, UpdateContractDto } from './dto/create-contract.dto';

export interface ContractFilters {
  status?: string;
  clientId?: string;
  commodityId?: string;
  search?: string;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);
  private readonly prisma = new PrismaClient();

  async create(dto: CreateContractDto, userId: string, tenantId: string) {
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

    // Generate contract number: C-YYYY-NNNNNN
    const contractNumber = await this.generateNumber(tenantId);

    // Determine initial status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDate = new Date(dto.fromDate);
    fromDate.setHours(0, 0, 0, 0);
    const status = fromDate <= today ? 'activo' : 'borrador';

    const contract = await this.prisma.contract.create({
      data: {
        contractNumber,
        clientId: dto.clientId,
        commodityId: dto.commodityId,
        contractType: dto.contractType as string,
        priceCondition: dto.priceCondition as string,
        pricePerTon: dto.pricePerTon ?? null,
        currency: dto.currency ?? 'ARS',
        quantityTon: dto.quantityTon,
        fulfilledTon: 0,
        fromDate: new Date(dto.fromDate),
        toDate: new Date(dto.toDate),
        status,
        notes: dto.notes ?? null,
        tenantId,
        createdBy: userId,
      },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
      },
    });

    this.logger.log(
      `Contrato ${contractNumber} creado para cliente ${client.name}, estado: ${status}`,
    );

    return contract;
  }

  async findAll(tenantId: string, filters: ContractFilters = {}) {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where['status'] = filters.status;
    if (filters.clientId) where['clientId'] = filters.clientId;
    if (filters.commodityId) where['commodityId'] = filters.commodityId;
    if (filters.search) {
      where['OR'] = [
        { contractNumber: { contains: filters.search, mode: 'insensitive' } },
        { client: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const contracts = await this.prisma.contract.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((c) => ({
      ...c,
      fulfillmentPct:
        Number(c.quantityTon) > 0
          ? Math.round((Number(c.fulfilledTon) / Number(c.quantityTon)) * 100)
          : 0,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      include: {
        client: { select: { id: true, name: true, cuit: true } },
        commodity: { select: { id: true, name: true, code: true } },
        scaleTickets: {
          select: {
            id: true,
            ticketNumber: true,
            createdAt: true,
            netWeight: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contrato ${id} no encontrado`);
    }

    return {
      ...contract,
      fulfillmentPct:
        Number(contract.quantityTon) > 0
          ? Math.round(
              (Number(contract.fulfilledTon) / Number(contract.quantityTon)) * 100,
            )
          : 0,
    };
  }

  async update(id: string, dto: UpdateContractDto, tenantId: string) {
    await this.findOne(id, tenantId);

    const data: Record<string, unknown> = {};
    if (dto.pricePerTon !== undefined) data['pricePerTon'] = dto.pricePerTon;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.fromDate !== undefined) data['fromDate'] = new Date(dto.fromDate);
    if (dto.toDate !== undefined) data['toDate'] = new Date(dto.toDate);
    if (dto.status !== undefined) data['status'] = dto.status;
    if (dto.currency !== undefined) data['currency'] = dto.currency;
    if (dto.priceCondition !== undefined) data['priceCondition'] = dto.priceCondition;

    return this.prisma.contract.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        commodity: { select: { id: true, name: true } },
      },
    });
  }

  async cancel(id: string, tenantId: string) {
    const contract = await this.findOne(id, tenantId);

    if (contract.status === 'cancelado') {
      throw new BadRequestException('El contrato ya está cancelado');
    }
    if (contract.status === 'cumplido') {
      throw new BadRequestException('No se puede cancelar un contrato cumplido');
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: 'cancelado' },
      include: {
        client: { select: { id: true, name: true } },
        commodity: { select: { id: true, name: true } },
      },
    });

    this.logger.log(`Contrato ${contract.contractNumber} cancelado`);
    return updated;
  }

  async linkTicket(contractId: string, ticketId: string, tenantId: string) {
    const contract = await this.findOne(contractId, tenantId);

    if (contract.status === 'cancelado' || contract.status === 'cumplido') {
      throw new BadRequestException(
        `No se puede vincular un ticket a un contrato en estado ${contract.status}`,
      );
    }

    // Verify ticket belongs to tenant
    const ticket = await this.prisma.scaleTicket.findFirst({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} no encontrado`);
    }

    // Link the ticket
    await this.prisma.scaleTicket.update({
      where: { id: ticketId },
      data: { contractId },
    });

    // Recalculate fulfilled tons from all linked tickets
    const linkedTickets = await this.prisma.scaleTicket.findMany({
      where: { contractId, status: 'completado', tenantId },
      select: { netWeight: true },
    });

    const fulfilledKg = linkedTickets.reduce(
      (sum, t) => sum + (Number(t.netWeight) ?? 0),
      0,
    );
    const fulfilledTon = fulfilledKg / 1000;

    // Determine new status
    let newStatus: string = contract.status as string;
    if (fulfilledTon >= Number(contract.quantityTon)) {
      newStatus = 'cumplido';
    } else if (contract.status === 'borrador') {
      newStatus = 'activo';
    }

    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: { fulfilledTon, status: newStatus },
      include: {
        client: { select: { id: true, name: true } },
        commodity: { select: { id: true, name: true } },
      },
    });

    this.logger.log(
      `Ticket ${ticketId} vinculado al contrato ${contract.contractNumber}. Cumplido: ${fulfilledTon} tn`,
    );

    return updated;
  }

  async getExpiringSoon(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const contracts = await this.prisma.contract.findMany({
      where: {
        tenantId,
        status: 'activo',
        toDate: { gte: today, lte: in30Days },
      },
      include: {
        client: { select: { id: true, name: true } },
        commodity: { select: { id: true, name: true } },
      },
      orderBy: { toDate: 'asc' },
    });

    return contracts.map((c) => ({
      ...c,
      fulfillmentPct:
        Number(c.quantityTon) > 0
          ? Math.round((Number(c.fulfilledTon) / Number(c.quantityTon)) * 100)
          : 0,
    }));
  }

  private async generateNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.contract.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `C-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
