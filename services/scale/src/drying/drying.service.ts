// =============================================================================
// GuayCampo - Drying Service
// Manages grain drying batches and dryer equipment.
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { CreateDryingBatchDto, FinishDryingBatchDto, CreateDryerDto } from './dto/create-drying-batch.dto';

// ---------------------------------------------------------------------------
// Raw-row types (returned from $queryRawUnsafe)
// ---------------------------------------------------------------------------

export interface DryerRow {
  id: string;
  name: string;
  code: string;
  capacity_ton_h: number | null;
  fuel_type: string;
  status: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface DryingBatchRow {
  id: string;
  batch_number: string;
  dryer_id: string | null;
  scale_ticket_id: string | null;
  client_id: string;
  commodity_id: string;
  input_weight_kg: number;
  output_weight_kg: number | null;
  input_humidity_pct: number;
  output_humidity_pct: number | null;
  target_humidity_pct: number;
  shrinkage_pct: number | null;
  cost_per_ton: number | null;
  total_cost: number | null;
  started_at: Date;
  finished_at: Date | null;
  status: string;
  notes: string | null;
  operator_id: string | null;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  // joins
  client_name?: string;
  commodity_name?: string;
  dryer_name?: string;
}

export interface DryingStats {
  batchesToday: number;
  avgShrinkagePct: number | null;
  totalKgProcessed30d: number;
  activeBatches: number;
}

@Injectable()
export class DryingService {
  private readonly logger = new Logger(DryingService.name);

  // ---------------------------------------------------------------------------
  // Dryers
  // ---------------------------------------------------------------------------

  async getDryers(tenantId: string): Promise<DryerRow[]> {
    const rows = await prisma.$queryRawUnsafe<DryerRow[]>(
      `SELECT * FROM dryers WHERE tenant_id = $1 AND status = 'active' ORDER BY name`,
      tenantId,
    );
    return rows;
  }

