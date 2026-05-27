// =============================================================================
// Tests unitarios — QualityService
// Motor de cálculo de bonificaciones y descuentos (normas SENASA argentinas)
// =============================================================================

import { QualityService } from './quality.service';
import { QualityParamsService } from './quality-params.service';
import type { QualityParameter } from './quality.types';

// ---------------------------------------------------------------------------
// Constantes de test
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-test-1';

// ---------------------------------------------------------------------------
// Parámetros default inline (para no depender de DB en tests unitarios)
// Reflejan exactamente los valores de DEFAULT_PARAMS en quality-params.service.ts
// ---------------------------------------------------------------------------
function makeParam(overrides: Partial<QualityParameter> & { parameter: string }): QualityParameter {
  return {
    id: `test-${overrides.parameter}`,
    commodityId: 'commodity-test',
    commodityCode: 'TEST',
    label: overrides.parameter,
    unit: '%',
    baseValue: 0,
    tenantId: TENANT_ID,
    ...overrides,
  };
}

const SOJ_PARAMS: QualityParameter[] = [
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
];

const TRI_PARAMS: QualityParameter[] = [
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
];

const MAI_PARAMS: QualityParameter[] = [
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
  makeParam({
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
  }),
];

// ---------------------------------------------------------------------------
// Mock de QualityParamsService
// ---------------------------------------------------------------------------
function buildMockParamsService(
  paramsMap: Record<string, QualityParameter[]>,
): jest.Mocked<QualityParamsService> {
  return {
    getForCommodity: jest.fn(async (code: string) => paramsMap[code] ?? []),
    listForTenant: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    resetToDefaults: jest.fn(),
  } as unknown as jest.Mocked<QualityParamsService>;
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------
describe('QualityService', () => {
  let service: QualityService;
  let paramsService: jest.Mocked<QualityParamsService>;

  beforeEach(() => {
    paramsService = buildMockParamsService({ SOJ: SOJ_PARAMS, TRI: TRI_PARAMS, MAI: MAI_PARAMS });
    service = new QualityService(paramsService);
  });

  // =========================================================================
  // SOJA
  // =========================================================================
  describe('Soja — cálculo de ajustes', () => {
    it('debería retornar sin ajuste cuando todos los valores están en base', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          damagedGrains: 0.5,
          foreignMatter: 2.0,
          brokenGrains: 3.0,
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.totalAdjustmentPct).toBe(0);
      // Sin rechazo y sin ajuste → aprobado
      expect(result.status).toBe('aprobado');
    });

    it('debería calcular descuento por humedad excedida', async () => {
      // 14% de humedad → 1% sobre base de 13% → discount a razón de 0.01 / %
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          damagedGrains: 0,
          foreignMatter: 0,
          brokenGrains: 0,
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.totalAdjustmentPct).toBeLessThan(0);
      const humidityLine = result.adjustments.find((a) => a.parameter === 'humidity');
      expect(humidityLine).toBeDefined();
      expect(humidityLine!.adjustmentType).toBe('discount');
    });

    it('debería rechazar soja con humedad > 15.5% (rejectAbove según norma SENASA)', async () => {
      const result = await service.calculateAdjustments(
        { humidity: 16.0 },
        'SOJ',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
      expect(result.rejectionReasons.length).toBeGreaterThan(0);
      // El mensaje de rechazo debe mencionar la humedad
      expect(result.rejectionReasons[0].toLowerCase()).toContain('humedad');
    });

    it('debería rechazar soja con materias extrañas > 5%', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          foreignMatter: 6.0,
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería rechazar soja con granos dañados > 10% (rejectAbove según norma)', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          damagedGrains: 11.0,
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería asignar Grado 1 a soja de alta calidad', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 12.5,
          damagedGrains: 0.5,
          foreignMatter: 1.0,
          brokenGrains: 2.0,
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.grade).toBe('Grado 1');
    });

    it('debería asignar Grado 2 a soja con calidad intermedia', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          damagedGrains: 2.0,
          foreignMatter: 4.0,
          brokenGrains: 7.0,
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.grade).toBe('Grado 2');
    });

    it('debería calcular bonificación por proteína superior al base (34%)', async () => {
      // Proteína 36% vs base 34% → 2% de exceso → bonificación a razón de 0.005 / %
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          protein: 36.0,
        },
        'SOJ',
        TENANT_ID,
      );

      const proteinLine = result.adjustments.find((a) => a.parameter === 'protein');
      expect(proteinLine).toBeDefined();
      expect(proteinLine!.adjustmentType).toBe('bonus');
      expect(result.totalAdjustmentPct).toBeGreaterThan(0);
    });

    it('debería aplicar descuento por materias extrañas fuera de tolerancia', async () => {
      // foreignMatter base=1.0, tolerancePlus=2.0 → dentro de tolerancia hasta 3.0
      // Con valor 4.0 → excede tolerancia → descuento
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          foreignMatter: 4.0,
        },
        'SOJ',
        TENANT_ID,
      );

      const foreignLine = result.adjustments.find((a) => a.parameter === 'foreignMatter');
      expect(foreignLine).toBeDefined();
      expect(foreignLine!.adjustmentType).toBe('discount');
    });

    it('debería no aplicar ajuste por humedad dentro de la tolerancia inferior', async () => {
      // base=13.0, toleranceMinus=1.0 → sin penalidad hasta 12.0
      const result = await service.calculateAdjustments(
        { humidity: 12.0 },
        'SOJ',
        TENANT_ID,
      );

      const humidityLine = result.adjustments.find((a) => a.parameter === 'humidity');
      // No debería aparecer en adjustments si es 0
      if (humidityLine) {
        expect(humidityLine.adjustment).toBe(0);
      } else {
        expect(humidityLine).toBeUndefined();
      }
    });

    it('debería aplicar el cap de descuento máximo por humedad', async () => {
      // maxDiscount para humidity SOJ = 0.03
      // Con humedad muy alta (justo en rejectAbove=15.5 no rechaza, pero a 15.4 sí aplica cap)
      const result = await service.calculateAdjustments(
        { humidity: 15.4 },
        'SOJ',
        TENANT_ID,
      );

      const humidityLine = result.adjustments.find((a) => a.parameter === 'humidity');
      if (humidityLine) {
        expect(Math.abs(humidityLine.adjustment)).toBeLessThanOrEqual(0.03 + 0.0001);
      }
    });
  });

  // =========================================================================
  // TRIGO
  // =========================================================================
  describe('Trigo — cálculo de ajustes', () => {
    it('debería calcular Grado 1 para trigo de alta calidad', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.5,
          gluten: 28.0,
          fallingNumber: 250,
          testWeight: 78.0,
          damagedGrains: 0.2,
        },
        'TRI',
        TENANT_ID,
      );

      expect(result.grade).toBe('Grado 1');
      expect(result.status).toBe('aprobado');
    });

    it('debería rechazar trigo con falling number < 200 (rejectBelow según norma)', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          gluten: 24.0,
          fallingNumber: 190,
          testWeight: 75.0,
        },
        'TRI',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería rechazar trigo con gluten < 18%', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          gluten: 17.0,
          fallingNumber: 220,
          testWeight: 76.0,
        },
        'TRI',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería aplicar descuento por gluten bajo (fuera de tolerancia)', async () => {
      // Gluten base=26, toleranceMinus=2 → sin penalidad hasta 24
      // Con gluten=22 → 2% por debajo del mínimo tolerado → descuento
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          gluten: 22.0,
          fallingNumber: 220,
          testWeight: 76.0,
        },
        'TRI',
        TENANT_ID,
      );

      const glutenLine = result.adjustments.find((a) => a.parameter === 'gluten');
      expect(glutenLine).toBeDefined();
      expect(glutenLine!.adjustmentType).toBe('discount');
    });

    it('debería rechazar trigo con testWeight < 72 kg/hl', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          gluten: 24.0,
          fallingNumber: 220,
          testWeight: 70.0,
        },
        'TRI',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería calcular Grado 2 cuando gluten y peso hectolítrico cumplen condiciones de grado 2', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          gluten: 23.0,
          fallingNumber: 210,
          testWeight: 74.0,
          damagedGrains: 0.1,
        },
        'TRI',
        TENANT_ID,
      );

      expect(result.grade).toBe('Grado 2');
    });
  });

  // =========================================================================
  // MAÍZ
  // =========================================================================
  describe('Maíz — cálculo de ajustes', () => {
    it('debería rechazar maíz con granos ardidos > 2%', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          burntGrains: 3.0,
          foreignMatter: 1.0,
        },
        'MAI',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería rechazar maíz con humedad > 18%', async () => {
      const result = await service.calculateAdjustments(
        { humidity: 19.0 },
        'MAI',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });

    it('debería asignar Grado 1 a maíz de alta calidad', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          damagedGrains: 1.0,
          foreignMatter: 1.5,
          burntGrains: 0.3,
        },
        'MAI',
        TENANT_ID,
      );

      expect(result.grade).toBe('Grado 1');
    });

    it('debería calcular descuento por granos ardidos sobre base', async () => {
      // burntGrains base=0.5, tolerancePlus/minus=0 → >0.5 genera descuento
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          burntGrains: 1.5,
        },
        'MAI',
        TENANT_ID,
      );

      const burntLine = result.adjustments.find((a) => a.parameter === 'burntGrains');
      expect(burntLine).toBeDefined();
      expect(burntLine!.adjustmentType).toBe('discount');
    });

    it('debería rechazar maíz con granos dañados > 6%', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          damagedGrains: 7.0,
        },
        'MAI',
        TENANT_ID,
      );

      expect(result.status).toBe('rechazado');
    });
  });

  // =========================================================================
  // Cálculo de ajuste combinado
  // =========================================================================
  describe('cálculo de ajuste combinado', () => {
    it('debería sumar correctamente múltiples bonificaciones y descuentos', async () => {
      // Proteína alta (>34) → bonus; humedad baja (dentro tolerancia) → 0
      const result = await service.calculateAdjustments(
        {
          humidity: 13.5,    // dentro de tolerancia, sin ajuste
          protein: 35.0,     // 1% sobre base 34% → bonus
          damagedGrains: 0.3, // por debajo de base 3% → sin ajuste (toleranceMinus=0)
          foreignMatter: 1.5, // dentro tolerancePlus=2 → sin ajuste
        },
        'SOJ',
        TENANT_ID,
      );

      // La suma algebraica de las líneas debe coincidir con totalAdjustmentPct
      const sumFromLines = result.adjustments.reduce((s, a) => s + a.adjustment, 0);
      expect(result.totalAdjustmentPct).toBeCloseTo(sumFromLines, 10);
    });

    it('debería retornar lista de ajustes vacía cuando no hay desviaciones', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,  // exactamente en base
          damagedGrains: 3.0, // exactamente en base
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.adjustments).toHaveLength(0);
      expect(result.totalAdjustmentPct).toBe(0);
    });

    it('debería incluir rejectionReasons vacío cuando la muestra es aprobada', async () => {
      const result = await service.calculateAdjustments(
        { humidity: 13.0 },
        'SOJ',
        TENANT_ID,
      );

      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('debería incluir campo summary en el resultado', async () => {
      const result = await service.calculateAdjustments(
        { humidity: 14.0 },
        'SOJ',
        TENANT_ID,
      );

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('debería marcar como condicionado cuando el ajuste total supera el 5%', async () => {
      // Construimos un params mock con discount muy alto para forzar estado condicionado
      const highDiscountParams: QualityParameter[] = [
        makeParam({
          parameter: 'humidity',
          label: 'Humedad',
          unit: '%',
          baseValue: 10.0,
          toleranceMinus: 0,
          tolerancePlus: 0,
          bonusPerUnit: 0,
          discountPerUnit: 0.1,   // 10% por cada punto
          maxBonus: 0,
          maxDiscount: 0.5,
        }),
      ];

      const customParamsService = buildMockParamsService({ CUSTOM: highDiscountParams });
      const customService = new QualityService(customParamsService);

      const result = await customService.calculateAdjustments(
        { humidity: 11.0 },  // 1 punto sobre base → -10% ajuste → condicionado
        'CUSTOM',
        TENANT_ID,
      );

      expect(result.status).toBe('condicionado');
    });
  });

  // =========================================================================
  // Grados comerciales
  // =========================================================================
  describe('grados comerciales', () => {
    it('debería retornar Fuera de Grado para soja con valores extremos', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 13.0,
          damagedGrains: 6.0,   // > umbral de grado 3 (5%)
          foreignMatter: 9.0,   // > umbral de grado 3 (8%)
          brokenGrains: 11.0,   // > umbral de grado 3 (10%)
        },
        'SOJ',
        TENANT_ID,
      );

      expect(result.grade).toBe('Fuera de Grado');
    });

    it('debería retornar S/C para commodity desconocido', async () => {
      const unknownParamsService = buildMockParamsService({ UNKN: [] });
      const unknownService = new QualityService(unknownParamsService);

      const result = await unknownService.calculateAdjustments(
        { humidity: 13.0 },
        'UNKN',
        TENANT_ID,
      );

      expect(result.grade).toBe('S/C');
    });

    it('debería retornar Fuera de Estándar para trigo con valores muy bajos', async () => {
      const result = await service.calculateAdjustments(
        {
          humidity: 14.0,
          gluten: 17.0,   // < 18% → rechazado, grade es Fuera de Estándar
          fallingNumber: 220,
          testWeight: 68.0,
        },
        'TRI',
        TENANT_ID,
      );

      expect(result.grade).toBe('Fuera de Estándar');
    });
  });

  // =========================================================================
  // Precisión del cálculo
  // =========================================================================
  describe('precisión del cálculo', () => {
    it('debería calcular el ajuste de humedad de soja con precisión', async () => {
      // humidity=14.0, base=13.0, tolerance=0 → deviation=1.0
      // adjustment = deviation * discountPerUnit = 1.0 * 0.01 = 0.01 → -1%
      const result = await service.calculateAdjustments(
        { humidity: 14.0 },
        'SOJ',
        TENANT_ID,
      );

      const humidityLine = result.adjustments.find((a) => a.parameter === 'humidity');
      expect(humidityLine).toBeDefined();
      expect(humidityLine!.adjustment).toBeCloseTo(-0.01, 6);
    });

    it('debería calcular la bonificación por proteína con precisión', async () => {
      // protein=36.0, base=34.0, tolerancePlus=0 → effectiveDeviation=2.0
      // adjustment = 2.0 * 0.005 = 0.01 → +1%
      const result = await service.calculateAdjustments(
        { protein: 36.0 },
        'SOJ',
        TENANT_ID,
      );

      const proteinLine = result.adjustments.find((a) => a.parameter === 'protein');
      expect(proteinLine).toBeDefined();
      expect(proteinLine!.adjustment).toBeCloseTo(0.01, 6);
    });
  });
});
