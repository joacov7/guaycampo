// =============================================================================
// QualityService — motor de cálculo de bonificaciones y descuentos SENASA
// Normas argentinas: SAGPyA Res. 289/2003 (Soja), 1262/2004 (Maíz/Trigo)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { QualityParamsService } from './quality-params.service';
import type {
  LabSampleInput,
  QualityParameter,
  AdjustmentLine,
  QualityCalculationResult,
  ParameterResult,
} from './quality.types';

@Injectable()
export class QualityService {
  private readonly logger = new Logger(QualityService.name);

  constructor(private readonly qualityParamsService: QualityParamsService) {}

  // ---------------------------------------------------------------------------
  // Método principal: calcular ajuste económico completo sobre una muestra
  // Retorna el porcentaje de ajuste total (fracción).
  // Positivo = bonificación. Negativo = descuento.
  // ---------------------------------------------------------------------------
  async calculateAdjustments(
    sample: LabSampleInput,
    commodityCode: string,
    tenantId: string,
  ): Promise<QualityCalculationResult> {
    const params = await this.qualityParamsService.getForCommodity(commodityCode, tenantId);

    const adjustments: AdjustmentLine[] = [];
    let totalAdjustmentPct = 0;
    let shouldReject = false;
    const rejectionReasons: string[] = [];

    // Evaluar cada parámetro
    for (const param of params) {
      const value = sample[param.parameter as keyof LabSampleInput] as number | undefined;
      if (value == null) continue;

      const result = this.evaluateParameter(param, value);

      if (result.isRejection) {
        shouldReject = true;
        if (result.rejectionReason) {
          rejectionReasons.push(result.rejectionReason);
        }
        // Después de rechazo no sumamos ajuste económico para este parámetro
        continue;
      }

      if (result.adjustment !== 0) {
        adjustments.push({
          parameter: param.parameter,
          parameterLabel: param.label,
          baseValue: param.baseValue,
          actualValue: value,
          deviation: value - param.baseValue,
          adjustment: result.adjustment,
          adjustmentType: result.adjustment > 0 ? 'bonus' : 'discount',
        });
        totalAdjustmentPct += result.adjustment;
      }
    }

    // Aplicar cap: si hay máximos definidos, aplicarlos al total
    // (Los máximos se aplican por parámetro dentro de evaluateParameter)

    // Calcular grado comercial argentino
    const grade = this.calculateGrade(sample, commodityCode, adjustments);

    // Determinar estado
    let status: 'aprobado' | 'condicionado' | 'rechazado';
    if (shouldReject) {
      status = 'rechazado';
    } else if (Math.abs(totalAdjustmentPct) > 0.05) {
      // más de 5% de ajuste
      status = 'condicionado';
    } else {
      status = 'aprobado';
    }

    const result: QualityCalculationResult = {
      adjustments,
      totalAdjustmentPct,
      grade,
      status,
      rejectionReasons,
      summary: this.buildSummaryText(adjustments, totalAdjustmentPct, rejectionReasons),
    };

    this.logger.debug(
      `Quality calc for ${commodityCode}: grade=${grade}, status=${status}, adj=${(totalAdjustmentPct * 100).toFixed(2)}%`,
    );

    return result;
  }

  // ---------------------------------------------------------------------------
  // Evaluar un único parámetro: rechazos + cálculo de ajuste
  // ---------------------------------------------------------------------------
  private evaluateParameter(param: QualityParameter, value: number): ParameterResult {
    // --- Verificar umbral de rechazo ---
    if (param.rejectAbove != null && value > param.rejectAbove) {
      return {
        isRejection: true,
        rejectionReason: `${param.label}: ${value}${param.unit} supera máximo de rechazo ${param.rejectAbove}${param.unit}`,
        adjustment: 0,
      };
    }
    if (param.rejectBelow != null && value < param.rejectBelow) {
      return {
        isRejection: true,
        rejectionReason: `${param.label}: ${value}${param.unit} no alcanza mínimo de rechazo ${param.rejectBelow}${param.unit}`,
        adjustment: 0,
      };
    }

    const deviation = value - param.baseValue;

    // --- Dentro de tolerancia → sin ajuste ---
    if (deviation >= 0) {
      // Valor mejor o igual que base en parámetros inversos (ej: humedad baja → no penalizar)
      // o mejor que base en parámetros directos (ej: proteína alta)
      const tol = param.tolerancePlus ?? 0;
      if (deviation <= tol) {
        return { isRejection: false, adjustment: 0 };
      }
    } else {
      // Valor por debajo de base
      const tol = param.toleranceMinus ?? 0;
      if (Math.abs(deviation) <= tol) {
        return { isRejection: false, adjustment: 0 };
      }
    }

    // --- Calcular ajuste ---
    let adjustment = 0;

    if (deviation > 0 && param.bonusPerUnit && param.bonusPerUnit > 0) {
      // Valor superior al base → bonificación
      const effectiveDeviation = deviation - (param.tolerancePlus ?? 0);
      if (effectiveDeviation > 0) {
        adjustment = effectiveDeviation * param.bonusPerUnit;
        // Aplicar cap de bonificación máxima
        if (param.maxBonus != null && adjustment > param.maxBonus) {
          adjustment = param.maxBonus;
        }
      }
    } else if (deviation < 0 && param.discountPerUnit && param.discountPerUnit > 0) {
      // Valor inferior al base → descuento
      const effectiveDeviation = deviation + (param.toleranceMinus ?? 0); // es negativo
      if (effectiveDeviation < 0) {
        adjustment = effectiveDeviation * param.discountPerUnit; // negativo * positivo = negativo
        // Aplicar cap de descuento máximo
        if (param.maxDiscount != null && Math.abs(adjustment) > param.maxDiscount) {
          adjustment = -param.maxDiscount;
        }
      }
    }

    return { isRejection: false, adjustment };
  }

