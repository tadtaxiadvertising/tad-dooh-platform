#!/bin/sh
set -eu
echo "[entrypoint] === TAD API ENTRYPOINT ==="
echo "[entrypoint] NODE_ENV=$NODE_ENV"
echo "[entrypoint] PORT=$PORT"
echo "[entrypoint] JWT_SECRET=$([ -n "${JWT_SECRET:-}" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] DATABASE_URL=$([ -n "${DATABASE_URL:-}" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] SUPABASE_URL=$([ -n "${SUPABASE_URL:-}" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] DIRECT_URL=$([ -n "${DIRECT_URL:-}" ] && echo 'SET' || echo 'MISSING')"

# JWT_SECRET is REQUIRED - no ephemeral fallback
if [ -z "${JWT_SECRET:-}" ]; then
  echo "[entrypoint] 🚨 FATAL: JWT_SECRET not configured in the environment."
  echo "[entrypoint] 🚨 Container will not start without a persistent JWT_SECRET."
  exit 1
fi

# Configuration preflight must complete before even entering migration phase.
# Fail closed and report *names only*; never echo connection strings or tokens.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] 🚨 FATAL: DATABASE_URL is required for API runtime."
  exit 1
fi
if [ -z "${SUPABASE_URL:-}" ]; then
  echo "[entrypoint] 🚨 FATAL: SUPABASE_URL is required to validate the database target."
  exit 1
fi
if [ -z "${DIRECT_URL:-}" ]; then
  echo "[entrypoint] 🚨 FATAL: DIRECT_URL is required for Prisma migrations. Configure the Supabase direct/session URL, not the transaction pooler on :6543."
  exit 1
fi

echo "[entrypoint] Applying Prisma migrations..."
node ./scripts/check-supabase-target.cjs
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
echo "[entrypoint] Prisma migrations applied."

echo "[entrypoint] Starting node dist/main.js ..."
exec node --expose-gc dist/main.js
