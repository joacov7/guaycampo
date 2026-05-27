// =============================================================================
// Quality Types — domain types for the lab quality engine
// =============================================================================

export interface LabSampleInput {
  humidity?: number;
  protein?: number;
  /** Fat / oil content (aceite / materia grasa) */
  oil?: number;
  gluten?: number;
  fallingNumber?: number;
  testWeight?: number;
  damagedGrains?: number;
  /** Burnt / charred grains (granos ardidos) */
  burntGrains?: number;
  foreignMatter?: number;
  brokenGrains?: number;
  [key: string]: number | undefined;
}

export interface QualityParameter {
  id: string;
  commodityId: string;
  commodityCode: string;
  /** Internal field name matching LabSampleInput keys */
  parameter: string;
  label: string;
  unit: string;
  baseValue: number;
  /** Allowed deviation below base without penalty */
  toleranceMinus?: number;
  /** Allowed deviation above base without penalty */
  tolerancePlus?: number;
  /** Bonus per unit deviation above base (expressed as fraction, e.g. 0.005 = 0.5%) */
  bonusPerUnit?: number;
  /** Discount per unit deviation below base (expressed as fraction) */
  discountPerUnit?: number;
  maxBonus?: number;
  maxDiscount?: number;
  /** Reject if value is below this threshold */
  rejectBelow?: number;
  /** Reject if value is above this threshold */
  rejectAbove?: number;
  normReference?: string;
  tenantId: string;
}

export interface AdjustmentLine {
  parameter: string;
  parameterLabel: string;
  baseValue: number;
  actualValue: number;
  deviation: number;
  /** Adjustment as a fraction — positive = bonus, negative = discount */
  adjustment: number;
  adjustmentType: 'bonus' | 'discount';
}

export interface QualityCalculationResult {
  adjustments: AdjustmentLine[];
  /** Sum of all adjustments as a fraction */
  totalAdjustmentPct: number;
  grade: string;
  status: 'aprobado' | 'condicionado' | 'rechazado';
  rejectionReasons: string[];
  summary: string;
}

export interface ParameterResult {
  isRejection: boolean;
  rejectionReason?: string;
  adjustment: number;
}

// Used for the in-memory default parameters catalogue (fallback when DB has no custom params)
export interface DefaultQualityParams {
  [commodityCode: string]: Omit<
    QualityParameter,
    'id' | 'commodityId' | 'tenantId' | 'commodityCode'
  >[];
}
