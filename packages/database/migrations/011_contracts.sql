-- =============================================================================
-- Migration 011: Contratos de compra/venta de granos
-- =============================================================================

CREATE TYPE contract_type AS ENUM ('compra', 'venta', 'canje', 'deposito');
CREATE TYPE contract_price_condition AS ENUM ('fijado', 'a_fijar', 'canje', 'mercado');
CREATE TYPE contract_status AS ENUM ('borrador', 'activo', 'cumplido', 'vencido', 'cancelado');

CREATE TABLE IF NOT EXISTS contracts (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number     VARCHAR(30)             NOT NULL,
    client_id           UUID                    NOT NULL REFERENCES clients(id),
    commodity_id        UUID                    NOT NULL REFERENCES commodities(id),
    contract_type       contract_type           NOT NULL,
    price_condition     contract_price_condition NOT NULL DEFAULT 'fijado',
    price_per_ton       DECIMAL(14, 4),
    currency            VARCHAR(3)              NOT NULL DEFAULT 'ARS',
    quantity_ton        DECIMAL(14, 2)          NOT NULL,
    fulfilled_ton       DECIMAL(14, 2)          NOT NULL DEFAULT 0,
    from_date           DATE                    NOT NULL,
    to_date             DATE                    NOT NULL,
    status              contract_status         NOT NULL DEFAULT 'borrador',
    notes               TEXT,
    tenant_id           UUID                    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by          UUID                    REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contract_number_tenant UNIQUE (contract_number, tenant_id),
    CONSTRAINT chk_contract_dates        CHECK (to_date >= from_date),
    CONSTRAINT chk_contract_quantity     CHECK (quantity_ton > 0),
    CONSTRAINT chk_contract_fulfilled    CHECK (fulfilled_ton >= 0 AND fulfilled_ton <= quantity_ton)
);

CREATE TRIGGER trg_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id   ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id   ON contracts(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status      ON contracts(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_to_date     ON contracts(to_date) WHERE status = 'activo';
CREATE INDEX IF NOT EXISTS idx_contracts_commodity   ON contracts(commodity_id, tenant_id);

-- Link scale tickets to contracts (optional FK)
ALTER TABLE scale_tickets
    ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_scale_tickets_contract ON scale_tickets(contract_id) WHERE contract_id IS NOT NULL;
