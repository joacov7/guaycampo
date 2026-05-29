CREATE TYPE remito_type AS ENUM ('entrada', 'salida', 'transferencia');
CREATE TYPE remito_status AS ENUM ('borrador', 'emitido', 'firmado', 'anulado');

CREATE TABLE IF NOT EXISTS remitos (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    remito_number   VARCHAR(30)     NOT NULL,
    remito_type     remito_type     NOT NULL,
    client_id       UUID            NOT NULL REFERENCES clients(id),
    vehicle_id      UUID            REFERENCES vehicles(id) ON DELETE SET NULL,
    driver_id       UUID            REFERENCES drivers(id) ON DELETE SET NULL,
    commodity_id    UUID            NOT NULL REFERENCES commodities(id),
    scale_ticket_id UUID            REFERENCES scale_tickets(id) ON DELETE SET NULL,
    gross_weight_kg DECIMAL(12,2),
    tare_weight_kg  DECIMAL(12,2),
    net_weight_kg   DECIMAL(12,2),
    origin          VARCHAR(200),
    destination     VARCHAR(200),
    issue_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
    signature_data  TEXT,
    signed_at       TIMESTAMPTZ,
    signer_name     VARCHAR(200),
    status          remito_status   NOT NULL DEFAULT 'borrador',
    notes           TEXT,
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by      UUID            REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_remito_number_tenant UNIQUE (remito_number, tenant_id)
);
CREATE TRIGGER trg_remitos_updated_at BEFORE UPDATE ON remitos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_remitos_tenant    ON remitos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remitos_client    ON remitos(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_remitos_status    ON remitos(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_remitos_date      ON remitos(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_remitos_ticket    ON remitos(scale_ticket_id) WHERE scale_ticket_id IS NOT NULL;
