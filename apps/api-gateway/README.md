# GuayCampo — Kong API Gateway

Kong 3.8 running in DB-less (declarative) mode. All six backend services are unified behind a single entry point on port 8000.

## Architecture overview

```
Client → :8000 (Kong proxy) → guaycampo-auth:3001
                             → guaycampo-shifts:3002
                             → guaycampo-scale:3003
                             → guaycampo-lab:3004
                             → guaycampo-silos:3005
                             → guaycampo-billing:3006
```

Kong Admin API is available on port 8001 (read-only in production — never expose publicly).

## Starting Kong in development

```bash
# From the repo root — starts Kong together with all infrastructure
docker compose -f infrastructure/docker/docker-compose.yml up -d kong

# Or start everything at once
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Kong picks up `apps/api-gateway/kong.dev.yml` automatically via the volume mount.

## Verifying routes via the Admin API

```bash
# List all services
curl -s http://localhost:8001/services | jq '.data[].name'

# List all routes
curl -s http://localhost:8001/routes | jq '.data[] | {name, paths, methods}'

# List all enabled plugins
curl -s http://localhost:8001/plugins | jq '.data[] | {name, enabled}'

# Check overall Kong status
curl -s http://localhost:8001/status | jq .
```

## Adding a new route

1. Open `apps/api-gateway/kong.yml` (production) **and** `kong.dev.yml` (development).
2. Add a new entry under `routes:` pointing to the appropriate service. Example:

```yaml
- name: reports-routes
  service: reports-service
  paths:
    - /api/reports
  strip_path: false
  preserve_host: false
  plugins:
    - name: jwt
      config:
        key_claim_name: tenantId
        claims_to_verify: [exp]
        header_names: [Authorization]
        secret_is_base64: false
        algorithm: HS256
    - name: rate-limiting
      config:
        minute: 120
        hour: 5000
        policy: redis
        redis_host: guaycampo-redis
        redis_port: 6379
        fault_tolerant: true
```

3. If it is a new upstream service, also add a matching entry under `services:`.
4. Reload Kong to pick up changes:

```bash
docker exec guaycampo-kong kong reload
```

## Testing the JWT plugin

```bash
# 1. Obtain a token from the auth service
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}' \
  | jq -r '.accessToken')

# 2. Call a protected route through Kong
curl -s http://localhost:8000/api/shifts \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Verify that Kong injects the tenant headers (inspect via request-debugger logs)
docker logs guaycampo-kong --tail 50
```

A request with a missing or expired token returns `401 Unauthorized`. A request to a route that requires a specific role when the token carries a different role returns `403 Forbidden`.

## Viewing rate limiting logs

```bash
# Real-time Kong proxy logs (includes rate-limit decisions)
docker logs -f guaycampo-kong

# Check remaining quota for the current IP
curl -I http://localhost:8000/api/shifts \
  -H "Authorization: Bearer $TOKEN" \
  | grep -i x-ratelimit

# Headers exposed downstream:
#   X-RateLimit-Limit-Minute
#   X-RateLimit-Remaining-Minute
#   X-RateLimit-Reset
```

Rate limit buckets per route:

| Route group   | minute | hour  | Policy      |
|---------------|--------|-------|-------------|
| auth-public   | 10     | 100   | redis (prod), local (dev) |
| auth-protected| 10     | 100   | redis (prod), local (dev) |
| standard      | 120    | 5000  | redis (prod), local (dev) |
| billing       | 30     | 500   | redis (prod), local (dev) |
| global (fallback) | 300 | 10000 | redis (prod), local (dev) |

## Custom plugins

| Plugin | File | Purpose |
|--------|------|---------|
| `tenant-injector` | `plugins/tenant-injector.lua` | Decodes JWT payload and injects `X-Tenant-ID`, `X-User-ID`, `X-User-Role` headers upstream |
| `jwt-validator` | `plugins/jwt-validator.lua` | Additional GuayCampo claim validation: tenantId presence, sub presence, iat clock-skew, optional role enforcement |

## Configuration files

| File | Used when |
|------|-----------|
| `kong.yml` | Production / staging |
| `kong.dev.yml` | Local development (permissive limits, CORS `*`, file-log to stdout) |

## Ports reference

| Port | Description |
|------|-------------|
| 8000 | Kong proxy — all API traffic |
| 8001 | Kong Admin API |
