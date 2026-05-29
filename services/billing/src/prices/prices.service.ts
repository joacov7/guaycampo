import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreatePriceDto, UpdatePriceDto } from './dto/create-price.dto';

export interface PriceFilters {
  commodityId?: string;
  condition?: string;
  isActive?: boolean;
}

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private readonly prisma = new PrismaClient();

  async create(dto: CreatePriceDto, userId: string, tenantId: string) {
    // Validate commodity exists
    const commodity = await this.prisma.commodity.findFirst({
      where: { id: dto.commodityId },
    });
    if (!commodity) {
      throw new NotFoundException(`Commodity ${dto.commodityId} no encontrado`);
    }

    // Deactivate any existing active price for same commodity + condition
    await this.prisma.$executeRawUnsafe(
      `UPDATE price_lists
       SET is_active = FALSE, updated_at = NOW()
       WHERE commodity_id = $1
         AND condition = $2
         AND tenant_id = $3
         AND is_active = TRUE`,
      dto.commodityId,
      dto.condition,
      tenantId,
    );

    // Create new price list entry
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      id: string;
      commodity_id: string;
      condition: string;
      price_per_ton: string;
      currency: string;
      valid_from: Date;
      valid_until: Date | null;
      delivery_months: string | null;
      is_active: boolean;
      notes: string | null;
      tenant_id: string;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    }>>(
      `INSERT INTO price_lists
         (commodity_id, condition, price_per_ton, currency, valid_from, valid_until, delivery_months, is_active, notes, tenant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10)
       RETURNING *`,
      dto.commodityId,
      dto.condition,
      dto.pricePerTon,
      dto.currency,
      new Date(dto.validFrom),
      dto.validUntil ? new Date(dto.validUntil) : null,
      dto.deliveryMonths ?? null,
      dto.notes ?? null,
      tenantId,
      userId,
    );

    const priceList = rows[0];

    // Insert history record
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO price_history
         (price_list_id, commodity_id, condition, price_per_ton, currency, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      priceList.id,
      dto.commodityId,
      dto.condition,
      dto.pricePerTon,
      dto.currency,
      tenantId,
    );

    this.logger.log(
      `Precio ${dto.condition} creado para commodity ${commodity.name}: ${dto.pricePerTon} ${dto.currency}/tn`,
    );

    return this.enrichWithCommodity(priceList, commodity);
  }

  async update(id: string, dto: UpdatePriceDto, tenantId: string) {
    const existing = await this.findOneRaw(id, tenantId);

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (dto.pricePerTon !== undefined) {
      setClauses.push(`price_per_ton = $${paramIndex++}`);
      values.push(dto.pricePerTon);
    }
    if (dto.validUntil !== undefined) {
      setClauses.push(`valid_until = $${paramIndex++}`);
      values.push(new Date(dto.validUntil));
    }
    if (dto.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex++}`);
      values.push(dto.notes);
    }
    if (dto.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(dto.isActive);
    }

    values.push(id);
    values.push(tenantId);

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `UPDATE price_lists
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
       RETURNING *`,
      ...values,
    );

    const updated = rows[0] as {
      id: string;
      commodity_id: string;
      condition: string;
      price_per_ton: string;
      currency: string;
      valid_from: Date;
      valid_until: Date | null;
      delivery_months: string | null;
      is_active: boolean;
      notes: string | null;
      tenant_id: string;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    };

    // Insert history if price changed
    if (dto.pricePerTon !== undefined && dto.pricePerTon !== Number(existing.price_per_ton)) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO price_history
           (price_list_id, commodity_id, condition, price_per_ton, currency, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        id,
        existing.commodity_id,
        existing.condition,
        dto.pricePerTon,
        existing.currency,
        tenantId,
      );
    }

    const commodity = await this.prisma.commodity.findFirst({
      where: { id: updated.commodity_id as string },
    });

    return this.enrichWithCommodity(updated, commodity);
  }

  async deactivate(id: string, tenantId: string) {
    await this.findOneRaw(id, tenantId);

    await this.prisma.$executeRawUnsafe(
      `UPDATE price_lists SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      id,
      tenantId,
    );

    this.logger.log(`Precio ${id} desactivado`);
    return { id, isActive: false };
  }

  async findAll(tenantId: string, filters: PriceFilters = {}) {
    const conditions: string[] = ['pl.tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.commodityId) {
      conditions.push(`pl.commodity_id = $${paramIndex++}`);
      values.push(filters.commodityId);
    }
    if (filters.condition) {
      conditions.push(`pl.condition = $${paramIndex++}`);
      values.push(filters.condition);
    }
    if (filters.isActive !== undefined) {
      conditions.push(`pl.is_active = $${paramIndex++}`);
      values.push(filters.isActive);
    }

    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT pl.*, c.name AS commodity_name, c.code AS commodity_code
       FROM price_lists pl
       JOIN commodities c ON c.id = pl.commodity_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.name ASC, pl.condition ASC, pl.created_at DESC`,
      ...values,
    );

    return rows.map((r) => this.mapRow(r));
  }

  async findCurrent(tenantId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT pl.*, c.name AS commodity_name, c.code AS commodity_code
       FROM price_lists pl
       JOIN commodities c ON c.id = pl.commodity_id
       WHERE pl.tenant_id = $1
         AND pl.is_active = TRUE
         AND (pl.valid_until IS NULL OR pl.valid_until >= CURRENT_DATE)
       ORDER BY c.name ASC, pl.condition ASC`,
      tenantId,
    );

    // Group by commodity
    const grouped: Record<string, {
      commodityId: string;
      commodityName: string;
      commodityCode: string;
      prices: ReturnType<typeof this.mapRow>[];
    }> = {};

    for (const row of rows) {
      const mapped = this.mapRow(row);
      const key = mapped.commodityId;
      if (!grouped[key]) {
        grouped[key] = {
          commodityId: mapped.commodityId,
          commodityName: mapped.commodityName,
          commodityCode: mapped.commodityCode ?? '',
          prices: [],
        };
      }
      grouped[key].prices.push(mapped);
    }

    return Object.values(grouped);
  }

  async findHistory(tenantId: string, commodityId: string, days = 30) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ph.*, c.name AS commodity_name
       FROM price_history ph
       JOIN commodities c ON c.id = ph.commodity_id
       WHERE ph.tenant_id = $1
         AND ph.commodity_id = $2
         AND ph.recorded_at >= NOW() - ($3 * INTERVAL '1 day')
       ORDER BY ph.recorded_at ASC`,
      tenantId,
      commodityId,
      days,
    );

    return rows.map((r) => ({
      id: String(r['id']),
      priceListId: String(r['price_list_id']),
      commodityId: String(r['commodity_id']),
      commodityName: String(r['commodity_name']),
      condition: String(r['condition']),
      pricePerTon: Number(r['price_per_ton']),
      currency: String(r['currency']),
      recordedAt: r['recorded_at'] as Date,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const raw = await this.findOneRaw(id, tenantId);
    const commodity = await this.prisma.commodity.findFirst({
      where: { id: raw.commodity_id as string },
    });

    const history = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM price_history
       WHERE price_list_id = $1
       ORDER BY recorded_at DESC
       LIMIT 50`,
      id,
    );

    return {
      ...this.enrichWithCommodity(raw, commodity),
      history: history.map((h) => ({
        id: String(h['id']),
        pricePerTon: Number(h['price_per_ton']),
        currency: String(h['currency']),
        condition: String(h['condition']),
        recordedAt: h['recorded_at'] as Date,
      })),
    };
  }

  async getMarketSummary(tenantId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT pl.condition, pl.price_per_ton, pl.currency, pl.valid_from,
              c.name AS commodity_name, c.code AS commodity_code, c.id AS commodity_id
       FROM price_lists pl
       JOIN commodities c ON c.id = pl.commodity_id
       WHERE pl.tenant_id = $1
         AND pl.is_active = TRUE
         AND (pl.valid_until IS NULL OR pl.valid_until >= CURRENT_DATE)
       ORDER BY c.name ASC, pl.condition ASC`,
      tenantId,
    );

    return rows.map((r) => ({
      commodityId: String(r['commodity_id']),
      commodityName: String(r['commodity_name']),
      commodityCode: r['commodity_code'] ? String(r['commodity_code']) : null,
      condition: String(r['condition']),
      pricePerTon: Number(r['price_per_ton']),
      currency: String(r['currency']),
      validFrom: r['valid_from'] as Date,
    }));
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private async findOneRaw(id: string, tenantId: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM price_lists WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      id,
      tenantId,
    );
    if (!rows.length) {
      throw new NotFoundException(`Precio ${id} no encontrado`);
    }
    return rows[0] as {
      id: string;
      commodity_id: string;
      condition: string;
      price_per_ton: string;
      currency: string;
      valid_from: Date;
      valid_until: Date | null;
      delivery_months: string | null;
      is_active: boolean;
      notes: string | null;
      tenant_id: string;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
    };
  }

  private mapRow(r: Record<string, unknown>) {
    return {
      id: String(r['id']),
      commodityId: String(r['commodity_id']),
      commodityName: r['commodity_name'] ? String(r['commodity_name']) : '',
      commodityCode: r['commodity_code'] ? String(r['commodity_code']) : null,
      condition: String(r['condition']),
      pricePerTon: Number(r['price_per_ton']),
      currency: String(r['currency']),
      validFrom: r['valid_from'] as Date,
      validUntil: r['valid_until'] ? (r['valid_until'] as Date) : null,
      deliveryMonths: r['delivery_months'] ? String(r['delivery_months']) : null,
      isActive: Boolean(r['is_active']),
      notes: r['notes'] ? String(r['notes']) : null,
      tenantId: String(r['tenant_id']),
      createdBy: r['created_by'] ? String(r['created_by']) : null,
      createdAt: r['created_at'] as Date,
      updatedAt: r['updated_at'] as Date,
    };
  }

  private enrichWithCommodity(
    row: Record<string, unknown>,
    commodity: { id: string; name: string; code?: string | null } | null,
  ) {
    return {
      ...this.mapRow({
        ...row,
        commodity_name: commodity?.name ?? '',
        commodity_code: commodity?.code ?? null,
      }),
    };
  }
}
