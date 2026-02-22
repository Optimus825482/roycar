# ─── Stage 1: Dependencies ───
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build ───
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN echo 'DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"' > .env.local
RUN npx prisma generate && npm run build

# ─── Stage 3: Production (Node + PostgreSQL in same container) ───
FROM node:20-alpine AS production

# Install PostgreSQL and supervisor
RUN apk add --no-cache \
    postgresql16 \
    postgresql16-contrib \
    supervisor \
    curl \
    && mkdir -p /var/lib/postgresql/data \
    && mkdir -p /run/postgresql \
    && mkdir -p /var/log/supervisor \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql

WORKDIR /app

# Copy standalone build
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy Prisma files for migrations + generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=build /app/node_modules/tsx ./node_modules/tsx

# Copy entrypoint and supervisor config
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY supervisord.conf /etc/supervisord.conf
RUN chmod +x /docker-entrypoint.sh

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PGDATA=/var/lib/postgresql/data
ENV DB_NAME=royal_careerdb
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
