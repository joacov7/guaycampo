-- =============================================================================
-- GuayCampo - PostgreSQL initialization
-- Runs automatically on first container start
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- For fuzzy text search (plates, names)
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- For accent-insensitive search

-- Create additional schemas for multitenancy (optional - used alongside row-level tenancy)
-- Each tenant can optionally get their own schema for full isolation
-- CREATE SCHEMA IF NOT EXISTS tenant_template;

-- Performance settings for development
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_min_duration_statement = '1000';  -- Log queries >1s

-- Create a read-only user for reporting tools
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'guaycampo_readonly') THEN
    CREATE ROLE guaycampo_readonly WITH LOGIN PASSWORD 'readonly_password';
    GRANT CONNECT ON DATABASE guaycampo_dev TO guaycampo_readonly;
    GRANT USAGE ON SCHEMA public TO guaycampo_readonly;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO guaycampo_readonly;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO guaycampo_readonly;
  END IF;
END
$$;

-- Useful indexes for full-text search (applied after Prisma migrate creates tables)
-- These will be managed via Prisma migrations in production
-- Example:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_plate_trgm
--   ON vehicles USING gin (plate gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_drivers_fullname_trgm
--   ON drivers USING gin (full_name gin_trgm_ops);

\echo '==> GuayCampo database initialized successfully'
