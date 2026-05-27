#!/usr/bin/env bash
# =============================================================================
# GuayCampo - Run SQL Migrations
# Executes all migration files in numerical order.
# Idempotent: already-applied migrations are skipped.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Load .env if present (walk up from script dir to find .env)
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
  echo "ERROR: DATABASE_URL is not set. Set it in .env or export it before running." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Parse connection details from DATABASE_URL for psql
# Format: postgresql://user:password@host:port/dbname?params
# ---------------------------------------------------------------------------
DB_URL="${DATABASE_URL%%\?*}"   # strip query string
export PGPASSWORD
PGPASSWORD="$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')"
DB_USER="$(echo "$DB_URL"    | sed -E 's|.*://([^:]+):.*|\1|')"
DB_HOST="$(echo "$DB_URL"    | sed -E 's|.*@([^:/]+)[:/].*|\1|')"
DB_PORT="$(echo "$DB_URL"    | sed -E 's|.*:([0-9]+)/.*|\1|')"
DB_NAME="$(echo "$DB_URL"    | sed -E 's|.*/([^/?]+).*|\1|')"

PSQL="psql -v ON_ERROR_STOP=1 -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME"

echo "==> Connected to: $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER"

# ---------------------------------------------------------------------------
# Create schema_migrations table if it doesn't exist
# ---------------------------------------------------------------------------
$PSQL <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(50)  PRIMARY KEY,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    checksum    VARCHAR(64)
);
SQL

echo "==> schema_migrations table ready"

# ---------------------------------------------------------------------------
# Run each migration file in order
# ---------------------------------------------------------------------------
MIGRATION_COUNT=0
SKIP_COUNT=0

for migration_file in "$SCRIPT_DIR"/[0-9]*.sql; do
  [[ -f "$migration_file" ]] || continue

  version="$(basename "$migration_file" .sql)"
  checksum="$(sha256sum "$migration_file" | awk '{print $1}')"

  # Check if already applied
  already_applied=$($PSQL -tAc "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version'")

  if [[ "$already_applied" -gt 0 ]]; then
    echo "  SKIP  $version (already applied)"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi

  echo "  APPLY $version ..."

  # Run migration inside a transaction
  if $PSQL -1 -f "$migration_file"; then
    $PSQL -c "INSERT INTO schema_migrations (version, checksum) VALUES ('$version', '$checksum')"
    echo "  OK    $version"
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
  else
    echo "ERROR: Migration $version failed. Aborting." >&2
    exit 1
  fi
done

echo ""
echo "==> Done: $MIGRATION_COUNT migration(s) applied, $SKIP_COUNT skipped."
