import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface AccountMovementDto {
  clientId: string;
  movementType: string; // 'factura' | 'pago' | 'nota_credito' | 'nota_debito' | 'ajuste'
  referenceType?: string; // 'invoice' | 'liquidation' | 'manual'
  referenceId?: string;
  debit: number;
  credit: number;
  description?: string;
  documentNumber?: string;
  movementDate?: Date;
}

export interface AccountSummary {
  clientId: string;
  clientName: string;
  currentBalance: number;
  creditLimit?: number;
  totalDebit: number;
  totalCredit: number;
  overdueAmount: number;
  recentMovements: Array<{
    id: string;
    movementDate: Date;
    movementType: string;
    debit: number;
    credit: number;
    balanceAfter: number;
    description?: string;
    documentNumber?: string;
  }>;
}

export interface AccountStatement {
  clientId: string;
  clientName: string;
  from: Date;
  to: Date;
  openingBalance: number;
  closingBalance: number;
  movements: Array<{
    id: string;
    movementDate: Date;
    movementType: string;
    referenceType?: string;
    referenceId?: string;
    debit: number;
    credit: number;
    balanceAfter: number;
    description?: string;
    documentNumber?: string;
  }>;
}

export interface RegisterPaymentDto {
  amount: number;
  description?: string;
  documentNumber?: string;
  movementDate?: string;
}

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly prisma = new PrismaClient();

  async getBalance(clientId: string, tenantId: string): Promise<AccountSummary> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: {
        id: true,
        name: true,
        currentAccount: true,
        creditLimit: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} no encontrado`);
    }

    // Get recent movements (last 10)
    const recentMovements = await this.prisma.accountMovement.findMany({
      where: { clientId, tenantId },
      orderBy: { movementDate: 'desc' },
      take: 10,
    });

    // Compute total debit/credit
    const aggregates = await this.prisma.accountMovement.aggregate({
      where: { clientId, tenantId },
      _sum: { debit: true, credit: true },
    });

    return {
      clientId,
      clientName: client.name,
      currentBalance: Number(client.currentAccount),
      creditLimit: client.creditLimit ? Number(client.creditLimit) : undefined,
      totalDebit: Number(aggregates._sum.debit) ?? 0,
      totalCredit: Number(aggregates._sum.credit) ?? 0,
      overdueAmount: 0, // TODO: compute from overdue invoices
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        movementDate: m.movementDate,
        movementType: m.movementType,
        debit: Number(m.debit),
        credit: Number(m.credit),
        balanceAfter: Number(m.balanceAfter),
        description: m.description ?? undefined,
        documentNumber: m.documentNumber ?? undefined,
      })),
    };
  }

  async registerMovement(
    data: AccountMovementDto,
    userId: string,
    tenantId: string,
  ) {
    // Validate client
    const client = await this.prisma.client.findFirst({
      where: { id: data.clientId, tenantId },
      select: { id: true, currentAccount: true, creditLimit: true },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${data.clientId} no encontrado`);
    }

    const currentBalance = Number(client.currentAccount);
    const net = data.credit - data.debit; // positive = credit (we owe client), negative = debit (client owes us)
    const balanceAfter = currentBalance + net;

    // Check credit limit if it's a debit movement
    if (data.debit > 0 && client.creditLimit) {
      const limit = Number(client.creditLimit);
      if (balanceAfter < -limit) {
        throw new BadRequestException(
          `El movimiento supera el límite de crédito del cliente (límite: ${limit})`,
        );
      }
    }

    // Use a transaction to keep balance consistent
    const [movement] = await this.prisma.$transaction([
      this.prisma.accountMovement.create({
        data: {
          clientId: data.clientId,
          movementType: data.movementType,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          debit: data.debit,
          credit: data.credit,
          balanceAfter,
          currency: 'ARS',
          description: data.description,
          documentNumber: data.documentNumber,
          movementDate: data.movementDate ?? new Date(),
          userId,
          tenantId,
        },
      }),
      this.prisma.client.update({
        where: { id: data.clientId },
        data: { currentAccount: balanceAfter },
      }),
    ]);

    this.logger.log(
      `Movimiento ${data.movementType} registrado para cliente ${data.clientId}: ` +
        `débito=${data.debit}, crédito=${data.credit}, saldo=${balanceAfter}`,
    );

    return movement;
  }

  async getStatement(
    clientId: string,
    from: Date,
    to: Date,
    tenantId: string,
  ): Promise<AccountStatement> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId },
      select: { id: true, name: true },
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} no encontrado`);
    }

    // Opening balance: last movement before 'from'
    const lastBefore = await this.prisma.accountMovement.findFirst({
      where: {
        clientId,
        tenantId,
        movementDate: { lt: from },
      },
      orderBy: { movementDate: 'desc' },
    });

    const openingBalance = lastBefore ? Number(lastBefore.balanceAfter) : 0;

    // Movements within range
    const movements = await this.prisma.accountMovement.findMany({
      where: {
        clientId,
        tenantId,
        movementDate: { gte: from, lte: to },
      },
      orderBy: { movementDate: 'asc' },
    });

    const closingBalance =
      movements.length > 0
        ? Number(movements[movements.length - 1].balanceAfter)
        : openingBalance;

    return {
      clientId,
      clientName: client.name,
      from,
      to,
      openingBalance,
      closingBalance,
      movements: movements.map((m) => ({
        id: m.id,
        movementDate: m.movementDate,
        movementType: m.movementType,
        referenceType: m.referenceType ?? undefined,
        referenceId: m.referenceId?.toString() ?? undefined,
        debit: Number(m.debit),
        credit: Number(m.credit),
        balanceAfter: Number(m.balanceAfter),
        description: m.description ?? undefined,
        documentNumber: m.documentNumber ?? undefined,
      })),
    };
  }

  async registerPayment(
    clientId: string,
    dto: RegisterPaymentDto,
    userId: string,
    tenantId: string,
  ) {
    return this.registerMovement(
      {
        clientId,
        movementType: 'pago',
        referenceType: 'manual',
        debit: 0,
        credit: dto.amount,
        description: dto.description ?? 'Pago recibido',
        documentNumber: dto.documentNumber,
        movementDate: dto.movementDate ? new Date(dto.movementDate) : new Date(),
      },
      userId,
      tenantId,
    );
  }
}
