-- =============================================================================
-- GuayCampo Demo — Datos del día de HOY
-- Usa fechas dinámicas (NOW() / CURRENT_DATE) para que el demo siempre
-- muestre operaciones "en curso". Seguro correrlo múltiples veces (idempotente).
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;

  -- IDs fijos de los objetos creados en demo-full.sql
  v_v1 UUID := '00000000-2000-0000-0000-000000000001'::UUID;
  v_v2 UUID := '00000000-2000-0000-0000-000000000002'::UUID;
  v_v3 UUID := '00000000-2000-0000-0000-000000000003'::UUID;
  v_v4 UUID := '00000000-2000-0000-0000-000000000004'::UUID;
  v_v5 UUID := '00000000-2000-0000-0000-000000000005'::UUID;
  v_v6 UUID := '00000000-2000-0000-0000-000000000006'::UUID;

  v_d1 UUID := '00000000-3000-0000-0000-000000000001'::UUID;
  v_d2 UUID := '00000000-3000-0000-0000-000000000002'::UUID;
  v_d3 UUID := '00000000-3000-0000-0000-000000000003'::UUID;
  v_d4 UUID := '00000000-3000-0000-0000-000000000004'::UUID;
  v_d5 UUID := '00000000-3000-0000-0000-000000000005'::UUID;
  v_d6 UUID := '00000000-3000-0000-0000-000000000006'::UUID;

  v_cli1 UUID := '00000000-4000-0000-0000-000000000001'::UUID;
  v_cli2 UUID := '00000000-4000-0000-0000-000000000002'::UUID;
  v_cli3 UUID := '00000000-4000-0000-0000-000000000003'::UUID;
  v_cli4 UUID := '00000000-4000-0000-0000-000000000004'::UUID;
  v_cli5 UUID := '00000000-4000-0000-0000-000000000005'::UUID;

  v_s2 UUID := '00000000-5000-0000-0000-000000000002'::UUID;

  -- IDs para datos del día de hoy
  v_ss1  UUID := '00000000-6000-0000-0001-000000000001'::UUID;
  v_ss2  UUID := '00000000-6000-0000-0001-000000000002'::UUID;
  v_ss3  UUID := '00000000-6000-0000-0001-000000000003'::UUID;

  v_ts1  UUID := '00000000-6000-0000-0002-000000000001'::UUID;
  v_ts2  UUID := '00000000-6000-0000-0002-000000000002'::UUID;
  v_ts3  UUID := '00000000-6000-0000-0002-000000000003'::UUID;
  v_ts4  UUID := '00000000-6000-0000-0002-000000000004'::UUID;
  v_ts5  UUID := '00000000-6000-0000-0002-000000000005'::UUID;
  v_ts6  UUID := '00000000-6000-0000-0002-000000000006'::UUID;
  v_ts7  UUID := '00000000-6000-0000-0002-000000000007'::UUID;

  v_st1  UUID := '00000000-6000-0000-0003-000000000001'::UUID;
  v_st2  UUID := '00000000-6000-0000-0003-000000000002'::UUID;

  v_ls1  UUID := '00000000-6000-0000-0004-000000000001'::UUID;

  v_sa1  UUID := '00000000-6000-0000-0005-000000000001'::UUID;

  -- Commodities (resolvemos por código)
  v_soj UUID;
  v_mai UUID;
  v_tri UUID;

