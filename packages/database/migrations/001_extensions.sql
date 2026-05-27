-- =============================================================================
-- Migration 001: PostgreSQL Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- TimescaleDB para series de tiempo IoT
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
