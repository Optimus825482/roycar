#!/bin/sh
set -e

echo "=== Merit Royal Kariyer — Starting ==="

# Runtime defaults (can be overridden by environment)
: "${DB_NAME:=royal_careerdb}"
: "${DB_USER:=postgres}"
: "${DB_PASSWORD:=postgres}"

# Build DATABASE_URL from DB_* if not explicitly provided
if [ -z "${DATABASE_URL:-}" ]; then
  : "${DB_HOST:=db}"
  : "${DB_PORT:=5432}"
  export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

echo "DATABASE_URL=\"$DATABASE_URL\"" > /app/.env.local

DB_HOST_FOR_READY=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/?]*\).*|\1|p')
DB_PORT_FOR_READY=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9][0-9]*\)/.*|\1|p')
DB_USER_FOR_READY=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_NAME_FOR_READY=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

DB_HOST_FOR_READY=${DB_HOST_FOR_READY:-db}
DB_PORT_FOR_READY=${DB_PORT_FOR_READY:-5432}
DB_USER_FOR_READY=${DB_USER_FOR_READY:-postgres}
DB_NAME_FOR_READY=${DB_NAME_FOR_READY:-royal_careerdb}

echo ">>> Waiting for PostgreSQL..."
for i in $(seq 1 60); do
  if pg_isready -h "$DB_HOST_FOR_READY" -p "$DB_PORT_FOR_READY" -U "$DB_USER_FOR_READY" -d "$DB_NAME_FOR_READY" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: PostgreSQL is not ready after 60 attempts"
    exit 1
  fi
  sleep 2
done

# ─── Run SQL migrations against external DB ───
echo ">>> Running Prisma migrations..."
# Ensure _prisma_migrations table exists
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
  );
" >/dev/null 2>&1 || true

# Apply migration SQL files directly (Prisma CLI has too many deps for standalone)
for migration_dir in prisma/migrations/*/; do
  migration_sql="${migration_dir}migration.sql"
  if [ -f "$migration_sql" ]; then
    migration_name=$(basename "$migration_dir")
    # Check if migration already applied
    APPLIED=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM _prisma_migrations WHERE migration_name='$migration_name' AND finished_at IS NOT NULL;" 2>/dev/null | tr -d ' ' || echo "")
    if [ "$APPLIED" != "1" ]; then
      echo "  Applying migration: $migration_name"
      if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration_sql"; then
        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (md5('$migration_name' || clock_timestamp()::text || random()::text), 'manual', '$migration_name', NOW(), 1) ON CONFLICT DO NOTHING;"
      else
        echo "  ERROR: migration failed: $migration_name"
        exit 1
      fi
    else
      echo "  Already applied: $migration_name"
    fi
  fi
done

# ─── Run seed if tables are empty ───
DEPT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM departments;" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$DEPT_COUNT" = "0" ] || [ "$DEPT_COUNT" = "" ]; then
  echo ">>> Seeding database..."
  for f in prisma/seed.sql prisma/seed-settings.sql prisma/seed-form.sql \
           prisma/seed-screening-prompt.sql prisma/seed-memory-prompt.sql \
           prisma/update-chat-prompt.sql prisma/update-context-prompt.sql; do
    if [ -f "$f" ]; then
      echo "  Running $f..."
      psql "$DATABASE_URL" -f "$f" >/dev/null 2>&1 || true
    fi
  done
fi

echo ">>> Starting Next.js..."
exec node server.js
