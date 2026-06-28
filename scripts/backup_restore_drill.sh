#!/usr/bin/env bash
# Idea Pop — Backup & Restore Drill
#
# Procedure:
#   1. pg_dump the live database to a timestamped file
#   2. Create a fresh restore database
#   3. Restore the dump into it
#   4. Run a smoke test (row counts + migration table check)
#   5. Drop the restore database
#   6. Print a pass/fail summary
#
# Usage:
#   DATABASE_URL=postgres://ideapop:ideapop@localhost:5432/ideapop \
#     bash scripts/backup_restore_drill.sh
#
# In Docker Compose:
#   docker compose exec postgres bash -c "
#     pg_dump -U ideapop ideapop > /tmp/backup.sql && echo DUMP_OK
#   "
#   Then run this script from the host with appropriate DATABASE_URL.

set -euo pipefail

DB_URL="${DATABASE_URL:-postgres://ideapop:ideapop@localhost:5432/ideapop}"
RESTORE_DB="ideapop_restore_drill"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/ideapop_backups}"
BACKUP_FILE="${BACKUP_DIR}/ideapop_${TIMESTAMP}.sql"

# Derive connection components from DATABASE_URL (requires psql in PATH).
PG_USER=$(echo "$DB_URL" | sed -E 's|postgres://([^:]+):.*|\1|')
PG_PASS=$(echo "$DB_URL" | sed -E 's|postgres://[^:]+:([^@]+)@.*|\1|')
PG_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
PG_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
PG_DB=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')
export PGPASSWORD="$PG_PASS"

mkdir -p "$BACKUP_DIR"

echo "=== Idea Pop Backup & Restore Drill ==="
echo "  Source DB : $PG_HOST:$PG_PORT/$PG_DB"
echo "  Backup    : $BACKUP_FILE"
echo "  Restore DB: $RESTORE_DB"
echo

# ── Step 1: pg_dump ────────────────────────────────────────────────────────────

echo "[1/5] Dumping database..."
pg_dump \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  --no-password \
  -f "$BACKUP_FILE"
echo "      Dump complete: $(du -sh "$BACKUP_FILE" | cut -f1)"

# ── Step 2: Create restore database ───────────────────────────────────────────

echo "[2/5] Creating restore database '$RESTORE_DB'..."
psql \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d postgres \
  --no-password \
  -c "DROP DATABASE IF EXISTS $RESTORE_DB;" \
  -c "CREATE DATABASE $RESTORE_DB;"
echo "      Done."

# ── Step 3: Restore dump ──────────────────────────────────────────────────────

echo "[3/5] Restoring dump into '$RESTORE_DB'..."
psql \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d "$RESTORE_DB" \
  --no-password \
  -f "$BACKUP_FILE" \
  --quiet
echo "      Restore complete."

# ── Step 4: Smoke test the restored DB ────────────────────────────────────────

echo "[4/5] Running smoke tests..."
SMOKE_RESULT=$(psql \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d "$RESTORE_DB" \
  --no-password \
  --tuples-only \
  --no-align \
  -c "
    SELECT 'accounts:'      || COUNT(*)   FROM accounts;
    SELECT 'children:'      || COUNT(*)   FROM children;
    SELECT 'challenges:'    || COUNT(*)   FROM challenges;
    SELECT 'migrations:'    || COUNT(*)   FROM _sqlx_migrations;
    SELECT 'smoke:OK';
  ")
echo "$SMOKE_RESULT"

if ! echo "$SMOKE_RESULT" | grep -q "smoke:OK"; then
  echo "SMOKE TEST FAILED" >&2
  exit 1
fi

# ── Step 5: Drop restore database ─────────────────────────────────────────────

echo "[5/5] Dropping restore database..."
psql \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d postgres \
  --no-password \
  -c "DROP DATABASE IF EXISTS $RESTORE_DB;" \
  --quiet

# ── Summary ───────────────────────────────────────────────────────────────────

echo
echo "=== RESULT: PASS ==="
echo "  Backup file retained at: $BACKUP_FILE"
echo "  Drill timestamp: $TIMESTAMP"
