-- =============================================================================
-- Migration 009: Billing (CPEs, Liquidaciones, Facturas, Cuenta Corriente)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- cpes (Carta de Porte Electrónica — AFIP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cpes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cpe_number      VARCHAR(50) NOT NULL UNIQUE,  -- número CPE emitido por AFIP
    ctg_number      VARCHAR(30),                   -- Código de Trazabilidad de Granos (CTG)
    truck_shift_id  UUID        REFERENCES truck_shifts(id) ON DELETE SET NULL,
    scale_ticket_id UUID        REFERENCES scale_tickets(id) ON DELETE SET NULL,
    client_id       UUID        NOT NULL REFERENCES clients(id),
    commodity_id    UUID        NOT NULL REFERENCES commodities(id),
    origin_cuit     VARCHAR(20) NOT NULL,           -- CUIT origen (productor/acopiador)
    destination_cuit VARCHAR(20) NOT NULL,           -- CUIT destino
    origin_province VARCHAR(50),
    destination_province VARCHAR(50),
    estimated_kg    DECIMAL(12, 2),
    real_kg         DECIMAL(12, 2),
    issue_date      DATE,
    valid_until     DATE,
    status          cpe_status  NOT NULL DEFAULT 'borrador',
    afip_response   JSONB,                          -- raw AFIP WS response
    observations    TEXT,
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_cpes_updated_at
    BEFORE UPDATE ON cpes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cpes_tenant_id       ON cpes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cpes_cpe_number      ON cpes(cpe_number);
CREATE INDEX IF NOT EXISTS idx_cpes_ctg_number      ON cpes(ctg_number);
CREATE INDEX IF NOT EXISTS idx_cpes_truck_shift_id  ON cpes(truck_shift_id);
CREATE INDEX IF NOT EXISTS idx_cpes_client_id       ON cpes(client_id);
CREATE INDEX IF NOT EXISTS idx_cpes_status          ON cpes(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_cpes_issue_date      ON cpes(issue_date DESC);

-- ---------------------------------------------------------------------------
-- liquidations (liquidaciones de granos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liquidations (
    id              UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidation_number VARCHAR(30)     NOT NULL UNIQUE,
    client_id       UUID               NOT NULL REFERENCES clients(id),
    commodity_id    UUID               NOT NULL REFERENCES commodities(id),
    period_from     DATE               NOT NULL,
    period_to       DATE               NOT NULL,
    gross_kg        DECIMAL(14, 2)     NOT NULL DEFAULT 0,
    net_kg          DECIMAL(14, 2)     NOT NULL DEFAULT 0,  -- after quality adjustments
    price_per_ton   DECIMAL(12, 4),
    gross_amount    DECIMAL(16, 2)     NOT NULL DEFAULT 0,
    bonus_amount    DECIMAL(14, 2)     NOT NULL DEFAULT 0,
    discount_amount DECIMAL(14, 2)     NOT NULL DEFAULT 0,
    storage_fee     DECIMAL(14, 2)     NOT NULL DEFAULT 0,
    commission      DECIMAL(14, 2)     NOT NULL DEFAULT 0,
    other_charges   DECIMAL(14, 2)     NOT NULL DEFAULT 0,
    net_amount      DECIMAL(16, 2)     NOT NULL DEFAULT 0,
    currency        VARCHAR(3)         NOT NULL DEFAULT 'ARS',
    status          liquidation_status NOT NULL DEFAULT 'borrador',
    notes           TEXT,
    tenant_id       UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by      UUID               REFERENCES users(id) ON DELETE SET NULL,
    approved_by     UUID               REFERENCES users(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_liquidation_period CHECK (period_to >= period_from)
);

CREATE TRIGGER trg_liquidations_updated_at
    BEFORE UPDATE ON liquidations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_liquidations_tenant_id   ON liquidations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_liquidations_client_id   ON liquidations(client_id);
CREATE INDEX IF NOT EXISTS idx_liquidations_status      ON liquidations(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_liquidations_period      ON liquidations(client_id, period_from, period_to);
CREATE INDEX IF NOT EXISTS idx_liquidations_created_at  ON liquidations(created_at DESC);

-- ---------------------------------------------------------------------------
-- liquidation_items (scale tickets included in liquidation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liquidation_items (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidation_id  UUID           NOT NULL REFERENCES liquidations(id) ON DELETE CASCADE,
    scale_ticket_id UUID           NOT NULL REFERENCES scale_tickets(id),
    lab_sample_id   UUID           REFERENCES lab_samples(id) ON DELETE SET NULL,
    gross_kg        DECIMAL(12, 2) NOT NULL,
    tare_kg         DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_kg          DECIMAL(12, 2) NOT NULL,
    humidity        DECIMAL(5, 2),
    net_adjustment  DECIMAL(8, 4),  -- % total adjustment (bonus - discount)
    adjusted_kg     DECIMAL(12, 2), -- net_kg after quality adjustments
    unit_price      DECIMAL(12, 4),
    amount          DECIMAL(14, 2),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_liquidation_ticket UNIQUE (liquidation_id, scale_ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_liquidation_items_liquidation_id  ON liquidation_items(liquidation_id);
CREATE INDEX IF NOT EXISTS idx_liquidation_items_scale_ticket_id ON liquidation_items(scale_ticket_id);
CREATE INDEX IF NOT EXISTS idx_liquidation_items_tenant_id       ON liquidation_items(tenant_id);

-- ---------------------------------------------------------------------------
-- invoices (facturas emitidas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number  VARCHAR(30)    NOT NULL UNIQUE,  -- e.g. '0001-00001234'
    invoice_type    VARCHAR(5)     NOT NULL,          -- 'A', 'B', 'C', 'E', 'MiPyME'
    client_id       UUID           NOT NULL REFERENCES clients(id),
    liquidation_id  UUID           REFERENCES liquidations(id) ON DELETE SET NULL,
    issue_date      DATE           NOT NULL,
    due_date        DATE,
    subtotal        DECIMAL(16, 2) NOT NULL DEFAULT 0,
    iva_amount      DECIMAL(14, 2) NOT NULL DEFAULT 0,
    iva_rate        DECIMAL(5, 2)  NOT NULL DEFAULT 21.00,  -- %
    other_taxes     DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total           DECIMAL(16, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'ARS',
    cae_number      VARCHAR(20),    -- AFIP CAE
    cae_expiry      DATE,
    afip_response   JSONB,
    status          invoice_status NOT NULL DEFAULT 'borrador',
    notes           TEXT,
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by      UUID           REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id      ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id      ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status         ON invoices(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date     ON invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date       ON invoices(due_date) WHERE status NOT IN ('pagada', 'anulada');
CREATE INDEX IF NOT EXISTS idx_invoices_cae_number     ON invoices(cae_number);

-- ---------------------------------------------------------------------------
-- invoice_items (detail lines of an invoice)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description     VARCHAR(255)   NOT NULL,
    quantity        DECIMAL(12, 4) NOT NULL DEFAULT 1,
    unit_price      DECIMAL(14, 4) NOT NULL,
    iva_rate        DECIMAL(5, 2)  NOT NULL DEFAULT 21.00,
    subtotal        DECIMAL(16, 2) NOT NULL,
    sort_order      SMALLINT       NOT NULL DEFAULT 0,
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id  ON invoice_items(tenant_id);

-- ---------------------------------------------------------------------------
-- account_movements (cuenta corriente de clientes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_movements (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID           NOT NULL REFERENCES clients(id),
    movement_type   VARCHAR(30)    NOT NULL,   -- 'factura', 'pago', 'nota_credito', 'nota_debito', 'ajuste'
    reference_type  VARCHAR(30),               -- 'invoice', 'liquidation', 'manual'
    reference_id    UUID,                       -- FK to invoice or liquidation
    debit           DECIMAL(16, 2) NOT NULL DEFAULT 0,    -- amount owed by client
    credit          DECIMAL(16, 2) NOT NULL DEFAULT 0,    -- payment / credit
    balance_after   DECIMAL(16, 2) NOT NULL,              -- running balance
    currency        VARCHAR(3)     NOT NULL DEFAULT 'ARS',
    description     TEXT,
    document_number VARCHAR(50),
    movement_date   DATE           NOT NULL DEFAULT CURRENT_DATE,
    user_id         UUID           REFERENCES users(id) ON DELETE SET NULL,
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_account_movement_amounts CHECK (
        (debit >= 0 AND credit >= 0) AND (debit > 0 OR credit > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_account_movements_tenant_id    ON account_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_client_id    ON account_movements(client_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_movement_date ON account_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_account_movements_reference    ON account_movements(reference_type, reference_id);
