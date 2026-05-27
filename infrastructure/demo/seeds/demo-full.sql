-- =============================================================================
-- GuayCampo Demo — Datos operativos completos
-- Transportistas, vehículos, conductores, clientes y silos
-- Empresa demo: tenant_id = '00000000-0000-0000-0000-000000000001'
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;

  -- Transportistas
  v_tc_garcia   UUID := '00000000-1000-0000-0000-000000000001'::UUID;
  v_tc_norte    UUID := '00000000-1000-0000-0000-000000000002'::UUID;
  v_tc_hdez     UUID := '00000000-1000-0000-0000-000000000003'::UUID;

  -- Vehículos
  v_v1 UUID := '00000000-2000-0000-0000-000000000001'::UUID;
  v_v2 UUID := '00000000-2000-0000-0000-000000000002'::UUID;
  v_v3 UUID := '00000000-2000-0000-0000-000000000003'::UUID;
  v_v4 UUID := '00000000-2000-0000-0000-000000000004'::UUID;
  v_v5 UUID := '00000000-2000-0000-0000-000000000005'::UUID;
  v_v6 UUID := '00000000-2000-0000-0000-000000000006'::UUID;

  -- Conductores
  v_d1 UUID := '00000000-3000-0000-0000-000000000001'::UUID;
  v_d2 UUID := '00000000-3000-0000-0000-000000000002'::UUID;
  v_d3 UUID := '00000000-3000-0000-0000-000000000003'::UUID;
  v_d4 UUID := '00000000-3000-0000-0000-000000000004'::UUID;
  v_d5 UUID := '00000000-3000-0000-0000-000000000005'::UUID;
  v_d6 UUID := '00000000-3000-0000-0000-000000000006'::UUID;

  -- Clientes
  v_cli1 UUID := '00000000-4000-0000-0000-000000000001'::UUID;
  v_cli2 UUID := '00000000-4000-0000-0000-000000000002'::UUID;
  v_cli3 UUID := '00000000-4000-0000-0000-000000000003'::UUID;
  v_cli4 UUID := '00000000-4000-0000-0000-000000000004'::UUID;
  v_cli5 UUID := '00000000-4000-0000-0000-000000000005'::UUID;

  -- Silos
  v_s1 UUID := '00000000-5000-0000-0000-000000000001'::UUID;
  v_s2 UUID := '00000000-5000-0000-0000-000000000002'::UUID;
  v_s3 UUID := '00000000-5000-0000-0000-000000000003'::UUID;
  v_s4 UUID := '00000000-5000-0000-0000-000000000004'::UUID;
  v_s5 UUID := '00000000-5000-0000-0000-000000000005'::UUID;
  v_s6 UUID := '00000000-5000-0000-0000-000000000006'::UUID;

  -- Commodities (ya insertados por seed 04, los referenciamos por código)
  v_soj UUID;
  v_mai UUID;
  v_tri UUID;