  async createDryer(dto: CreateDryerDto, tenantId: string): Promise<DryerRow> {
    const rows = await prisma.$queryRawUnsafe<DryerRow[]>(
      `INSERT INTO dryers (name, code, capacity_ton_h, fuel_type, tenant_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      dto.name,
      dto.code,
      dto.capacityTonH ?? null,
      dto.fuelType ?? 'gas',
      tenantId,
    );
    const row = rows[0];
    if (!row) throw new BadRequestException('Failed to create dryer');
    this.logger.log(`Dryer created: ${dto.name} (${dto.code}) for tenant ${tenantId}`);
    return row;
  }

  // ---------------------------------------------------------------------------
  // Batches — create
  // ---------------------------------------------------------------------------

  async createBatch(
    dto: CreateDryingBatchDto,
    operatorId: string,
    tenantId: string,
  ): Promise<DryingBatchRow> {
    const batchNumber = await this.generateBatchNumber(tenantId);

    const rows = await prisma.$queryRawUnsafe<DryingBatchRow[]>(
      `INSERT INTO drying_batches (
         batch_number, dryer_id, scale_ticket_id, client_id, commodity_id,
         input_weight_kg, input_humidity_pct, target_humidity_pct,
         cost_per_ton, notes, operator_id, tenant_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      batchNumber,
      dto.dryerId ?? null,
      dto.scaleTicketId ?? null,
      dto.clientId,
      dto.commodityId,
      dto.inputWeightKg,
      dto.inputHumidityPct,
      dto.targetHumidityPct ?? 14.0,
      dto.costPerTon ?? null,
      dto.notes ?? null,
      operatorId,
      tenantId,
    );

    const row = rows[0];
    if (!row) throw new BadRequestException('Failed to create drying batch');
    this.logger.log(`Drying batch created: ${batchNumber} for tenant ${tenantId}`);
    return row;
  }

  // ---------------------------------------------------------------------------
  // Batches — finish
  // ---------------------------------------------------------------------------

  async finishBatch(
    id: string,
    dto: FinishDryingBatchDto,
    tenantId: string,
  ): Promise<DryingBatchRow> {
    const batch = await this.findOneRaw(id, tenantId);

    if (batch.status !== 'en_proceso') {
      throw new BadRequestException(
        `Batch is in status "${batch.status}", expected "en_proceso"`,
      );
    }

    const costPerTon = dto.costPerTon ?? (batch.cost_per_ton ? Number(batch.cost_per_ton) : null);
    const totalCost =
      costPerTon != null
        ? parseFloat(((Number(batch.input_weight_kg) / 1000) * costPerTon).toFixed(2))
        : null;

    const rows = await prisma.$queryRawUnsafe<DryingBatchRow[]>(
      `UPDATE drying_batches
       SET output_weight_kg = $1,
           output_humidity_pct = $2,
           cost_per_ton = COALESCE($3, cost_per_ton),
           total_cost = $4,
           finished_at = NOW(),
           status = 'completado',
           updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      dto.outputWeightKg,
      dto.outputHumidityPct,
      dto.costPerTon ?? null,
      totalCost,
      id,
      tenantId,
    );

    const row = rows[0];
    if (!row) throw new NotFoundException(`Batch ${id} not found after update`);
    this.logger.log(`Drying batch finished: ${batch.batch_number}`);
    return row;
  }

  // ---------------------------------------------------------------------------
  // Batches — cancel
  // ---------------------------------------------------------------------------

  async cancelBatch(id: string, tenantId: string): Promise<DryingBatchRow> {
    const batch = await this.findOneRaw(id, tenantId);

    if (batch.status === 'completado' || batch.status === 'cancelado') {
      throw new BadRequestException(`Cannot cancel a batch in status "${batch.status}"`);
    }

    const rows = await prisma.$queryRawUnsafe<DryingBatchRow[]>(
      `UPDATE drying_batches
       SET status = 'cancelado', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      id,
      tenantId,
    );

    const row = rows[0];
    if (!row) throw new NotFoundException(`Batch ${id} not found after cancel`);
    this.logger.log(`Drying batch cancelled: ${batch.batch_number}`);
    return row;
  }

  // ---------------------------------------------------------------------------
  // Batches — findAll
  // ---------------------------------------------------------------------------

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      clientId?: string;
      commodityId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<DryingBatchRow[]> {
    const conditions: string[] = ['db.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters?.status) {
      conditions.push(`db.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters?.clientId) {
      conditions.push(`db.client_id = $${idx++}`);
      params.push(filters.clientId);
    }
    if (filters?.commodityId) {
      conditions.push(`db.commodity_id = $${idx++}`);
      params.push(filters.commodityId);
    }
    if (filters?.dateFrom) {
      conditions.push(`db.started_at >= $${idx++}`);
      params.push(new Date(filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(`db.started_at <= $${idx++}`);
      params.push(new Date(filters.dateTo));
    }

    const where = conditions.join(' AND ');

    const rows = await prisma.$queryRawUnsafe<DryingBatchRow[]>(
      `SELECT
         db.*,
         c.name  AS client_name,
         co.name AS commodity_name,
         d.name  AS dryer_name
       FROM drying_batches db
       LEFT JOIN clients    c  ON c.id  = db.client_id
       LEFT JOIN commodities co ON co.id = db.commodity_id
       LEFT JOIN dryers      d  ON d.id  = db.dryer_id
       WHERE ${where}
       ORDER BY db.started_at DESC`,
      ...params,
    );

    return rows;
  }

  // ---------------------------------------------------------------------------
  // Batches — findOne
  // ---------------------------------------------------------------------------

  async findOne(id: string, tenantId: string): Promise<DryingBatchRow> {
    const rows = await prisma.$queryRawUnsafe<DryingBatchRow[]>(
      `SELECT
         db.*,
         c.name  AS client_name,
         co.name AS commodity_name,
         d.name  AS dryer_name
       FROM drying_batches db
       LEFT JOIN clients    c  ON c.id  = db.client_id
       LEFT JOIN commodities co ON co.id = db.commodity_id
       LEFT JOIN dryers      d  ON d.id  = db.dryer_id
       WHERE db.id = $1 AND db.tenant_id = $2`,
      id,
      tenantId,
    );

    const row = rows[0];
    if (!row) throw new NotFoundException(`Drying batch ${id} not found`);
    return row;
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  async getStats(tenantId: string): Promise<DryingStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayRows, shrinkageRows, processedRows, activeRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT COUNT(*) AS count FROM drying_batches
         WHERE tenant_id = $1 AND started_at >= $2`,
        tenantId,
        todayStart,
      ),
      prisma.$queryRawUnsafe<Array<{ avg: string | null }>>(
        `SELECT AVG(shrinkage_pct) AS avg FROM drying_batches
         WHERE tenant_id = $1 AND status = 'completado' AND shrinkage_pct IS NOT NULL`,
        tenantId,
      ),
      prisma.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(input_weight_kg), 0) AS total FROM drying_batches
         WHERE tenant_id = $1
           AND started_at >= NOW() - INTERVAL '30 days'
           AND status IN ('completado', 'en_proceso')`,
        tenantId,
      ),
      prisma.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT COUNT(*) AS count FROM drying_batches
         WHERE tenant_id = $1 AND status = 'en_proceso'`,
        tenantId,
      ),
    ]);

    return {
      batchesToday: parseInt(todayRows[0]?.count ?? '0', 10),
      avgShrinkagePct: shrinkageRows[0]?.avg != null ? parseFloat(shrinkageRows[0].avg) : null,
      totalKgProcessed30d: parseFloat(processedRows[0]?.total ?? '0'),
      activeBatches: parseInt(activeRows[0]?.count ?? '0', 10),
    };
  }

  // ---------------------------------------------------------------------------
  // Batch number generation
  // ---------------------------------------------------------------------------

  private async generateBatchNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    const rows = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*) AS count FROM drying_batches
       WHERE tenant_id = $1 AND batch_number LIKE $2`,
      tenantId,
      `SEC-${dateStr}-%`,
    );

    const seq = parseInt(rows[0]?.count ?? '0', 10) + 1;
    return `SEC-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findOneRaw(id: string, tenantId: string): Promise<DryingBatchRow> {
    const rows = await prisma.$queryRawUnsafe<DryingBatchRow[]>(
      `SELECT * FROM drying_batches WHERE id = $1 AND tenant_id = $2`,
      id,
      tenantId,
    );
    const row = rows[0];
    if (!row) throw new NotFoundException(`Drying batch ${id} not found`);
    return row;
  }
}
