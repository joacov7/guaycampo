-- =============================================================================
-- Migration 010: Audit Log (append-only, monthly partitions)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- audit_log — partitioned by time (monthly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id            UUID         DEFAULT gen_random_uuid(),
    time          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    tenant_id     UUID,
    user_id       UUID,
    user_email    VARCHAR(255),
    action        VARCHAR(100) NOT NULL,   -- 'create', 'update', 'delete', 'login', 'logout', etc.
    resource_type VARCHAR(50)  NOT NULL,   -- 'truck_shift', 'scale_ticket', 'invoice', etc.
    resource_id   VARCHAR(100),
    changes       JSONB,                   -- {field: {old, new}} for updates
    ip_address    INET,
    user_agent    TEXT,
    request_id    UUID
) PARTITION BY RANGE (time);

-- 2025 partitions
CREATE TABLE IF NOT EXISTS audit_log_2025_01 PARTITION OF audit_log FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_02 PARTITION OF audit_log FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_03 PARTITION OF audit_log FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_04 PARTITION OF audit_log FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_05 PARTITION OF audit_log FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_06 PARTITION OF audit_log FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_07 PARTITION OF audit_log FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_08 PARTITION OF audit_log FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_09 PARTITION OF audit_log FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_10 PARTITION OF audit_log FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_11 PARTITION OF audit_log FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS audit_log_2025_12 PARTITION OF audit_log FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 2026 partitions
CREATE TABLE IF NOT EXISTS audit_log_2026_01 PARTITION OF audit_log FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_02 PARTITION OF audit_log FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_03 PARTITION OF audit_log FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_04 PARTITION OF audit_log FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_05 PARTITION OF audit_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_06 PARTITION OF audit_log FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_07 PARTITION OF audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_08 PARTITION OF audit_log FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_09 PARTITION OF audit_log FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_10 PARTITION OF audit_log FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_11 PARTITION OF audit_log FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS audit_log_2026_12 PARTITION OF audit_log FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Index on each partition (partition-wise index)
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id    ON audit_log(tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id      ON audit_log(user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource     ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action       ON audit_log(action, time DESC);

-- ---------------------------------------------------------------------------
-- Function: auto-create monthly audit_log partition
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_audit_partition(year INT, month INT)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date     DATE;
    end_date       DATE;
BEGIN
    partition_name := FORMAT('audit_log_%s_%s', year, LPAD(month::TEXT, 2, '0'));
    start_date     := TO_DATE(FORMAT('%s-%s-01', year, LPAD(month::TEXT, 2, '0')), 'YYYY-MM-DD');
    end_date       := start_date + INTERVAL '1 month';

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
          AND n.nspname = 'public'
    ) THEN
        EXECUTE FORMAT(
            'CREATE TABLE %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Created audit partition: %', partition_name;
    ELSE
        RAISE NOTICE 'Partition already exists: %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Generic audit trigger function — attach to any table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB := NULL;
    resource_id  TEXT;
BEGIN
    -- Determine resource_id
    resource_id := (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::TEXT;

    -- For UPDATE, compute field-level changes
    IF TG_OP = 'UPDATE' THEN
        SELECT jsonb_object_agg(
            key,
            jsonb_build_object(
                'old', old_val,
                'new', new_val
            )
        )
        INTO changes_json
        FROM (
            SELECT
                key,
                old_row -> key AS old_val,
                new_row -> key AS new_val
            FROM
                jsonb_each(to_jsonb(OLD)) AS t(key, old_val)
                CROSS JOIN LATERAL (SELECT to_jsonb(NEW) AS new_row) nr
                CROSS JOIN LATERAL (SELECT to_jsonb(OLD) AS old_row) or2
            WHERE old_row -> key IS DISTINCT FROM new_row -> key
              AND key NOT IN ('updated_at')
        ) diffs;
    ELSIF TG_OP = 'DELETE' THEN
        changes_json := to_jsonb(OLD);
    END IF;

    -- Insert into audit_log
    INSERT INTO audit_log (
        time,
        tenant_id,
        user_id,
        user_email,
        action,
        resource_type,
        resource_id,
        changes,
        request_id
    ) VALUES (
        NOW(),
        NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID,
        NULLIF(current_setting('app.current_user_id',   TRUE), '')::UUID,
        NULLIF(current_setting('app.current_user_email',TRUE), ''),
        LOWER(TG_OP),          -- 'insert', 'update', 'delete'
        TG_TABLE_NAME,
        resource_id,
        changes_json,
        NULLIF(current_setting('app.request_id', TRUE), '')::UUID
    );

    RETURN NULL;  -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Apply audit trigger to key tables
-- ---------------------------------------------------------------------------
CREATE TRIGGER audit_truck_shifts
    AFTER INSERT OR UPDATE OR DELETE ON truck_shifts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_scale_tickets
    AFTER INSERT OR UPDATE OR DELETE ON scale_tickets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_lab_samples
    AFTER INSERT OR UPDATE OR DELETE ON lab_samples
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_liquidations
    AFTER INSERT OR UPDATE OR DELETE ON liquidations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