BEGIN

  -- Resolver IDs de commodities desde la tabla
  SELECT id INTO v_soj FROM commodities WHERE code = 'SOJ' AND tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_mai FROM commodities WHERE code = 'MAI' AND tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_tri FROM commodities WHERE code = 'TRI' AND tenant_id = v_tenant_id LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Transportistas
  -- -------------------------------------------------------------------------
  INSERT INTO transport_companies (id, name, cuit, address, contact_phone, tenant_id, status)
  VALUES
    (v_tc_garcia, 'Transportes García S.R.L.', '30-71234568-9', 'Ruta 8 Km 234, Pergamino', '011-4521-3456', v_tenant_id, 'active'),
    (v_tc_norte,  'Fletes del Norte S.A.',      '30-68901235-6', 'Av. San Martín 1540, Rosario', '0341-456-7890', v_tenant_id, 'active'),
    (v_tc_hdez,   'Hernández Transportes',       '20-25678902-5', 'Belgrano 890, Junín', '0236-445-6789', v_tenant_id, 'active')
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Vehículos (patentes argentinas — formato viejo y Mercosur)
  -- -------------------------------------------------------------------------
  INSERT INTO vehicles (id, plate, plate_trailer, vehicle_type, tara_kg, capacity_kg, brand, model, year, tenant_id, transport_company_id)
  VALUES
    (v_v1, 'ABC123', 'DEF456', 'camion', 12500, 30000, 'Mercedes Benz', 'Axor 2035',    2019, v_tenant_id, v_tc_garcia),
    (v_v2, 'GHI789', 'JKL012', 'camion', 13200, 28000, 'Scania',         'R 450',        2021, v_tenant_id, v_tc_garcia),
    (v_v3, 'MNO345', 'PQR678', 'camion', 11800, 32000, 'Volvo',          'FH 460',       2020, v_tenant_id, v_tc_norte),
    (v_v4, 'AB123CD', 'EF456GH', 'camion', 12000, 30000, 'Mercedes Benz', 'Actros 2651', 2022, v_tenant_id, v_tc_norte),
    (v_v5, 'IJ789KL', 'MN012OP', 'camion', 13500, 28500, 'Scania',        'G 410',       2018, v_tenant_id, v_tc_hdez),
    (v_v6, 'STU901',  'VWX234',  'camion', 12300, 31000, 'Ford',          'Cargo 2842',  2020, v_tenant_id, v_tc_hdez)
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Conductores
  -- -------------------------------------------------------------------------
  INSERT INTO drivers (id, dni, full_name, phone, license_number, rating, tenant_id, transport_company_id)
  VALUES
    (v_d1, '25678901', 'Juan Carlos García',    '11-5234-5678', 'B-25678901', 4.8, v_tenant_id, v_tc_garcia),
    (v_d2, '30123456', 'Roberto Fernández',      '11-5345-6789', 'B-30123456', 4.6, v_tenant_id, v_tc_garcia),
    (v_d3, '28456789', 'Miguel Ángel López',     '341-5456-7890','B-28456789', 4.9, v_tenant_id, v_tc_norte),
    (v_d4, '32567890', 'Carlos Rodríguez',       '236-5567-8901','B-32567890', 4.7, v_tenant_id, v_tc_norte),
    (v_d5, '26789012', 'Diego Martínez',         '11-5678-9012', 'B-26789012', 4.5, v_tenant_id, v_tc_hdez),
    (v_d6, '31234567', 'Alejandro Sánchez',      '236-5789-0123','B-31234567', 4.8, v_tenant_id, v_tc_hdez)
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Clientes / Productores
  -- -------------------------------------------------------------------------
  INSERT INTO clients (id, name, cuit, client_type, address, locality, province, iva_condition, current_account, tenant_id)
  VALUES
    (v_cli1, 'Campos del Sur S.A.',                '30-71234569-0', 'productor',   'Ruta 7 Km 156',       'Pehuajó',          'Buenos Aires', 'responsable_inscripto', 125000.00,  v_tenant_id),
    (v_cli2, 'Estancia La Pampa S.R.L.',            '30-68901236-7', 'productor',   'Camino rural s/n',    'Trenque Lauquen',  'Buenos Aires', 'responsable_inscripto', -45000.00,  v_tenant_id),
    (v_cli3, 'Cooperativa Agropecuaria del Norte',  '30-59012347-8', 'cooperativa', 'San Martín 450',      'Junín',            'Buenos Aires', 'exento',                0.00,       v_tenant_id),
    (v_cli4, 'Pedro Ramírez',                       '20-18901235-8', 'productor',   'Los Álamos 234',      'Bragado',          'Buenos Aires', 'monotributo',           18500.00,   v_tenant_id),
    (v_cli5, 'Agrícola del Oeste S.A.',             '30-72345680-1', 'acopiador',   'Av. Belgrano 1200',   'General Villegas', 'Buenos Aires', 'responsable_inscripto', 230000.00,  v_tenant_id)
  ON CONFLICT (id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Silos (vinculados a soja por defecto donde hay stock)
  -- -------------------------------------------------------------------------
  INSERT INTO silos (id, name, silo_type, capacity_ton, current_stock, commodity_id, sector, status, tenant_id)
  VALUES
    (v_s1, 'Silo 1',  'silo_metalico', 1500.00,  892.50,  v_soj, 'Sector A',     'operativo',    v_tenant_id),
    (v_s2, 'Silo 2',  'silo_metalico', 1500.00, 1234.80,  v_soj, 'Sector A',     'operativo',    v_tenant_id),
    (v_s3, 'Silo 3',  'silo_metalico', 2000.00,  456.20,  v_mai, 'Sector B',     'operativo',    v_tenant_id),
    (v_s4, 'Silo 4',  'silo_metalico', 2000.00,    0.00,  NULL,  'Sector B',     'vacio',        v_tenant_id),
    (v_s5, 'Celda 1', 'celda',         5000.00, 3842.10,  v_soj, 'Playa Central','operativo',    v_tenant_id),
    (v_s6, 'Celda 2', 'celda',         5000.00, 2156.70,  v_tri, 'Playa Central','operativo',    v_tenant_id)
  ON CONFLICT (id) DO NOTHING;

END $$;
