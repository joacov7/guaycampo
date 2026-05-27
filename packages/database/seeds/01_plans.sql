-- =============================================================================
-- Seed 01: Subscription Plans
-- =============================================================================

INSERT INTO subscription_plans (id, name, max_users, max_trucks_day, features, price_usd)
VALUES
  (
    gen_random_uuid(),
    'starter',
    10,
    50,
    '{
      "ocr": false,
      "afip": false,
      "iot": false,
      "ai": false,
      "scada": false,
      "whatsapp": false,
      "multi_commodity": true,
      "queue_management": true,
      "scale_integration": false,
      "lab_integration": false,
      "reports_basic": true,
      "reports_advanced": false,
      "api_access": false,
      "custom_roles": false,
      "max_silos": 5
    }',
    299.00
  ),
  (
    gen_random_uuid(),
    'professional',
    50,
    200,
    '{
      "ocr": true,
      "afip": true,
      "iot": true,
      "ai": false,
      "scada": false,
      "whatsapp": true,
      "multi_commodity": true,
      "queue_management": true,
      "scale_integration": true,
      "lab_integration": true,
      "reports_basic": true,
      "reports_advanced": true,
      "api_access": true,
      "custom_roles": true,
      "max_silos": 50
    }',
    799.00
  ),
  (
    gen_random_uuid(),
    'enterprise',
    NULL,
    NULL,
    '{
      "ocr": true,
      "afip": true,
      "iot": true,
      "ai": true,
      "scada": true,
      "whatsapp": true,
      "multi_commodity": true,
      "queue_management": true,
      "scale_integration": true,
      "lab_integration": true,
      "reports_basic": true,
      "reports_advanced": true,
      "api_access": true,
      "custom_roles": true,
      "max_silos": null,
      "sla": "99.9",
      "dedicated_support": true,
      "custom_integrations": true
    }',
    1999.00
  )
ON CONFLICT (name) DO UPDATE
  SET
    max_users      = EXCLUDED.max_users,
    max_trucks_day = EXCLUDED.max_trucks_day,
    features       = EXCLUDED.features,
    price_usd      = EXCLUDED.price_usd;
