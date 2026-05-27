-- =============================================================================
-- Migration 004: Transport (Companies, Vehicles, Drivers)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- transport_companies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transport_companies (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,
    cuit          VARCHAR(20)  NOT NULL,
    address       TEXT,
    contact_phone VARCHAR(30),
    tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_transport_companies_updated_at
    BEFORE UPDATE ON transport_companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_transport_companies_tenant_id ON transport_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transport_companies_cuit      ON transport_companies(cuit);

-- ---------------------------------------------------------------------------
-- Function to enforce uppercase on plates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_uppercase_plate()
RETURNS TRIGGER AS $$
BEGIN
  NEW.plate = UPPER(TRIM(NEW.plate));
  IF NEW.plate_trailer IS NOT NULL THEN
    NEW.plate_trailer = UPPER(TRIM(NEW.plate_trailer));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id                   UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    plate                VARCHAR(20)    NOT NULL,
    plate_trailer        VARCHAR(20),
    vehicle_type         vehicle_type   NOT NULL,
    tara_kg              DECIMAL(10, 2),
    capacity_kg          DECIMAL(10, 2),
    brand                VARCHAR(100),
    model                VARCHAR(100),
    year                 SMALLINT,
    insurance_exp        DATE,
    vtv_exp              DATE,
    tenant_id            UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transport_company_id UUID           REFERENCES transport_companies(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    -- plate must be uppercase letters, digits and optionally hyphens
    CONSTRAINT chk_plate_uppercase CHECK (plate = UPPER(plate))
);

CREATE TRIGGER trg_vehicles_uppercase_plate
    BEFORE INSERT OR UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION enforce_uppercase_plate();

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate     ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_trailer ON vehicles(plate_trailer);

-- GIN index for fuzzy search on plate using trigrams
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_trgm
    ON vehicles USING gin(plate gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- drivers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    dni                  VARCHAR(15)   NOT NULL,
    full_name            VARCHAR(255)  NOT NULL,
    phone                VARCHAR(30)   NOT NULL,
    license_number       VARCHAR(30),
    license_exp          DATE,
    rating               DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    status               driver_status NOT NULL DEFAULT 'active',
    tenant_id            UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transport_company_id UUID          REFERENCES transport_companies(id) ON DELETE SET NULL,
    vehicle_id           UUID          REFERENCES vehicles(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_dni       ON drivers(dni);
CREATE INDEX IF NOT EXISTS idx_drivers_phone     ON drivers(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_status    ON drivers(status, tenant_id);

-- GIN index for fuzzy search on driver name
CREATE INDEX IF NOT EXISTS idx_drivers_full_name_trgm
    ON drivers USING gin(full_name gin_trgm_ops);
