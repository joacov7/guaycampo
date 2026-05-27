-- =============================================================================
-- GuayCampo - Kong Custom Plugin: jwt-validator
-- =============================================================================
-- Extended JWT validation on top of Kong's built-in jwt plugin.
-- Performs GuayCampo-specific claim checks that the stock plugin doesn't
-- cover out of the box:
--
--   1. Verifies that `tenantId` claim is present and non-empty.
--   2. Verifies that `sub` (userId) claim is present.
--   3. Verifies that `iat` (issued-at) is not in the future (clock skew ≤ 60s).
--   4. Optionally enforces a list of required roles (config.required_roles).
--
-- Place this plugin AFTER the built-in jwt plugin in the plugin execution
-- order (lower PRIORITY number = runs later).
-- =============================================================================

local cjson = require "cjson.safe"

local plugin = {
  PRIORITY = 990,   -- After jwt (1450) and tenant-injector (1000)
  VERSION = "1.0.0",
}

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
local schema = {
  name = "jwt-validator",
  fields = {
    { config = {
        type = "record",
        fields = {
          -- Optional: list of roles that are allowed to access this route.
          -- Empty list means any authenticated role is accepted.
          { required_roles = {
              type = "array",
              elements = { type = "string" },
              default = {},
            }
          },
          -- Maximum allowed clock skew in seconds for iat validation.
          { clock_skew = {
              type = "number",
              default = 60,
            }
          },
        },
      }
    },
  },
}

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

local function base64url_decode(input)
  if not input then return nil end
  local s = input:gsub("-", "+"):gsub("_", "/")
  local padding = (4 - #s % 4) % 4
  s = s .. string.rep("=", padding)
  return ngx.decode_base64(s)
end

local function decode_jwt_payload(token)
  if not token then return nil end
  local parts = {}
  for part in token:gmatch("[^%.]+") do
    parts[#parts + 1] = part
  end
  if #parts ~= 3 then return nil end
  local payload_json = base64url_decode(parts[2])
  if not payload_json then return nil end
  local payload, _ = cjson.decode(payload_json)
  return payload
end

local function set_401(message)
  return kong.response.exit(401, {
    message = message,
    code = "UNAUTHORIZED",
  })
end

local function set_403(message)
  return kong.response.exit(403, {
    message = message,
    code = "FORBIDDEN",
  })
end

-- ---------------------------------------------------------------------------
-- access phase
-- ---------------------------------------------------------------------------
function plugin:access(conf)
  local auth_header = kong.request.get_header("Authorization")
  if not auth_header then
    return set_401("Authorization header is required")
  end

  local token = auth_header:match("^[Bb]earer%s+(.+)$")
  if not token then
    return set_401("Bearer token is required")
  end

  local payload = decode_jwt_payload(token)
  if not payload then
    return set_401("Invalid JWT format")
  end

  -- 1. tenantId must be present
  if not payload.tenantId or payload.tenantId == "" then
    kong.log.warn("jwt-validator: missing tenantId claim")
    return set_401("JWT must contain tenantId claim")
  end

  -- 2. sub (userId) must be present
  if not payload.sub or payload.sub == "" then
    kong.log.warn("jwt-validator: missing sub claim")
    return set_401("JWT must contain sub claim")
  end

  -- 3. iat clock skew check
  if payload.iat then
    local now = ngx.time()
    local skew = conf.clock_skew or 60
    if payload.iat > now + skew then
      kong.log.warn("jwt-validator: iat is in the future, possible clock skew issue")
      return set_401("JWT issued-at (iat) is in the future")
    end
  end

  -- 4. Role enforcement (optional)
  if conf.required_roles and #conf.required_roles > 0 then
    local user_role = payload.role
    if not user_role then
      return set_403("JWT must contain role claim for this endpoint")
    end

    local allowed = false
    for _, required_role in ipairs(conf.required_roles) do
      if user_role == required_role then
        allowed = true
        break
      end
    end

    if not allowed then
      kong.log.warn(
        "jwt-validator: role '", user_role, "' not in allowed roles for this route"
      )
      return set_403("Your role does not have access to this resource")
    end
  end
end

return plugin