BEGIN

  SELECT id INTO v_soj FROM commodities WHERE code = 'SOJ' AND tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_mai FROM commodities WHERE code = 'MAI' AND tenant_id = v_tenant_id LIMIT 1;
  SELECT id INTO v_tri FROM commodities WHERE code = 'TRI' AND tenant_id = v_tenant_id LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Cupos / programación del día de hoy
  -- -------------------------------------------------------------------------
  -- Primero eliminamos los registros del día anterior si existían con estos IDs
  DELETE FROM shift_schedules WHERE id IN (v_ss1, v_ss2, v_ss3);

  INSERT INTO shift_schedules (id, date, commodity_id, operation_type, total_slots, used_slots, time_from, time_to, status, tenant_id)
  VALUES
    (v_ss1, CURRENT_DATE, v_soj, 'descarga', 20, 14, '07:00', '12:00', 'open',   v_tenant_id),
    (v_ss2, CURRENT_DATE, v_mai, 'descarga', 15,  8, '07:00', '12:00', 'open',   v_tenant_id),
    (v_ss3, CURRENT_DATE, v_tri, 'descarga', 10,  3, '13:00', '18:00', 'open',   v_tenant_id);

  -- -------------------------------------------------------------------------
  -- Turnos activos de hoy (distintos estados del flujo)
  -- -------------------------------------------------------------------------
  DELETE FROM queue_positions WHERE id = '00000000-6000-0000-0006-000000000001'::UUID
                                 OR id = '00000000-6000-0000-0006-000000000002'::UUID
                                 OR id = '00000000-6000-0000-0006-000000000003'::UUID;
  DELETE FROM lab_samples    WHERE id = v_ls1;
  DELETE FROM scale_tickets  WHERE id IN (v_st1, v_st2);
  DELETE FROM truck_shifts   WHERE id IN (v_ts1, v_ts2, v_ts3, v_ts4, v_ts5, v_ts6, v_ts7);

  INSERT INTO truck_shifts (id, shift_id, vehicle_id, driver_id, client_id, commodity_id, estimated_qty, status, qr_code, checkin_at, tenant_id)
  VALUES
    -- En báscula: primer pesaje completado, esperando resultado de laboratorio
    (v_ts1, v_ss1, v_v1, v_d1, v_cli1, v_soj, 28500.00, 'en_balanza',
     'QR-DEMO-HOY-001', NOW() - INTERVAL '45 minutes', v_tenant_id),

    -- En laboratorio: muestra tomada
    (v_ts2, v_ss1, v_v2, v_d2, v_cli2, v_soj, 27800.00, 'en_laboratorio',
     'QR-DEMO-HOY-002', NOW() - INTERVAL '30 minutes', v_tenant_id),

    -- Esperando en cola (posición 1, 2, 3)
    (v_ts3, v_ss1, v_v3, v_d3, v_cli3, v_soj, 30000.00, 'esperando',
     'QR-DEMO-HOY-003', NOW() - INTERVAL '20 minutes', v_tenant_id),
    (v_ts4, v_ss2, v_v4, v_d4, v_cli1, v_mai, 29500.00, 'esperando',
     'QR-DEMO-HOY-004', NOW() - INTERVAL '15 minutes', v_tenant_id),
    (v_ts5, v_ss1, v_v5, v_d5, v_cli4, v_soj, 28000.00, 'esperando',
     'QR-DEMO-HOY-005', NOW() - INTERVAL '10 minutes', v_tenant_id),

    -- Confirmado (turno asignado, aún no llegó a planta)
    (v_ts6, v_ss2, v_v6, v_d6, v_cli5, v_mai, 31000.00, 'confirmado',
     'QR-DEMO-HOY-006', NULL, v_tenant_id),

    -- Finalizado (ya procesado esta mañana)
    (v_ts7, v_ss1, v_v1, v_d1, v_cli1, v_soj, 28200.00, 'finalizado',
     'QR-DEMO-HOY-007', NOW() - INTERVAL '3 hours', v_tenant_id);

  -- -------------------------------------------------------------------------
  -- Posiciones en la cola virtual
  -- -------------------------------------------------------------------------
  INSERT INTO queue_positions (id, truck_shift_id, position, parking_zone, estimated_wait, priority, tenant_id)
  VALUES
    ('00000000-6000-0000-0006-000000000001'::UUID, v_ts3, 1, 'Zona A', 25, 0, v_tenant_id),
    ('00000000-6000-0000-0006-000000000002'::UUID, v_ts4, 2, 'Zona A', 50, 0, v_tenant_id),
    ('00000000-6000-0000-0006-000000000003'::UUID, v_ts5, 3, 'Zona B', 75, 0, v_tenant_id);

  -- -------------------------------------------------------------------------
  -- Ticket de báscula activo (el camión ts1 está en báscula — pesaje de entrada)
  -- -------------------------------------------------------------------------
  INSERT INTO scale_tickets (
    id, ticket_number, truck_shift_id, vehicle_id, driver_id, client_id, commodity_id,
    gross_weight, gross_at, status, tenant_id
  ) VALUES (
    v_st1, '2025-000001', v_ts1, v_v1, v_d1, v_cli1, v_soj,
    42350.00, NOW() - INTERVAL '20 minutes', 'en_laboratorio', v_tenant_id
  );

  -- -------------------------------------------------------------------------
  -- Ticket finalizado (turno ts7, ya tiene peso neto completo)
  -- -------------------------------------------------------------------------
  INSERT INTO scale_tickets (
    id, ticket_number, truck_shift_id, vehicle_id, driver_id, client_id, commodity_id,
    gross_weight, gross_at, tare_weight, tare_at,
    plate_confirmed, status, tenant_id
  ) VALUES (
    v_st2, '2025-000002', v_ts7, v_v1, v_d1, v_cli1, v_soj,
    41800.00, NOW() - INTERVAL '3 hours',
    13600.00, NOW() - INTERVAL '2 hours 30 minutes',
    'ABC123', 'finalizado', v_tenant_id
  );

  -- -------------------------------------------------------------------------
  -- Muestra de laboratorio del ticket finalizado (aprobada, G1)
  -- -------------------------------------------------------------------------
  INSERT INTO lab_samples (
    id, sample_number, scale_ticket_id,
    humidity, protein, test_weight, damaged_grains, foreign_matter,
    net_adjustment, grade, status, tenant_id
  ) VALUES (
    v_ls1, 'M-2025-000001', v_st2,
    13.20, 36.80, 75.40, 0.80, 0.30,
    0.50, 'G1', 'aprobado', v_tenant_id
  );

  -- -------------------------------------------------------------------------
  -- Alerta de silo activa (temperatura alta en Silo 2)
  -- -------------------------------------------------------------------------
  INSERT INTO silo_alerts (
    id, silo_id, alert_type, severity, message,
    value, threshold, triggered_at, tenant_id
  ) VALUES (
    v_sa1, v_s2, 'high_temperature', 'warning',
    'Temperatura: 27.3°C — umbral máximo: 25°C',
    27.30, 25.00, NOW() - INTERVAL '2 hours', v_tenant_id
  ) ON CONFLICT (id) DO NOTHING;

END $$;
