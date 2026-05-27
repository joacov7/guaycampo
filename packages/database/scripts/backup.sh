#!/usr/bin/env bash
# =============================================================================
# GuayCampo - Database Backup Script
# Creates a pg_dump backup in custom format (-Fc) with timestamp.
# Optionally uploads to S3 if AWS_S3_BACKUP_BUCKET is configured.
# Retains the last 30 local backups.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../../../backups}"
BACKUP_FILE="guaycampo_backup_${TIMESTAMP}.dump"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
RETAIN_COUNT="${BACKUP_RETAIN_COUNT:-30}"

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
# Parse connection details
# ---------------------------------------------------------------------------
DB_URL="${DATABASE_URL%%\?*}"
export PGPASSWORD
PGPASSWORD="$(echo "$DB_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')"
DB_USER="$(echo "$DB_URL"    | sed -E 's|.*://([^:]+):.*|\1|')"
DB_HOST="$(echo "$DB_URL"    | sed -E 's|.*@([^:/]+)[:/].*|\1|')"
DB_PORT="$(echo "$DB_URL"    | sed -E 's|.*:([0-9]+)/.*|\1|')"
DB_NAME="$(echo "$DB_URL"    | sed -E 's|.*/([^/?]+).*|\1|')"

# ---------------------------------------------------------------------------
# Create backup directory
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
echo "==> Backup directory: $BACKUP_DIR"

# ---------------------------------------------------------------------------
# Run pg_dump
# ---------------------------------------------------------------------------
echo "==> Starting backup: $BACKUP_FILE"
echo "    Host:     $DB_HOST:$DB_PORT"
echo "    Database: $DB_NAME"
echo "    User:     $DB_USER"
echo ""

START_TIME="$(date +%s)"

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_PATH"

END_TIME="$(date +%s)"
DURATION=$((END_TIME - START_TIME))
FILESIZE="$(du -h "$BACKUP_PATH" | cut -f1)"

echo ""
echo "==> Backup completed in ${DURATION}s"
echo "    File: $BACKUP_PATH"
echo "    Size: $FILESIZE"

# ---------------------------------------------------------------------------
# Upload to S3 if bucket is configured
# ---------------------------------------------------------------------------
if [[ -n "${AWS_S3_BACKUP_BUCKET:-}" ]]; then
  S3_KEY="${AWS_S3_BACKUP_PREFIX:-backups/database}/$BACKUP_FILE"
  S3_URI="s3://$AWS_S3_BACKUP_BUCKET/$S3_KEY"

  echo ""
  echo "==> Uploading to S3: $S3_URI"

  if command -v aws &>/dev/null; then
    aws s3 cp "$BACKUP_PATH" "$S3_URI" \
      --storage-class STANDARD_IA \
      --no-progress

    echo "==> S3 upload complete: $S3_URI"
  else
    echo "WARNING: aws CLI not found — skipping S3 upload." >&2
  fi
else
  echo "==> AWS_S3_BACKUP_BUCKET not set — skipping S3 upload."
fi

# ---------------------------------------------------------------------------
# Rotate local backups: keep only the last $RETAIN_COUNT files
# ---------------------------------------------------------------------------
BACKUP_COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -name "guaycampo_backup_*.dump" | wc -l)"

if [[ "$BACKUP_COUNT" -gt "$RETAIN_COUNT" ]]; then
  DELETE_COUNT=$((BACKUP_COUNT - RETAIN_COUNT))
  echo ""
  echo "==> Rotating old backups (keeping last $RETAIN_COUNT, deleting $DELETE_COUNT) ..."

  # Find oldest files to delete
  find "$BACKUP_DIR" -maxdepth 1 -name "guaycampo_backup_*.dump" \
    | sort \
    | head -n "$DELETE_COUNT" \
    | while read -r old_file; do
        echo "    DELETE $old_file"
        rm -f "$old_file"
      done
fi

echo ""
echo "==> Backup process finished successfully."
echo "    Backup: $BACKUP_PATH"
