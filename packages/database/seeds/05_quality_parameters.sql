-- =============================================================================
-- Seed 05: Quality Parameters (parámetros reales SENASA/MINAGRI Argentina)
-- References:
--   - Soja:  Res. SAGPyA 289/2003
--   - Maíz:  Res. SAGPyA 1262/2004
--   - Trigo: Norma de Calidad SAGPyA Res. 1262/2004 (Grados I-VI)
--   - Girasol: Res. SAGPyA
--   - Cebada: Contrato CIAB
-- =============================================================================

DO $$
DECLARE
  v_tenant_id  UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_soja_id    UUID := '00000000-0000-0001-0000-000000000001'::UUID;
  v_maiz_id    UUID := '00000000-0000-0001-0000-000000000002'::UUID;
  v_trigo_id   UUID := '00000000-0000-0001-0000-000000000003'::UUID;
  v_girasol_id UUID := '00000000-0000-0001-0000-000000000004'::UUID;
BEGIN

  -- =========================================================================
  -- SOJA (Res. SAGPyA 289/2003)
  -- =========================================================================

  -- Humedad: base 13%, bonificación 0.5%/1% de diferencia, descuento 0.5%/1%
  INSERT INTO quality_parameters
    (commodity_id, parameter_name, base_value, tolerance_low, tolerance_high,
     bonus_rate, discount_rate, max_bonus, max_discount,
     reject_below, reject_above, unit, norm_reference, tenant_id)
  VALUES
  (
    v_soja_id, 'humedad', 13.0, 12.0, 13.0,
    0.005, 0.005,   -- 0.5% por cada 1% de diferencia
    0.010, 0.030,   -- max bonif 1%, max descuento 3%
    NULL, 15.5,     -- rechazo si > 15.5%
    '%', 'SAGPyA Res. 289/2003', v_tenant_id
  ),

  -- Proteína: base 34%, bonificación 0.5%/1% proteína extra
  (
    v_soja_id, 'proteina', 34.0, 33.0, NULL,
    0.005, 0.003,
    0.030, 0.010,
    NULL, NULL,
    '%', 'SAGPyA Res. 289/2003', v_tenant_id
  ),

  -- Aceite: base 18%, bonificación 0.3%/1% aceite extra
  (
    v_soja_id, 'aceite', 18.0, 17.0, NULL,
    0.003, 0.002,
    0.020, 0.010,
    NULL, NULL,
    '%', 'SAGPyA Res. 289/2003', v_tenant_id
  ),

  -- Materias extrañas: base 1%, descuento 0.5%/1% extra
  (
    v_soja_id, 'materias_extranas', 1.0, NULL, 1.0,
    0.000, 0.005,
    0.000, 0.030,
    NULL, 5.0,
    '%', 'SAGPyA Res. 289/2003', v_tenant_id
  ),

  -- Granos dañados: base 3%, descuento 0.5%/1% extra
  (
    v_soja_id, 'granos_daniados', 3.0, NULL, 3.0,
    0.000, 0.005,
    0.000, 0.050,
    NULL, 10.0,
    '%', 'SAGPyA Res. 289/2003', v_tenant_id
  )
  ON CONFLICT (commodity_id, parameter_name, tenant_id) DO NOTHING;

  -- =========================================================================
  -- MAÍZ (Res. SAGPyA 1262/2004)
  -- =========================================================================

  INSERT INTO quality_parameters
    (commodity_id, parameter_name, base_value, tolerance_low, tolerance_high,
     bonus_rate, discount_rate, max_bonus, max_discount,
     reject_below, reject_above, unit, norm_reference, tenant_id)
  VALUES
  (
    v_maiz_id, 'humedad', 14.5, 13.5, 14.5,
    0.005, 0.005,
    0.010, 0.040,
    NULL, 18.0,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_maiz_id, 'materias_extranas', 2.0, NULL, 2.0,
    0.000, 0.005,
    0.000, 0.030,
    NULL, 6.0,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_maiz_id, 'granos_ardidos', 0.5, NULL, 0.5,
    0.000, 0.010,
    0.000, 0.100,
    NULL, 3.0,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  )
  ON CONFLICT (commodity_id, parameter_name, tenant_id) DO NOTHING;

  -- =========================================================================
  -- TRIGO (SAGPyA Grado 1 base)
  -- =========================================================================

  INSERT INTO quality_parameters
    (commodity_id, parameter_name, base_value, tolerance_low, tolerance_high,
     bonus_rate, discount_rate, max_bonus, max_discount,
     reject_below, reject_above, unit, norm_reference, tenant_id)
  VALUES
  (
    v_trigo_id, 'humedad', 14.0, 13.0, 14.0,
    0.005, 0.005,
    0.010, 0.040,
    NULL, 16.0,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_trigo_id, 'gluten_humedo', 26.0, 24.0, NULL,
    0.004, 0.003,
    0.030, 0.020,
    18.0, NULL,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_trigo_id, 'falling_number', 300, 250, NULL,
    0.000, 0.000,
    0.000, 0.000,
    200, NULL,
    'seg', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_trigo_id, 'peso_hectolitrico', 79.0, 76.0, NULL,
    0.003, 0.002,
    0.020, 0.015,
    72.0, NULL,
    'kg/hl', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_trigo_id, 'granos_daniados', 0.5, NULL, 0.5,
    0.000, 0.010,
    0.000, 0.080,
    NULL, 5.0,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  ),
  (
    v_trigo_id, 'materias_extranas', 1.0, NULL, 1.0,
    0.000, 0.005,
    0.000, 0.030,
    NULL, 4.0,
    '%', 'SAGPyA Res. 1262/2004', v_tenant_id
  )
  ON CONFLICT (commodity_id, parameter_name, tenant_id) DO NOTHING;

  -- =========================================================================
  -- GIRASOL (Res. SAGPyA)
  -- =========================================================================

  INSERT INTO quality_parameters
    (commodity_id, parameter_name, base_value, tolerance_low, tolerance_high,
     bonus_rate, discount_rate, max_bonus, max_discount,
     reject_below, reject_above, unit, norm_reference, tenant_id)
  VALUES
  (
    v_girasol_id, 'humedad', 9.0, 8.0, 9.0,
    0.005, 0.005,
    0.010, 0.040,
    NULL, 14.0,
    '%', 'SAGPyA Res. Girasol', v_tenant_id
  ),
  (
    v_girasol_id, 'aceite', 40.0, 38.0, NULL,
    0.005, 0.003,
    0.030, 0.010,
    NULL, NULL,
    '%', 'SAGPyA Res. Girasol', v_tenant_id
  ),
  (
    v_girasol_id, 'materias_extranas', 2.0, NULL, 2.0,
    0.000, 0.005,
    0.000, 0.030,
    NULL, 8.0,
    '%', 'SAGPyA Res. Girasol', v_tenant_id
  )
  ON CONFLICT (commodity_id, parameter_name, tenant_id) DO NOTHING;

END $$;
