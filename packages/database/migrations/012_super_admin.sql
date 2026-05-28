-- =============================================================================
-- Migration 012: Super Admin
-- =============================================================================

-- Super admin flag on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = TRUE;

-- Tenant usage metrics view
CREATE OR REPLACE VIEW tenant_metrics AS
SELECT
    t.id,
    t.slug,
    t.name,
    t.cuit,
    t.plan,
    t.status,
    t.created_at,
    COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active') AS active_users,
    COUNT(DISTINCT st.id) FILTER (WHERE st.created_at >= NOW() - INTERVAL '30 days') AS tickets_last_30d,
    COUNT(DISTINCT st.id) FILTER (WHERE st.created_at >= NOW() - INTERVAL '7 days') AS tickets_last_7d,
    COUNT(DISTINCT st.id) AS tickets_total,
    COALESCE(SUM(st.gross_weight_kg) FILTER (WHERE st.created_at >= NOW() - INTERVAL '30 days') / 1000.0, 0) AS tons_last_30d,
    MAX(st.created_at) AS last_ticket_at
FROM tenants t
LEFT JOIN users u ON u.tenant_id = t.id
LEFT JOIN scale_tickets st ON st.tenant_id = t.id
GROUP BY t.id, t.slug, t.name, t.cuit, t.plan, t.status, t.created_at;

-- Seed: mark the initial super admin user (if exists)
UPDATE users SET is_super_admin = TRUE WHERE email = 'superadmin@guaycampo.com';
INSERT INTO users (email, full_name, password_hash, is_super_admin, status, tenant_id, role_id)
SELECT
    'superadmin@guaycampo.com',
    'Super Admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFpLBHb8KkMG4Zy', -- Demo1234!
    TRUE,
    'active',
    (SELECT id FROM tenants LIMIT 1), -- any tenant as placeholder
    (SELECT id FROM roles LIMIT 1)    -- any role as placeholder
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@guaycampo.com');
