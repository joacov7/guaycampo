-- =============================================================================
-- Migration 005: Clients and Commodities
-- =============================================================================

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)   NOT NULL,
    cuit            VARCHAR(20)    NOT NULL,
    client_type     client_type,
    address         TEXT,
    locality        VARCHAR(100),
    province        VARCHAR(100),
    iva_condition   iva_condition,
    current_account DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_limit    DECIMAL(15, 2),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_cuit      ON clients(cuit);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_cuit_tenant ON clients(cuit, tenant_id);

-- GIN full-text index for name search
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
    ON clients USING gin(name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- commodities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commodities (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    code           VARCHAR(10)  NOT NULL UNIQUE,
    quality_params JSONB,
    unit           VARCHAR(10)  NOT NULL DEFAULT 'kg',
    tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_commodities_updated_at
    BEFORE UPDATE ON commodities
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_commodities_tenant_id ON commodities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commodities_code      ON commodities(code);

-- ---------------------------------------------------------------------------
-- quality_parameters (bonuses/discounts configuration per commodity + criterion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quality_parameters (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id   UUID          NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100)  NOT NULL,
    base_value     DECIMAL(10, 4),
    tolerance_low  DECIMAL(10, 4),
    tolerance_high DECIMAL(10, 4),
    bonus_rate     DECIMAL(8, 6),  -- % bonus per unit above base
    discount_rate  DECIMAL(8, 6),  -- % discount per unit below base
    max_bonus      DECIMAL(8, 4),  -- max bonus %
    max_discount   DECIMAL(8, 4),  -- max discount %
    reject_below   DECIMAL(10, 4), -- reject sample if below this value
    reject_above   DECIMAL(10, 4), -- reject sample if above this value
    unit           VARCHAR(20)   NOT NULL DEFAULT '%',
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    norm_reference VARCHAR(100),  -- e.g. 'SAGPyA Res 1262/2004'
    tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_quality_parameters_updated_at
    BEFORE UPDATE ON quality_parameters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_quality_params_commodity_id ON quality_parameters(commodity_id);
CREATE INDEX IF NOT EXISTS idx_quality_params_tenant_id    ON quality_parameters(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_params_commodity_name
    ON quality_parameters(commodity_id, parameter_name, tenant_id);
