-- =============================================================================
-- Seed 04: Commodities (Cultivos)
-- Base data shared across all tenants via a system tenant
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN

  INSERT INTO commodities (id, code, name, quality_params, unit, tenant_id)
  VALUES
    (
      '00000000-0000-0001-0000-000000000001'::UUID,
      'SOJ',
      'Soja',
      '{
        "humedad_base":       13.0,
        "proteina_base":      34.0,
        "aceite_base":        18.0,
        "mat_extranas_base":  1.0,
        "granos_daniados_base": 3.0
      }',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000002'::UUID,
      'MAI',
      'Maíz',
      '{
        "humedad_base":       14.5,
        "mat_extranas_base":  2.0,
        "granos_ardidos_base": 0.5
      }',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000003'::UUID,
      'TRI',
      'Trigo',
      '{
        "humedad_base":         14.0,
        "gluten_humedo_base":   26.0,
        "falling_number_base":  300,
        "peso_hectolitrico_base": 79.0,
        "granos_daniados_base": 0.5
      }',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000004'::UUID,
      'GIR',
      'Girasol',
      '{
        "humedad_base": 9.0,
        "aceite_base":  40.0,
        "mat_extranas_base": 2.0
      }',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000005'::UUID,
      'SOR',
      'Sorgo',
      '{
        "humedad_base":       14.0,
        "mat_extranas_base":  2.0,
        "granos_daniados_base": 2.0
      }',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000006'::UUID,
      'CEV',
      'Cebada',
      '{
        "humedad_base":           12.0,
        "proteina_base":          12.0,
        "granos_partido_base":    3.0,
        "mat_extranas_base":      1.0
      }',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000007'::UUID,
      'CAR',
      'Cártamo',
      '{}',
      'kg',
      v_tenant_id
    ),
    (
      '00000000-0000-0001-0000-000000000008'::UUID,
      'MAN',
      'Maní',
      '{}',
      'kg',
      v_tenant_id
    )
  ON CONFLICT (id) DO NOTHING;

END $$;
