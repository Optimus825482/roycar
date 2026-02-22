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
node node_modules/prisma/build/index.js migrate deploy 2>&1 || echo "Migration warning (may already be applied)"

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
