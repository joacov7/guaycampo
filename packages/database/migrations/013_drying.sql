-- Secadoras (dryers)
CREATE TABLE IF NOT EXISTS dryers (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(20)  NOT NULL,
    capacity_ton_h  DECIMAL(8,2),
    fuel_type       VARCHAR(30) DEFAULT 'gas',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dryer_code_tenant UNIQUE (code, tenant_id)
);
CREATE TRIGGER trg_dryers_updated_at BEFORE UPDATE ON dryers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_dryers_tenant ON dryers(tenant_id);

-- Lotes de secado
CREATE TABLE IF NOT EXISTS drying_batches (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number        VARCHAR(30) NOT NULL,
    dryer_id            UUID        REFERENCES dryers(id) ON DELETE SET NULL,
    scale_ticket_id     UUID        REFERENCES scale_tickets(id) ON DELETE SET NULL,
    client_id           UUID        NOT NULL REFERENCES clients(id),
    commodity_id        UUID        NOT NULL REFERENCES commodities(id),
    input_weight_kg     DECIMAL(12,2) NOT NULL,
    output_weight_kg    DECIMAL(12,2),
    input_humidity_pct  DECIMAL(5,2) NOT NULL,
    output_humidity_pct DECIMAL(5,2),
    target_humidity_pct DECIMAL(5,2) NOT NULL DEFAULT 14.0,
    shrinkage_pct       DECIMAL(6,4) GENERATED ALWAYS AS (
        CASE WHEN output_weight_kg IS NOT NULL AND input_weight_kg > 0
             THEN ROUND(((input_weight_kg - output_weight_kg) / input_weight_kg * 100)::NUMERIC, 4)
             ELSE NULL END
    ) STORED,
    cost_per_ton        DECIMAL(12,4),
    total_cost          DECIMAL(14,2),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'en_proceso',
    notes               TEXT,
    operator_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_batch_number_tenant UNIQUE (batch_number, tenant_id),
    CONSTRAINT chk_humidity_range CHECK (
        input_humidity_pct BETWEEN 0 AND 50 AND
        (output_humidity_pct IS NULL OR output_humidity_pct BETWEEN 0 AND 50)
    )
);
CREATE TRIGGER trg_drying_batches_updated_at BEFORE UPDATE ON drying_batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_drying_batches_tenant ON drying_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drying_batches_client ON drying_batches(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_drying_batches_status ON drying_batches(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_drying_batches_started ON drying_batches(started_at DESC);
