#!/usr/bin/env bash
# =============================================================================
# GuayCampo - Run Seeds
# Executes all seed SQL files in order.
# ONLY runs in development or staging environments — never in production.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Load .env if present
# ---------------------------------------------------------------------------
ENV_FILE=""
for dir in "$SCRIPT_DIR" "$SCRIPT_DIR/.." "$SCRIPT_DIR/../.." "$SCRIPT_DIR/../../.."; do
  if [[ -f "$dir/.env" ]]; then
    ENV_FILE="$(realpath "$dir/.env")"
    break
  fi
done

if [[ -n "$ENV_FILE" ]]; then
  echo "==> Loading environment from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# ---------------------------------------------------------------------------
# Validate DATABASE_URL
# ---------------------------------------------------------------------------
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Production guard — refuse to run seeds on production databases
# ---------------------------------------------------------------------------
DB_LOWER="${DATABASE_URL,,}"
if [[ "$DB_LOWER" == *"prod"* || "$DB_LOWER" == *"production"* ]]; then
  echo "ERROR: Seeds are NOT allowed on production databases." >&2
  echo "       DATABASE_URL appears to point to a production instance." >&2
  exit 1
fi

NODE_ENV_LOWER="${NODE_ENV:-development}"
if [[ "$NODE_ENV_LOWER" == "production" ]]; then
  echo "ERROR: NODE_ENV=production — seeds are disabled in production." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Explicit confirmation prompt unless --yes is passed
# ---------------------------------------------------------------------------
if [[ "${1:-}" != "--yes" ]]; then
  echo ""
  echo "  WARNING: This will INSERT seed data into: $DATABASE_URL"
  echo "  Environment: ${NODE_ENV:-development}"
  echo ""
  read -rp "  Continue? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

# ---------------------------------------------------------------------------
# Parse connection details from DATABASE_URL
# ---------------------------------------------------------------------------
DB_URL="${DATABASE_URL%%\?*}"
export PGPASSWORD
PGPASSWORD="$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')"
DB_USER="$(echo "$DB_URL"    | sed -E 's|.*://([^:]+):.*|\1|')"
DB_HOST="$(echo "$DB_URL"    | sed -E 's|.*@([^:/]+)[:/].*|\1|')"
DB_PORT="$(echo "$DB_URL"    | sed -E 's|.*:([0-9]+)/.*|\1|')"
DB_NAME="$(echo "$DB_URL"    | sed -E 's|.*/([^/?]+).*|\1|')"

PSQL="psql -v ON_ERROR_STOP=1 -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME"

echo "==> Connected to: $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"
echo ""

# ---------------------------------------------------------------------------
# Run each seed file in order
# ---------------------------------------------------------------------------
SEED_COUNT=0

for seed_file in "$SCRIPT_DIR"/[0-9]*.sql; do
  [[ -f "$seed_file" ]] || continue
  seed_name="$(basename "$seed_file")"

  echo "  SEED  $seed_name ..."
  if $PSQL -f "$seed_file"; then
    echo "  OK    $seed_name"
    SEED_COUNT=$((SEED_COUNT + 1))
  else
    echo "ERROR: Seed $seed_name failed. Aborting." >&2
    exit 1
  fi
done

echo ""
echo "==> Done: $SEED_COUNT seed file(s) applied."
