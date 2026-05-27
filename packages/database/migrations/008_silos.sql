-- =============================================================================
-- Migration 008: Silos, IoT Readings (TimescaleDB), Alerts, Movements, Devices
-- =============================================================================

-- ---------------------------------------------------------------------------
-- silo_devices (IoT sensors/controllers per silo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS silo_devices (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id      UUID         NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
    device_code  VARCHAR(50)  NOT NULL,
    device_type  VARCHAR(50)  NOT NULL,  -- 'temperature', 'humidity', 'level', 'co2', 'gateway'
    firmware     VARCHAR(30),
    ip_address   INET,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen    TIMESTAMPTZ,
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_silo_devices_updated_at
    BEFORE UPDATE ON silo_devices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_silo_devices_silo_id   ON silo_devices(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_devices_tenant_id ON silo_devices(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_silo_devices_code_tenant ON silo_devices(device_code, tenant_id);

-- ---------------------------------------------------------------------------
-- silos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS silos (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100)  NOT NULL,
    silo_type     VARCHAR(50)   NOT NULL,  -- 'silo_bolsa', 'silo_metalico', 'celda', 'playa'
    capacity_ton  DECIMAL(10, 2) NOT NULL,
    current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
    commodity_id  UUID          REFERENCES commodities(id) ON DELETE SET NULL,
    location_lat  DECIMAL(10, 8),
    location_lng  DECIMAL(11, 8),
    sector        VARCHAR(50),
    status        silo_status   NOT NULL DEFAULT 'operativo',
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_silo_stock CHECK (current_stock >= 0 AND current_stock <= capacity_ton)
);

CREATE TRIGGER trg_silos_updated_at
    BEFORE UPDATE ON silos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_silos_tenant_id   ON silos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_silos_status      ON silos(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_silos_commodity   ON silos(commodity_id);

-- ---------------------------------------------------------------------------
-- silo_readings — TimescaleDB hypertable for IoT time-series data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS silo_readings (
    time            TIMESTAMPTZ   NOT NULL,
    silo_id         UUID          NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
    sensor_type     VARCHAR(30)   NOT NULL,   -- 'temperature', 'humidity', 'co2', 'level', 'weight'
    sensor_position VARCHAR(10),              -- e.g. 'T1', 'T2', 'B1' (top/bottom positions)
    value           DECIMAL(10, 4) NOT NULL,
    unit            VARCHAR(10),              -- 'C', '%', 'ppm', 'm', 'ton'
    quality         SMALLINT      NOT NULL DEFAULT 100,  -- 0-100 data quality score
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

-- Convert to TimescaleDB hypertable, partitioned by time (1 day chunks)
SELECT create_hypertable('silo_readings', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Data retention policy: keep raw data for 2 years
SELECT add_retention_policy('silo_readings', INTERVAL '2 years', if_not_exists => TRUE);

-- Compression: compress chunks older than 7 days
ALTER TABLE silo_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'silo_id,sensor_type',
    timescaledb.compress_orderby   = 'time DESC'
);
SELECT add_compression_policy('silo_readings', INTERVAL '7 days', if_not_exists => TRUE);

-- Indexes on hypertable
CREATE INDEX IF NOT EXISTS idx_silo_readings_silo_id  ON silo_readings(silo_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_silo_readings_tenant   ON silo_readings(tenant_id, time DESC);

-- ---------------------------------------------------------------------------
-- Continuous aggregate: hourly averages for dashboard charts
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS silo_hourly_avg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time)  AS hour,
    silo_id,
    sensor_type,
    AVG(value)                   AS avg_value,
    MIN(value)                   AS min_value,
    MAX(value)                   AS max_value,
    COUNT(*)                     AS reading_count
FROM silo_readings
GROUP BY 1, 2, 3
WITH NO DATA;

SELECT add_continuous_aggregate_policy('silo_hourly_avg',
    start_offset    => INTERVAL '3 hours',
    end_offset      => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists   => TRUE);

-- ---------------------------------------------------------------------------
-- silo_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS silo_alerts (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id         UUID          NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
    alert_type      VARCHAR(50)   NOT NULL,   -- 'high_temperature', 'high_humidity', 'co2_level', 'stock_low'
    severity        alert_severity NOT NULL,
    message         TEXT          NOT NULL,
    value           DECIMAL(10, 2),
    threshold       DECIMAL(10, 2),
    triggered_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID          REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_silo_alerts_tenant_id    ON silo_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_silo_alerts_silo_id      ON silo_alerts(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_alerts_severity     ON silo_alerts(severity, tenant_id);
CREATE INDEX IF NOT EXISTS idx_silo_alerts_triggered_at ON silo_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_silo_alerts_unresolved   ON silo_alerts(tenant_id, resolved_at) WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------
-- silo_movements (stock in/out tracking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS silo_movements (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    silo_id         UUID          NOT NULL REFERENCES silos(id) ON DELETE CASCADE,
    movement_type   movement_type NOT NULL,
    quantity_kg     DECIMAL(12, 2) NOT NULL,
    scale_ticket_id UUID          REFERENCES scale_tickets(id) ON DELETE SET NULL,
    destination_silo_id UUID      REFERENCES silos(id) ON DELETE SET NULL,  -- for traslados
    observations    TEXT,
    user_id         UUID          REFERENCES users(id) ON DELETE SET NULL,
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_movement_qty CHECK (quantity_kg > 0)
);

CREATE INDEX IF NOT EXISTS idx_silo_movements_tenant_id       ON silo_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_silo_movements_silo_id         ON silo_movements(silo_id);
CREATE INDEX IF NOT EXISTS idx_silo_movements_scale_ticket_id ON silo_movements(scale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_silo_movements_created_at      ON silo_movements(created_at DESC);
