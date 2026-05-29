-- =============================================================================
-- Migration 015: Certificados de Calidad
-- =============================================================================

CREATE TYPE certificate_status AS ENUM ('borrador', 'emitido', 'anulado');

CREATE TABLE IF NOT EXISTS quality_certificates (
    id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_number  VARCHAR(30)        NOT NULL,
    lab_sample_id       UUID               NOT NULL REFERENCES lab_samples(id),
    scale_ticket_id     UUID               REFERENCES scale_tickets(id) ON DELETE SET NULL,
    client_id           UUID               NOT NULL REFERENCES clients(id),
    commodity_id        UUID               NOT NULL REFERENCES commodities(id),
    -- Quality parameters snapshot (at time of issuance)
    humidity_pct        DECIMAL(5,2),
    protein_pct         DECIMAL(5,2),
    oil_pct             DECIMAL(5,2),
    test_weight_kg_hl   DECIMAL(5,2),
    impurities_pct      DECIMAL(5,2),
    damaged_grains_pct  DECIMAL(5,2),
    foreign_matter_pct  DECIMAL(5,2),
    grade               VARCHAR(10),
    net_adjustment_pct  DECIMAL(8,4),
    -- Certificate metadata
    gross_weight_kg     DECIMAL(12,2),
    net_weight_kg       DECIMAL(12,2),
    issue_date          DATE               NOT NULL DEFAULT CURRENT_DATE,
    valid_until         DATE,
    issued_by           UUID               REFERENCES users(id) ON DELETE SET NULL,
    issuer_name         VARCHAR(200),
    qr_token            VARCHAR(100)       UNIQUE,  -- for QR verification URL
    status              certificate_status NOT NULL DEFAULT 'borrador',
    notes               TEXT,
    tenant_id           UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cert_number_tenant UNIQUE (certificate_number, tenant_id)
);
CREATE TRIGGER trg_quality_certificates_updated_at BEFORE UPDATE ON quality_certificates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_quality_certs_tenant    ON quality_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_certs_client    ON quality_certificates(client_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_certs_sample    ON quality_certificates(lab_sample_id);
CREATE INDEX IF NOT EXISTS idx_quality_certs_qr        ON quality_certificates(qr_token);
CREATE INDEX IF NOT EXISTS idx_quality_certs_status    ON quality_certificates(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_quality_certs_date      ON quality_certificates(issue_date DESC);
