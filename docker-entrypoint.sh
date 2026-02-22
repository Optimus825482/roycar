#!/bin/sh
set -e

echo "=== Merit Royal Kariyer — Starting ==="

# ─── 1. Initialize PostgreSQL if needed ───
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo ">>> Initializing PostgreSQL database..."
  su postgres -c "initdb -D $PGDATA --encoding=UTF8 --locale=C"

  # Allow local and password-based connections
  cat > "$PGDATA/pg_hba.conf" <<EOF
# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 trust
host    all       all   127.0.0.1/32  md5
host    all       all   0.0.0.0/0     md5
EOF

  # Listen only on localhost
  sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PGDATA/postgresql.conf"
fi

# ─── 2. Start PostgreSQL temporarily for migrations ───
echo ">>> Starting PostgreSQL for migrations..."
su postgres -c "pg_ctl -D $PGDATA -l /var/log/supervisor/postgresql.log start -w -t 60"

# ─── 3. Create database and user if not exists ───
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\" | grep -q 1" || \
  su postgres -c "createdb $DB_NAME"

# Set password for postgres user
su postgres -c "psql -c \"ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';\""

# ─── 4. Set DATABASE_URL for Prisma ───
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# Create .env.local for prisma.config.ts
echo "DATABASE_URL=\"$DATABASE_URL\"" > /app/.env.local

# ─── 5. Run Prisma migrations ───
echo ">>> Running Prisma migrations..."
# Ensure _prisma_migrations table exists
su postgres -c "psql -d $DB_NAME -c \"
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
\"" 2>/dev/null || true

# Apply migration SQL files directly (Prisma CLI has too many deps for standalone)
for migration_dir in prisma/migrations/*/; do
  migration_sql="${migration_dir}migration.sql"
  if [ -f "$migration_sql" ]; then
    migration_name=$(basename "$migration_dir")
    # Check if migration already applied
    APPLIED=$(su postgres -c "psql -t -d $DB_NAME -c \"SELECT 1 FROM _prisma_migrations WHERE migration_name='$migration_name' AND finished_at IS NOT NULL;\"" 2>/dev/null | tr -d ' ' || echo "")
    if [ "$APPLIED" != "1" ]; then
      echo "  Applying migration: $migration_name"
      if su postgres -c "psql -v ON_ERROR_STOP=1 -d $DB_NAME -f $migration_sql"; then
        su postgres -c "psql -v ON_ERROR_STOP=1 -d $DB_NAME -c \"INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (md5('$migration_name' || clock_timestamp()::text || random()::text), 'manual', '$migration_name', NOW(), 1) ON CONFLICT DO NOTHING;\""
      else
        echo "  ERROR: migration failed: $migration_name"
        exit 1
      fi
    else
      echo "  Already applied: $migration_name"
    fi
  fi
done

# ─── 6. Run seed if tables are empty ───
DEPT_COUNT=$(su postgres -c "psql -t -d $DB_NAME -c \"SELECT COUNT(*) FROM departments;\"" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$DEPT_COUNT" = "0" ] || [ "$DEPT_COUNT" = "" ]; then
  echo ">>> Seeding database..."
  for f in prisma/seed.sql prisma/seed-settings.sql prisma/seed-form.sql \
           prisma/seed-screening-prompt.sql prisma/seed-memory-prompt.sql \
           prisma/update-chat-prompt.sql prisma/update-context-prompt.sql; do
    if [ -f "$f" ]; then
      echo "  Running $f..."
      su postgres -c "psql -d $DB_NAME -f $f" 2>/dev/null || true
    fi
  done
fi

# ─── 7. Stop temporary PostgreSQL ───
echo ">>> Stopping temporary PostgreSQL..."
su postgres -c "pg_ctl -D $PGDATA stop -w -t 10"

# ─── 8. Start supervisor (PostgreSQL + Next.js) ───
echo ">>> Starting services via supervisor..."
exec supervisord -c /etc/supervisord.conf
