#!/bin/sh
set -eu
echo "[entrypoint] === TAD API ENTRYPOINT ==="
echo "[entrypoint] NODE_ENV=$NODE_ENV"
echo "[entrypoint] PORT=$PORT"
echo "[entrypoint] JWT_SECRET=$([ -n "$JWT_SECRET" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] DATABASE_URL=$([ -n "$DATABASE_URL" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] SUPABASE_URL=$([ -n "$SUPABASE_URL" ] && echo 'SET' || echo 'MISSING')"

# JWT_SECRET is REQUIRED - no ephemeral fallback
if [ -z "$JWT_SECRET" ]; then
  echo "[entrypoint] 🚨 FATAL: JWT_SECRET not configured in Easypanel Environment."
  echo "[entrypoint] 🚨 Container will not start without a persistent JWT_SECRET."
  exit 1
fi

echo "[entrypoint] Applying Prisma migrations..."
pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
echo "[entrypoint] Prisma migrations applied."

echo "[entrypoint] Starting node dist/main.js ..."
exec node --expose-gc dist/main.js
