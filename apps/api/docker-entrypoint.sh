#!/bin/sh
set +e
echo "[entrypoint] === TAD API ENTRYPOINT ==="
echo "[entrypoint] NODE_ENV=$NODE_ENV"
echo "[entrypoint] PORT=$PORT"
echo "[entrypoint] JWT_SECRET=$([ -n \"$JWT_SECRET\" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] DATABASE_URL=$([ -n \"$DATABASE_URL\" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] SUPABASE_URL=$([ -n \"$SUPABASE_URL\" ] && echo 'SET' || echo 'MISSING')"

# JWT_SECRET fallback
if [ -z "$JWT_SECRET" ]; then
  echo "[entrypoint] ⚠️ JWT_SECRET not set — using ephemeral fallback"
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  export JWT_SECRET
fi

echo "[entrypoint] Starting node dist/main.js ..."
exec node --expose-gc dist/main.js