// =============================================================================
// QualityParamsService — gestión de parámetros de calidad por cultivo
// Combina parámetros almacenados en DB (por tenant) con defaults SENASA
// =============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@guaycampo/database';
import type { QualityParameter, DefaultQualityParams } from './quality.types';

// ---------------------------------------------------------------------------
// Parámetros default según normas argentinas SENASA/SAGPyA
// Se usan como fallback cuando el tenant no tiene configuración propia
// ---------------------------------------------------------------------------
const DEFAULT_PARAMS: DefaultQualityParams = {
  SOJ: [
    {
      parameter: 'humidity',
      label: 'Humedad',
      unit: '%',
      baseValue: 13.0,
      toleranceMinus: 1.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.005,
      discountPerUnit: 0.01,
      maxBonus: 0.01,
      maxDiscount: 0.03,
      rejectAbove: 15.5,
      normReference: 'SAGPyA Res. 289/2003',
    },
    {
      parameter: 'protein',
      label: 'Proteína',
      unit: '%',
      baseValue: 34.0,
      toleranceMinus: 1.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.005,
      discountPerUnit: 0.003,
      maxBonus: 0.03,
      maxDiscount: 0.01,
      normReference: 'SAGPyA Res. 289/2003',
    },
    {
      parameter: 'oil',
      label: 'Aceite / Materia Grasa',
      unit: '%',
      baseValue: 18.0,
      toleranceMinus: 1.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.003,
      discountPerUnit: 0.002,
      maxBonus: 0.02,
      maxDiscount: 0.01,
      normReference: 'SAGPyA Res. 289/2003',
    },
    {
      parameter: 'foreignMatter',
      label: 'Materias Extrañas',
      unit: '%',
      baseValue: 1.0,
      toleranceMinus: 0.0,
      tolerancePlus: 2.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.005,
      maxBonus: 0.0,
      maxDiscount: 0.03,
      rejectAbove: 5.0,
      normReference: 'SAGPyA Res. 289/2003',
    },
    {
      parameter: 'damagedGrains',
      label: 'Granos Dañados',
      unit: '%',
      baseValue: 3.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.005,
      maxBonus: 0.0,
      maxDiscount: 0.05,
      rejectAbove: 10.0,
      normReference: 'SAGPyA Res. 289/2003',
    },
    {
      parameter: 'brokenGrains',
      label: 'Granos Quebrados',
      unit: '%',
      baseValue: 5.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.004,
      maxBonus: 0.0,
      maxDiscount: 0.04,
      rejectAbove: 10.0,
      normReference: 'SAGPyA Res. 289/2003',
    },
  ],
  TRI: [
    {
      parameter: 'humidity',
      label: 'Humedad',
      unit: '%',
      baseValue: 14.0,
      toleranceMinus: 1.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.005,
      discountPerUnit: 0.013,
      maxBonus: 0.01,
      maxDiscount: 0.04,
      rejectAbove: 16.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'gluten',
      label: 'Gluten Húmedo',
      unit: '%',
      baseValue: 26.0,
      toleranceMinus: 2.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.004,
      discountPerUnit: 0.003,
      maxBonus: 0.03,
      maxDiscount: 0.02,
      rejectBelow: 18.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'fallingNumber',
      label: 'Número de Caída (Falling Number)',
      unit: 'seg',
      baseValue: 300,
      toleranceMinus: 50,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.0,
      maxBonus: 0.0,
      maxDiscount: 0.0,
      rejectBelow: 200,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'testWeight',
      label: 'Peso Hectolítrico',
      unit: 'kg/hl',
      baseValue: 79.0,
      toleranceMinus: 3.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.003,
      discountPerUnit: 0.002,
      maxBonus: 0.02,
      maxDiscount: 0.015,
      rejectBelow: 72.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'damagedGrains',
      label: 'Granos Dañados/Ardidos',
      unit: '%',
      baseValue: 0.5,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.01,
      maxBonus: 0.0,
      maxDiscount: 0.08,
      rejectAbove: 5.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'foreignMatter',
      label: 'Materias Extrañas',
      unit: '%',
      baseValue: 1.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.005,
      maxBonus: 0.0,
      maxDiscount: 0.03,
      rejectAbove: 4.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'burntGrains',
      label: 'Granos Ardidos',
      unit: '%',
      baseValue: 0.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.5,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.0,
      maxBonus: 0.0,
      maxDiscount: 0.0,
      rejectAbove: 0.5,
      normReference: 'SAGPyA Res. 1262/2004',
    },
  ],
  MAI: [
    {
      parameter: 'humidity',
      label: 'Humedad',
      unit: '%',
      baseValue: 14.5,
      toleranceMinus: 1.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.005,
      discountPerUnit: 0.01,
      maxBonus: 0.01,
      maxDiscount: 0.04,
      rejectAbove: 18.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'foreignMatter',
      label: 'Materias Extrañas',
      unit: '%',
      baseValue: 2.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.005,
      maxBonus: 0.0,
      maxDiscount: 0.03,
      rejectAbove: 6.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'burntGrains',
      label: 'Granos Ardidos',
      unit: '%',
      baseValue: 0.5,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.01,
      maxBonus: 0.0,
      maxDiscount: 0.1,
      rejectAbove: 2.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
    {
      parameter: 'damagedGrains',
      label: 'Granos Dañados',
      unit: '%',
      baseValue: 2.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.005,
      maxBonus: 0.0,
      maxDiscount: 0.04,
      rejectAbove: 6.0,
      normReference: 'SAGPyA Res. 1262/2004',
    },
  ],
  GIR: [
    {
      parameter: 'humidity',
      label: 'Humedad',
      unit: '%',
      baseValue: 9.0,
      toleranceMinus: 1.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.005,
      discountPerUnit: 0.005,
      maxBonus: 0.01,
      maxDiscount: 0.04,
      rejectAbove: 14.0,
      normReference: 'SAGPyA Res. Girasol',
    },
    {
      parameter: 'oil',
      label: 'Materia Grasa',
      unit: '%',
      baseValue: 44.0,
      toleranceMinus: 2.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.005,
      discountPerUnit: 0.003,
      maxBonus: 0.03,
      maxDiscount: 0.01,
      normReference: 'SAGPyA Res. Girasol',
    },
    {
      parameter: 'foreignMatter',
      label: 'Impurezas',
      unit: '%',
      baseValue: 2.0,
      toleranceMinus: 0.0,
      tolerancePlus: 0.0,
      bonusPerUnit: 0.0,
      discountPerUnit: 0.005,
      maxBonus: 0.0,
      maxDiscount: 0.03,
      rejectAbove: 8.0,
      normReference: 'SAGPyA Res. Girasol',
    },
  ],
};

@Injectable()
export class QualityParamsService {
  private readonly logger = new Logger(QualityParamsService.name);

  // -------------------------------------------------------------------------
  // Obtener parámetros para un cultivo — DB primero, fallback a defaults
  // -------------------------------------------------------------------------
  async getForCommodity(
    commodityCode: string,
    tenantId: string,
  ): Promise<QualityParameter[]> {
    try {
      const commodity = await prisma.commodity.findFirst({
        where: { code: commodityCode, tenantId },
      });

      if (!commodity) {
        this.logger.warn(
          `Commodity ${commodityCode} not found for tenant ${tenantId}, using defaults`,
        );
        return this.getDefaults(commodityCode);
      }

      // Intentar cargar parámetros custom desde la tabla quality_parameters
      // Si la tabla no existe aún usamos los defaults embedded
      const dbParams = await this.loadFromDb(commodity.id, tenantId);
      if (dbParams.length > 0) {
        return dbParams;
      }

      // Fallback a defaults hardcoded
      return this.getDefaults(commodityCode, commodity.id, tenantId);
    } catch (err) {
      this.logger.warn(
        `Error loading quality params: ${(err as Error).message}. Using defaults.`,
      );
      return this.getDefaults(commodityCode);
    }
  }

  // -------------------------------------------------------------------------
  // CRUD operations (requieren tabla quality_parameters en DB)
  // -------------------------------------------------------------------------

  async listForTenant(tenantId: string): Promise<QualityParameter[]> {
    return this.loadFromDb(undefined, tenantId);
  }

  async getById(id: string, tenantId: string): Promise<QualityParameter> {
    const raw = await this.queryDb(
      `SELECT * FROM quality_parameters WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (!raw.length) throw new NotFoundException(`Quality parameter ${id} not found`);
    return this.mapRow(raw[0] as DbRow);
  }

  async create(data: CreateQualityParamData, tenantId: string): Promise<QualityParameter> {
    const result = await this.queryDb(
      `INSERT INTO quality_parameters
        (commodity_id, parameter_name, base_value, tolerance_low, tolerance_high,
         bonus_rate, discount_rate, max_bonus, max_discount,
         reject_below, reject_above, unit, norm_reference, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        data.commodityId,
        data.parameter,
        data.baseValue,
        data.toleranceMinus ?? null,
        data.tolerancePlus ?? null,
        data.bonusPerUnit ?? null,
        data.discountPerUnit ?? null,
        data.maxBonus ?? null,
        data.maxDiscount ?? null,
        data.rejectBelow ?? null,
        data.rejectAbove ?? null,
        data.unit,
        data.normReference ?? null,
        tenantId,
      ],
    );
    return this.mapRow(result[0] as DbRow);
  }

  async update(
    id: string,
    data: Partial<CreateQualityParamData>,
    tenantId: string,
  ): Promise<QualityParameter> {
    await this.getById(id, tenantId); // Verificar existencia

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      baseValue: 'base_value',
      toleranceMinus: 'tolerance_low',
      tolerancePlus: 'tolerance_high',
      bonusPerUnit: 'bonus_rate',
      discountPerUnit: 'discount_rate',
      maxBonus: 'max_bonus',
      maxDiscount: 'max_discount',
      rejectBelow: 'reject_below',
      rejectAbove: 'reject_above',
      unit: 'unit',
      normReference: 'norm_reference',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (data as Record<string, unknown>)[key];
      if (val !== undefined) {
        sets.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (!sets.length) return this.getById(id, tenantId);

    values.push(id, tenantId);
    const result = await this.queryDb(
      `UPDATE quality_parameters SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
      values,
    );
    return this.mapRow(result[0] as DbRow);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.getById(id, tenantId);
    await this.queryDb(
      `DELETE FROM quality_parameters WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
  }

  async resetToDefaults(commodityCode: string, tenantId: string): Promise<QualityParameter[]> {
    const commodity = await prisma.commodity.findFirst({
      where: { code: commodityCode, tenantId },
    });
    if (!commodity) throw new NotFoundException(`Commodity ${commodityCode} not found`);

    // Borrar parámetros custom del tenant para este cultivo
    await this.queryDb(
      `DELETE FROM quality_parameters WHERE commodity_id = $1 AND tenant_id = $2`,
      [commodity.id, tenantId],
    );

    // Insertar defaults
    const defaults = DEFAULT_PARAMS[commodityCode] ?? [];
    for (const p of defaults) {
      try {
        await this.create({ ...p, commodityId: commodity.id }, tenantId);
      } catch (_err) {
        // Ignorar conflictos
      }
    }

    return this.loadFromDb(commodity.id, tenantId);
  }

  // -------------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------------

  private async loadFromDb(
    commodityId: string | undefined,
    tenantId: string,
  ): Promise<QualityParameter[]> {
    const query = commodityId
      ? `SELECT qp.*, c.code AS commodity_code
         FROM quality_parameters qp
         JOIN commodities c ON c.id = qp.commodity_id
         WHERE qp.commodity_id = $1 AND qp.tenant_id = $2
         ORDER BY qp.parameter_name`
      : `SELECT qp.*, c.code AS commodity_code
         FROM quality_parameters qp
         JOIN commodities c ON c.id = qp.commodity_id
         WHERE qp.tenant_id = $1
         ORDER BY c.code, qp.parameter_name`;

    const rows = await this.queryDb(query, commodityId ? [commodityId, tenantId] : [tenantId]);
    return (rows as DbRow[]).map((r) => this.mapRow(r));
  }

  private getDefaults(
    commodityCode: string,
    commodityId = 'default',
    tenantId = 'default',
  ): QualityParameter[] {
    const params = DEFAULT_PARAMS[commodityCode] ?? [];
    return params.map((p, idx) => ({
      ...p,
      id: `default-${commodityCode}-${idx}`,
      commodityId,
      commodityCode,
      tenantId,
    }));
  }

  private async queryDb(sql: string, params: unknown[]): Promise<unknown[]> {
    // Ejecutar SQL raw via Prisma $queryRawUnsafe
    try {
      const result = await prisma.$queryRawUnsafe<unknown[]>(sql, ...params);
      return result;
    } catch (err) {
      this.logger.debug(`Raw query failed: ${(err as Error).message}`);
      return [];
    }
  }

  private mapRow(row: DbRow): QualityParameter {
    return {
      id: String(row.id),
      commodityId: String(row.commodity_id),
      commodityCode: String(row.commodity_code ?? ''),
      parameter: String(row.parameter_name),
      label: this.labelForParameter(String(row.parameter_name)),
      unit: String(row.unit ?? '%'),
      baseValue: Number(row.base_value),
      toleranceMinus: row.tolerance_low != null ? Number(row.tolerance_low) : undefined,
      tolerancePlus: row.tolerance_high != null ? Number(row.tolerance_high) : undefined,
      bonusPerUnit: row.bonus_rate != null ? Number(row.bonus_rate) : undefined,
      discountPerUnit: row.discount_rate != null ? Number(row.discount_rate) : undefined,
      maxBonus: row.max_bonus != null ? Number(row.max_bonus) : undefined,
      maxDiscount: row.max_discount != null ? Number(row.max_discount) : undefined,
      rejectBelow: row.reject_below != null ? Number(row.reject_below) : undefined,
      rejectAbove: row.reject_above != null ? Number(row.reject_above) : undefined,
      normReference: row.norm_reference ? String(row.norm_reference) : undefined,
      tenantId: String(row.tenant_id),
    };
  }

  private labelForParameter(paramName: string): string {
    const labels: Record<string, string> = {
      humedad: 'Humedad',
      humidity: 'Humedad',
      proteina: 'Proteína',
      protein: 'Proteína',
      aceite: 'Aceite / Materia Grasa',
      oil: 'Aceite / Materia Grasa',
      gluten_humedo: 'Gluten Húmedo',
      gluten: 'Gluten Húmedo',
      falling_number: 'Número de Caída',
      fallingNumber: 'Número de Caída',
      peso_hectolitrico: 'Peso Hectolítrico',
      testWeight: 'Peso Hectolítrico',
      materias_extranas: 'Materias Extrañas',
      foreignMatter: 'Materias Extrañas',
      granos_daniados: 'Granos Dañados',
      damagedGrains: 'Granos Dañados',
      granos_ardidos: 'Granos Ardidos',
      burntGrains: 'Granos Ardidos',
      granos_quebrados: 'Granos Quebrados',
      brokenGrains: 'Granos Quebrados',
    };
    return labels[paramName] ?? paramName;
  }
}

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

interface DbRow {
  id: unknown;
  commodity_id: unknown;
  commodity_code?: unknown;
  parameter_name: unknown;
  base_value: unknown;
  tolerance_low?: unknown;
  tolerance_high?: unknown;
  bonus_rate?: unknown;
  discount_rate?: unknown;
  max_bonus?: unknown;
  max_discount?: unknown;
  reject_below?: unknown;
  reject_above?: unknown;
  unit?: unknown;
  norm_reference?: unknown;
  tenant_id: unknown;
}

export interface CreateQualityParamData {
  commodityId: string;
  parameter: string;
  label?: string;
  unit: string;
  baseValue: number;
  toleranceMinus?: number;
  tolerancePlus?: number;
  bonusPerUnit?: number;
  discountPerUnit?: number;
  maxBonus?: number;
  maxDiscount?: number;
  rejectBelow?: number;
  rejectAbove?: number;
  normReference?: string;
}
