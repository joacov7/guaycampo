-- =============================================================================
-- Migration 006: Shifts, TruckShifts and Queue
-- =============================================================================

-- ---------------------------------------------------------------------------
-- shift_schedules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shift_schedules (
    id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    date           DATE           NOT NULL,
    commodity_id   UUID           NOT NULL REFERENCES commodities(id),
    operation_type operation_type NOT NULL,
    total_slots    INT            NOT NULL,
    used_slots     INT            NOT NULL DEFAULT 0,
    time_from      TIME,
    time_to        TIME,
    status         shift_status   NOT NULL DEFAULT 'open',
    tenant_id      UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_shift_slots CHECK (used_slots >= 0 AND used_slots <= total_slots)
);

CREATE TRIGGER trg_shift_schedules_updated_at
    BEFORE UPDATE ON shift_schedules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_shift_schedules_tenant_id ON shift_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date      ON shift_schedules(date, tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_status    ON shift_schedules(status, tenant_id);

-- UNIQUE: one schedule per date+commodity+operation+tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_schedules_unique
    ON shift_schedules(date, commodity_id, operation_type, tenant_id);

-- ---------------------------------------------------------------------------
-- truck_shifts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truck_shifts (
    id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id      UUID              NOT NULL REFERENCES shift_schedules(id),
    vehicle_id    UUID              NOT NULL REFERENCES vehicles(id),
    driver_id     UUID              NOT NULL REFERENCES drivers(id),
    client_id     UUID              NOT NULL REFERENCES clients(id),
    commodity_id  UUID              NOT NULL REFERENCES commodities(id),
    estimated_qty DECIMAL(12, 2),
    cpe_number    VARCHAR(50),
    status        truck_shift_status NOT NULL DEFAULT 'pendiente',
    qr_code       VARCHAR(255)      UNIQUE,
    checkin_at    TIMESTAMPTZ,
    checkout_at   TIMESTAMPTZ,
    tenant_id     UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_truck_shifts_updated_at
    BEFORE UPDATE ON truck_shifts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_truck_shifts_tenant_id    ON truck_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_truck_shifts_shift_id     ON truck_shifts(shift_id);
CREATE INDEX IF NOT EXISTS idx_truck_shifts_status       ON truck_shifts(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_truck_shifts_driver_id    ON truck_shifts(driver_id);
CREATE INDEX IF NOT EXISTS idx_truck_shifts_vehicle_id   ON truck_shifts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_truck_shifts_client_id    ON truck_shifts(client_id);
CREATE INDEX IF NOT EXISTS idx_truck_shifts_created_at   ON truck_shifts(created_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger: update used_slots when truck_shift finalizes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_shift_used_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes TO 'finalizado'
  IF NEW.status = 'finalizado' AND (OLD.status IS NULL OR OLD.status <> 'finalizado') THEN
    UPDATE shift_schedules
    SET used_slots = used_slots + 1
    WHERE id = NEW.shift_id
      AND used_slots < total_slots;
  END IF;

  -- If status changes FROM 'finalizado' back to something else, decrement
  IF OLD.status = 'finalizado' AND NEW.status <> 'finalizado' THEN
    UPDATE shift_schedules
    SET used_slots = GREATEST(used_slots - 1, 0)
    WHERE id = NEW.shift_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_truck_shifts_update_used_slots
    AFTER UPDATE ON truck_shifts
    FOR EACH ROW EXECUTE FUNCTION update_shift_used_slots();

-- ---------------------------------------------------------------------------
-- queue_positions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS queue_positions (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_shift_id UUID        NOT NULL UNIQUE REFERENCES truck_shifts(id) ON DELETE CASCADE,
    position       INT         NOT NULL,
    parking_zone   VARCHAR(20),
    called_at      TIMESTAMPTZ,
    entered_at     TIMESTAMPTZ,
    estimated_wait INT,  -- minutes
    priority       INT         NOT NULL DEFAULT 0,
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_queue_positions_updated_at
    BEFORE UPDATE ON queue_positions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_queue_positions_tenant_id      ON queue_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_queue_positions_position       ON queue_positions(position, tenant_id);
CREATE INDEX IF NOT EXISTS idx_queue_positions_truck_shift_id ON queue_positions(truck_shift_id);
