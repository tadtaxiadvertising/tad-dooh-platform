#!/bin/sh
# TAD API Docker Entrypoint
# Sincroniza el schema de Prisma con la BD y lanza la app.
# Usa db push (tolerante a diferencias) en vez de migrate deploy (estricto).
# Separado del CMD para que logs de error no se pierdan en crash-loop.

set -e

echo "[entrypoint] ⏳ Sincronizando schema de Prisma con Supabase..."
echo "[entrypoint]    DATABASE_URL=${DATABASE_URL:0:30}... (truncated)"

# db push es más tolerante que migrate deploy para producción:
# - No requiere que todas las migraciones estén en el historial
# - Acepta diferencias con --accept-data-loss
# - skip-generate ya que el cliente se generó en build
npx prisma db push --accept-data-loss --skip-generate 2>&1
PUSH_EXIT=$?

if [ $PUSH_EXIT -ne 0 ]; then
  echo "[entrypoint] ⚠️  db push falló (exit=$PUSH_EXIT). Intentando migrate deploy como fallback..."
  npx prisma migrate deploy 2>&1
  MIGRATE_EXIT=$?
  if [ $MIGRATE_EXIT -ne 0 ]; then
    echo "[entrypoint] ❌ CRÍTICO: No se pudo sincronizar la BD."
    echo "[entrypoint]    Posibles causas:"
    echo "      - DATABASE_URL incorrecta o sin acceso a Supabase Pooler (puerto 6543)"
    echo "      - SSL mismatch (debe conectar con sslmode=require)"
    echo "      - El pooler de Supabase no soporta ciertas operaciones de Prisma"
    echo "      - Contraseña o project ref incorrectos"
    echo "[entrypoint] ⏳ La app intentará arrancar de todas formas (puede fallar si la BD es crítica)..."
  fi
fi

echo "[entrypoint] ✅ Sync complete. Starting application..."
exec "$@"