  // ---------------------------------------------------------------------------
  // Grado comercial argentino según cultivo
  // ---------------------------------------------------------------------------
  private calculateGrade(
    sample: LabSampleInput,
    commodity: string,
    _adjustments: AdjustmentLine[],
  ): string {
    switch (commodity.toUpperCase()) {
      case 'SOJ':
        return this.gradeSoja(sample);
      case 'TRI':
        return this.gradeTrigo(sample);
      case 'MAI':
        return this.gradeMaiz(sample);
      case 'GIR':
        return this.gradeGirasol(sample);
      default:
        return 'S/C'; // sin clasificar
    }
  }

  /**
   * Grados comerciales de soja — Res. SAGPyA 289/2003
   * Grado 1: dañados ≤ 1%, extrañas ≤ 3%, quebrados ≤ 5%
   * Grado 2: dañados ≤ 3%, extrañas ≤ 5%, quebrados ≤ 8%
   * Grado 3: dañados ≤ 5%, extrañas ≤ 8%, quebrados ≤ 10%
   */
  private gradeSoja(sample: LabSampleInput): string {
    const damaged = sample.damagedGrains ?? 0;
    const foreign = sample.foreignMatter ?? 0;
    const broken = sample.brokenGrains ?? 0;

    if (damaged <= 1 && foreign <= 3 && broken <= 5) return 'Grado 1';
    if (damaged <= 3 && foreign <= 5 && broken <= 8) return 'Grado 2';
    if (damaged <= 5 && foreign <= 8 && broken <= 10) return 'Grado 3';
    return 'Fuera de Grado';
  }

  /**
   * Grados comerciales de trigo — Res. SAGPyA 1262/2004
   * Grado 1: gluten ≥ 26%, peso hect ≥ 76 kg/hl, FN ≥ 200 seg
   * Grado 2: gluten ≥ 22%, peso hect ≥ 73 kg/hl, FN ≥ 150 seg
   * Grado 3: gluten ≥ 18%, peso hect ≥ 69 kg/hl
   */
  private gradeTrigo(sample: LabSampleInput): string {
    const gluten = sample.gluten ?? 0;
    const testWeight = sample.testWeight ?? 0;
    const fn = sample.fallingNumber ?? 0;

    if (gluten >= 26 && testWeight >= 76 && fn >= 200) return 'Grado 1';
    if (gluten >= 22 && testWeight >= 73 && fn >= 150) return 'Grado 2';
    if (gluten >= 18 && testWeight >= 69) return 'Grado 3';
    return 'Fuera de Estándar';
  }

  /**
   * Grados comerciales de maíz — Res. SAGPyA 1262/2004
   * Grado 1: dañados ≤ 2%, extrañas ≤ 2%
   * Grado 2: dañados ≤ 4%, extrañas ≤ 4%
   * Grado 3: dañados ≤ 6%, extrañas ≤ 6%
   */
  private gradeMaiz(sample: LabSampleInput): string {
    const damaged = sample.damagedGrains ?? 0;
    const foreign = sample.foreignMatter ?? 0;
    if (damaged <= 2 && foreign <= 2) return 'Grado 1';
    if (damaged <= 4 && foreign <= 4) return 'Grado 2';
    if (damaged <= 6 && foreign <= 6) return 'Grado 3';
    return 'Fuera de Grado';
  }

  /**
   * Grados comerciales de girasol
   * Grado 1: impurezas ≤ 2%, humedad ≤ 9%, aceite ≥ 44%
   * Grado 2: impurezas ≤ 4%, humedad ≤ 11%, aceite ≥ 40%
   */
  private gradeGirasol(sample: LabSampleInput): string {
    const foreign = sample.foreignMatter ?? 0;
    const humidity = sample.humidity ?? 0;
    const oil = sample.oil ?? 0;

    if (foreign <= 2 && humidity <= 9 && oil >= 44) return 'Grado 1';
    if (foreign <= 4 && humidity <= 11 && oil >= 40) return 'Grado 2';
    return 'Fuera de Grado';
  }

  // ---------------------------------------------------------------------------
  // Texto resumen de ajustes para notificaciones y reportes
  // ---------------------------------------------------------------------------
  private buildSummaryText(
    adjustments: AdjustmentLine[],
    totalPct: number,
    rejectionReasons: string[],
  ): string {
    const lines: string[] = [];

    if (rejectionReasons.length > 0) {
      lines.push(`RECHAZADO: ${rejectionReasons.join(' | ')}`);
    }

    for (const adj of adjustments) {
      const sign = adj.adjustment > 0 ? '+' : '';
      const pctStr = `${sign}${(adj.adjustment * 100).toFixed(2)}%`;
      lines.push(`${adj.parameterLabel}: ${adj.actualValue}${adj.adjustmentType === 'bonus' ? ' (bonif ' : ' (desc '}${pctStr})`);
    }

    const totalSign = totalPct >= 0 ? '+' : '';
    lines.push(`Ajuste total: ${totalSign}${(totalPct * 100).toFixed(2)}%`);

    return lines.join('\n');
  }
}
