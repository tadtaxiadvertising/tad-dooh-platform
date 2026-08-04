#!/bin/sh
# TAD API Docker Entrypoint
# Ejecuta migraciones de Prisma y luego lanza la app.
# Separado del CMD para que el crash-loop no opaque la causa raíz.

set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --exit-code 2>&1
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "[entrypoint] ❌ Prisma migrate deploy failed (exit=$MIGRATE_EXIT)."
  echo "[entrypoint] Possible causes:"
  echo "  - DATABASE_URL incorrecta o sin acceso a Supabase Pooler (puerto 6543)"
  echo "  - SSL mismatch entre Prisma y Supabase"
  echo "  - Schema desincronizado (correr 'prisma db push' primero)"
  sleep 10
  exit $MIGRATE_EXIT
fi

echo "[entrypoint] ✅ Migrations done. Starting application..."
exec "$@"