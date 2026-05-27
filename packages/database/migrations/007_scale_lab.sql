-- =============================================================================
-- Migration 007: Scale Tickets, Scale Devices, Lab Samples, Lab Analyzers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- scale_devices
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scale_devices (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    serial_no    VARCHAR(100),
    model        VARCHAR(100),
    ip_address   INET,
    port         INT,
    protocol     VARCHAR(30)  NOT NULL DEFAULT 'modbus_tcp',
    max_capacity DECIMAL(10, 2),
    precision_kg DECIMAL(8, 4),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    last_seen    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_scale_devices_updated_at
    BEFORE UPDATE ON scale_devices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scale_devices_tenant_id ON scale_devices(tenant_id);

-- ---------------------------------------------------------------------------
-- scale_tickets
-- net_weight is computed as (gross_weight - tare_weight)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scale_tickets (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number   VARCHAR(50)   NOT NULL UNIQUE,
    truck_shift_id  UUID          REFERENCES truck_shifts(id) ON DELETE SET NULL,
    vehicle_id      UUID          NOT NULL REFERENCES vehicles(id),
    driver_id       UUID          NOT NULL REFERENCES drivers(id),
    client_id       UUID          NOT NULL REFERENCES clients(id),
    commodity_id    UUID          NOT NULL REFERENCES commodities(id),
    scale_device_id UUID          REFERENCES scale_devices(id) ON DELETE SET NULL,
    gross_weight    DECIMAL(10, 2),
    gross_at        TIMESTAMPTZ,
    gross_photo_url TEXT,
    tare_weight     DECIMAL(10, 2),
    tare_at         TIMESTAMPTZ,
    tare_photo_url  TEXT,
    -- Computed column: gross_weight - tare_weight (STORED)
    net_weight      DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE
            WHEN gross_weight IS NOT NULL AND tare_weight IS NOT NULL
            THEN gross_weight - tare_weight
            ELSE NULL
        END
    ) STORED,
    plate_detected  VARCHAR(20),
    plate_confirmed VARCHAR(20),
    ocr_confidence  DECIMAL(5, 4),
    status          scale_status  NOT NULL DEFAULT 'pendiente',
    observations    TEXT,
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_scale_tickets_updated_at
    BEFORE UPDATE ON scale_tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scale_tickets_tenant_id      ON scale_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scale_tickets_ticket_number  ON scale_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_scale_tickets_status         ON scale_tickets(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_scale_tickets_client_id      ON scale_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_scale_tickets_truck_shift_id ON scale_tickets(truck_shift_id);
CREATE INDEX IF NOT EXISTS idx_scale_tickets_created_at     ON scale_tickets(created_at DESC);

-- ---------------------------------------------------------------------------
-- lab_analyzers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_analyzers (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(100) NOT NULL,
    serial_no    VARCHAR(100),
    model        VARCHAR(100),
    manufacturer VARCHAR(100),
    parameters   JSONB        NOT NULL DEFAULT '[]',  -- list of parameters this analyzer measures
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    last_seen    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_lab_analyzers_updated_at
    BEFORE UPDATE ON lab_analyzers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lab_analyzers_tenant_id ON lab_analyzers(tenant_id);

-- ---------------------------------------------------------------------------
-- lab_samples
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_samples (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_number   VARCHAR(50)   NOT NULL UNIQUE,
    scale_ticket_id UUID          NOT NULL REFERENCES scale_tickets(id),
    analyzer_id     UUID          REFERENCES lab_analyzers(id) ON DELETE SET NULL,
    taken_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    humidity        DECIMAL(5, 2),
    protein         DECIMAL(5, 2),
    oil             DECIMAL(5, 2),
    gluten          DECIMAL(5, 2),
    falling_number  INT,
    test_weight     DECIMAL(6, 2),   -- peso hectolítrico (kg/hl)
    damaged_grains  DECIMAL(5, 2),   -- granos dañados %
    foreign_matter  DECIMAL(5, 2),   -- materias extrañas %
    broken_grains   DECIMAL(5, 2),   -- granos quebrados %
    bonuses         JSONB,           -- {parameter: {rate, value}}
    discounts       JSONB,           -- {parameter: {rate, value}}
    net_adjustment  DECIMAL(8, 4),   -- net +/- adjustment %
    grade           VARCHAR(20),
    status          lab_status    NOT NULL DEFAULT 'pendiente',
    rejection_cause TEXT,
    raw_data        JSONB,
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_lab_samples_updated_at
    BEFORE UPDATE ON lab_samples
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lab_samples_tenant_id       ON lab_samples(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_scale_ticket_id ON lab_samples(scale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_status          ON lab_samples(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_lab_samples_taken_at        ON lab_samples(taken_at DESC);
