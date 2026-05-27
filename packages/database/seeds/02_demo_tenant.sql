-- =============================================================================
-- Seed 02: Demo Tenant + Users
-- =============================================================================
-- Creates a demonstration tenant with pre-configured users.
-- Passwords are bcrypt-hashed (cost 12) of:
--   admin@demo.guaycampo.com  -> Demo1234!
--   balanza@demo.guaycampo.com -> Demo1234!
--   lab@demo.guaycampo.com    -> Demo1234!
--   admin2@demo.guaycampo.com -> Demo1234!
-- =============================================================================

DO $$
DECLARE
  v_tenant_id  UUID;
  v_admin_role UUID;
  v_op_role    UUID;
  v_lab_role   UUID;
  v_adm_role   UUID;
BEGIN

  -- -------------------------------------------------------------------------
  -- Insert demo tenant
  -- -------------------------------------------------------------------------
  INSERT INTO tenants (id, slug, name, cuit, plan, status, config)
  VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'demo',
    'Acopio Demo S.A.',
    '30-71234567-8',
    'professional',
    'active',
    '{
      "timezone": "America/Argentina/Buenos_Aires",
      "currency": "ARS",
      "language": "es-AR",
      "whatsapp_enabled": true,
      "ocr_enabled": true,
      "afip_cuit": "30712345678",
      "afip_environment": "testing"
    }'
  )
  ON CONFLICT (id) DO NOTHING;

  v_tenant_id := '00000000-0000-0000-0000-000000000001'::UUID;

  -- -------------------------------------------------------------------------
  -- Insert system roles for demo tenant
  -- -------------------------------------------------------------------------
  INSERT INTO roles (id, name, permissions, is_system, tenant_id)
  VALUES
    (
      '00000000-0000-0000-0001-000000000001'::UUID,
      'tenant_admin',
      '{
        "shifts":       ["read", "write", "delete"],
        "queue":        ["read", "write", "delete"],
        "scale":        ["read", "write", "delete"],
        "lab":          ["read", "write", "delete"],
        "silos":        ["read", "write", "delete"],
        "clients":      ["read", "write", "delete"],
        "transport":    ["read", "write", "delete"],
        "billing":      ["read", "write", "delete"],
        "reports":      ["read"],
        "users":        ["read", "write", "delete"],
        "settings":     ["read", "write"]
      }',
      TRUE,
      v_tenant_id
    ),
    (
      '00000000-0000-0000-0001-000000000002'::UUID,
      'operador_balanza',
      '{
        "shifts":       ["read"],
        "queue":        ["read", "write"],
        "scale":        ["read", "write"],
        "lab":          ["read"],
        "silos":        ["read"],
        "clients":      ["read"],
        "transport":    ["read"],
        "billing":      [],
        "reports":      ["read"],
        "users":        [],
        "settings":     []
      }',
      TRUE,
      v_tenant_id
    ),
    (
      '00000000-0000-0000-0001-000000000003'::UUID,
      'laboratorista',
      '{
        "shifts":       ["read"],
        "queue":        ["read"],
        "scale":        ["read"],
        "lab":          ["read", "write"],
        "silos":        ["read"],
        "clients":      ["read"],
        "transport":    ["read"],
        "billing":      [],
        "reports":      ["read"],
        "users":        [],
        "settings":     []
      }',
      TRUE,
      v_tenant_id
    ),
    (
      '00000000-0000-0000-0001-000000000004'::UUID,
      'administrativo',
      '{
        "shifts":       ["read", "write"],
        "queue":        ["read"],
        "scale":        ["read"],
        "lab":          ["read"],
        "silos":        ["read"],
        "clients":      ["read", "write"],
        "transport":    ["read", "write"],
        "billing":      ["read", "write"],
        "reports":      ["read"],
        "users":        [],
        "settings":     ["read"]
      }',
      TRUE,
      v_tenant_id
    )
  ON CONFLICT (id) DO NOTHING;

  v_admin_role := '00000000-0000-0000-0001-000000000001'::UUID;
  v_op_role    := '00000000-0000-0000-0001-000000000002'::UUID;
  v_lab_role   := '00000000-0000-0000-0001-000000000003'::UUID;
  v_adm_role   := '00000000-0000-0000-0001-000000000004'::UUID;

  -- -------------------------------------------------------------------------
  -- Insert demo users
  -- Password hash is bcrypt cost=12 of 'Demo1234!'
  -- $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFpLBHb8KkMG4Zy
  -- -------------------------------------------------------------------------
  INSERT INTO users (id, email, phone, full_name, password_hash, tenant_id, role_id, status)
  VALUES
    (
      '00000000-0000-0000-0002-000000000001'::UUID,
      'admin@demo.guaycampo.com',
      '+54 9 341 123-4567',
      'Admin Demo',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFpLBHb8KkMG4Zy',
      v_tenant_id,
      v_admin_role,
      'active'
    ),
    (
      '00000000-0000-0000-0002-000000000002'::UUID,
      'balanza@demo.guaycampo.com',
      '+54 9 341 234-5678',
      'Carlos Rodríguez',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFpLBHb8KkMG4Zy',
      v_tenant_id,
      v_op_role,
      'active'
    ),
    (
      '00000000-0000-0000-0002-000000000003'::UUID,
      'lab@demo.guaycampo.com',
      '+54 9 341 345-6789',
      'María González',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFpLBHb8KkMG4Zy',
      v_tenant_id,
      v_lab_role,
      'active'
    ),
    (
      '00000000-0000-0000-0002-000000000004'::UUID,
      'admin2@demo.guaycampo.com',
      '+54 9 341 456-7890',
      'Laura Martínez',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewFpLBHb8KkMG4Zy',
      v_tenant_id,
      v_adm_role,
      'active'
    )
  ON CONFLICT (id) DO NOTHING;

END $$;
