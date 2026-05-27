-- =============================================================================
-- Seed 03: System Roles with Full Permission Matrix
-- Inserts roles for the demo tenant (00000000-0000-0000-0000-000000000001).
-- For real tenants, roles are created via the application on tenant setup.
-- =============================================================================

DO $$
DECLARE
  v_tenant_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN

  -- jefe_operaciones
  INSERT INTO roles (name, permissions, is_system, tenant_id)
  VALUES (
    'jefe_operaciones',
    '{
      "shifts":       ["read", "write", "delete"],
      "queue":        ["read", "write", "delete"],
      "scale":        ["read", "write", "delete"],
      "lab":          ["read", "write", "delete"],
      "silos":        ["read", "write"],
      "clients":      ["read", "write"],
      "transport":    ["read", "write"],
      "billing":      ["read"],
      "reports":      ["read"],
      "users":        ["read"],
      "settings":     ["read"]
    }',
    TRUE,
    v_tenant_id
  )
  ON CONFLICT (name, tenant_id) DO NOTHING;

  -- operador_silos
  INSERT INTO roles (name, permissions, is_system, tenant_id)
  VALUES (
    'operador_silos',
    '{
      "shifts":       ["read"],
      "queue":        ["read"],
      "scale":        ["read"],
      "lab":          ["read"],
      "silos":        ["read", "write"],
      "clients":      ["read"],
      "transport":    [],
      "billing":      [],
      "reports":      ["read"],
      "users":        [],
      "settings":     []
    }',
    TRUE,
    v_tenant_id
  )
  ON CONFLICT (name, tenant_id) DO NOTHING;

  -- conductor (app móvil — acceso muy limitado)
  INSERT INTO roles (name, permissions, is_system, tenant_id)
  VALUES (
    'conductor',
    '{
      "shifts":       ["read"],
      "queue":        ["read"],
      "scale":        ["read"],
      "lab":          ["read"],
      "silos":        [],
      "clients":      [],
      "transport":    [],
      "billing":      [],
      "reports":      [],
      "users":        [],
      "settings":     []
    }',
    TRUE,
    v_tenant_id
  )
  ON CONFLICT (name, tenant_id) DO NOTHING;

  -- cliente_productor (portal de clientes)
  INSERT INTO roles (name, permissions, is_system, tenant_id)
  VALUES (
    'cliente_productor',
    '{
      "shifts":       ["read"],
      "queue":        ["read"],
      "scale":        ["read"],
      "lab":          ["read"],
      "silos":        [],
      "clients":      [],
      "transport":    [],
      "billing":      ["read"],
      "reports":      ["read"],
      "users":        [],
      "settings":     []
    }',
    TRUE,
    v_tenant_id
  )
  ON CONFLICT (name, tenant_id) DO NOTHING;

END $$;
