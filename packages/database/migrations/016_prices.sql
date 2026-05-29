CREATE TYPE price_condition AS ENUM ('pizarra', 'forward', 'spot', 'canje', 'fijacion');
CREATE TYPE price_currency AS ENUM ('ARS', 'USD');

CREATE TABLE IF NOT EXISTS price_lists (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    commodity_id    UUID             NOT NULL REFERENCES commodities(id),
    condition       price_condition  NOT NULL,
    price_per_ton   DECIMAL(14,4)    NOT NULL,
    currency        price_currency   NOT NULL DEFAULT 'ARS',
    valid_from      DATE             NOT NULL DEFAULT CURRENT_DATE,
    valid_until     DATE,
    delivery_months VARCHAR(50),     -- e.g. "Julio 2025, Agosto 2025" for forward
    is_active       BOOLEAN          NOT NULL DEFAULT TRUE,
    notes           TEXT,
    tenant_id       UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by      UUID             REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_price_lists_updated_at BEFORE UPDATE ON price_lists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_price_lists_tenant      ON price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_commodity   ON price_lists(commodity_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_price_lists_active      ON price_lists(is_active, tenant_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_price_lists_valid       ON price_lists(valid_from, valid_until);

-- Price history (append-only log of price changes)
CREATE TABLE IF NOT EXISTS price_history (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id   UUID             NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    commodity_id    UUID             NOT NULL REFERENCES commodities(id),
    condition       price_condition  NOT NULL,
    price_per_ton   DECIMAL(14,4)    NOT NULL,
    currency        price_currency   NOT NULL,
    recorded_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    tenant_id       UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_price_history_commodity ON price_history(commodity_id, tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_tenant    ON price_history(tenant_id, recorded_at DESC);
