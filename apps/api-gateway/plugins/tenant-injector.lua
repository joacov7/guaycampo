-- =============================================================================
-- GuayCampo - Kong Custom Plugin: tenant-injector
-- =============================================================================
-- Decodes the JWT from the Authorization header (without re-verifying the
-- signature — the built-in jwt plugin already did that) and injects the
-- tenantId, userId (sub), and role claims as upstream request headers so
-- that every microservice can read them without touching the token directly.
--
-- Injected headers:
--   X-Tenant-ID   ← payload.tenantId
--   X-User-ID     ← payload.sub
--   X-User-Role   ← payload.role
-- =============================================================================

local cjson = require "cjson.safe"

local plugin = {
  PRIORITY = 1000,  -- Run after JWT plugin (PRIORITY 1450) has validated the token
  VERSION = "1.0.0",
}

-- ---------------------------------------------------------------------------
-- Schema (no config needed for this plugin)
-- ---------------------------------------------------------------------------
plugin.PRIORITY = 1000
plugin.VERSION = "1.0.0"

local schema = {
  name = "tenant-injector",
  fields = {
    { config = {
        type = "record",
        fields = {},
      }
    },
  },
}

-- ---------------------------------------------------------------------------
-- base64url → standard base64 conversion + decode
-- ---------------------------------------------------------------------------
local function base64url_decode(input)
  if not input then return nil end

  -- Replace base64url chars with standard base64 chars
  local s = input:gsub("-", "+"):gsub("_", "/")

  -- Add padding
  local padding = (4 - #s % 4) % 4
  s = s .. string.rep("=", padding)

  return ngx.decode_base64(s)
end

-- ---------------------------------------------------------------------------
-- Extract JWT payload (second dot-delimited segment)
-- ---------------------------------------------------------------------------
local function decode_jwt_payload(token)
  if not token then return nil end

  local parts = {}
  for part in token:gmatch("[^%.]+") do
    parts[#parts + 1] = part
  end

  if #parts ~= 3 then
    kong.log.warn("tenant-injector: malformed JWT — expected 3 parts, got ", #parts)
    return nil
  end

  local payload_json = base64url_decode(parts[2])
  if not payload_json then
    kong.log.warn("tenant-injector: failed to base64-decode JWT payload")
    return nil
  end

  local payload, err = cjson.decode(payload_json)
  if not payload then
    kong.log.warn("tenant-injector: failed to JSON-decode JWT payload: ", err)
    return nil
  end

  return payload
end

-- ---------------------------------------------------------------------------
-- access phase — runs on every request that reaches this plugin
-- ---------------------------------------------------------------------------
function plugin:access(conf)
  local auth_header = kong.request.get_header("Authorization")
  if not auth_header then
    -- No Authorization header — nothing to inject.
    -- The jwt plugin (if also attached) will have already rejected the request
    -- if authentication is required; we just silently skip here.
    return
  end

  -- Support both "Bearer <token>" and raw token
  local token = auth_header:match("^[Bb]earer%s+(.+)$") or auth_header
  if not token or token == "" then
    return
  end

  local payload = decode_jwt_payload(token)
  if not payload then
    return
  end

  -- Inject tenantId
  if payload.tenantId then
    kong.service.request.set_header("X-Tenant-ID", tostring(payload.tenantId))
  end

  -- Inject userId (standard JWT "sub" claim)
  if payload.sub then
    kong.service.request.set_header("X-User-ID", tostring(payload.sub))
  end

  -- Inject role
  if payload.role then
    kong.service.request.set_header("X-User-Role", tostring(payload.role))
  end

  kong.log.debug(
    "tenant-injector: injected headers for tenant=",
    payload.tenantId or "nil",
    " user=",
    payload.sub or "nil",
    " role=",
    payload.role or "nil"
  )
end

return plugin
