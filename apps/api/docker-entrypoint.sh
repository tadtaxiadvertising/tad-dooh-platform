#!/bin/sh
set -eu

echo "[entrypoint] === TAD API ENTRYPOINT ==="
echo "[entrypoint] NODE_ENV=${NODE_ENV:-MISSING}"
echo "[entrypoint] PORT=${PORT:-MISSING}"
echo "[entrypoint] JWT_SECRET=$([ -n "${JWT_SECRET:-}" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] DATABASE_URL=$([ -n "${DATABASE_URL:-}" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] SUPABASE_URL=$([ -n "${SUPABASE_URL:-}" ] && echo 'SET' || echo 'MISSING')"
echo "[entrypoint] DIRECT_URL=$([ -n "${DIRECT_URL:-}" ] && echo 'SET' || echo 'MISSING')"

# A failing schema or missing configuration must never trigger a hot restart
# loop on a small VPS. Keep the failure visible, idle using negligible CPU,
# then return the original nonzero status to the orchestrator.
fail_with_cooldown() {
  status="$1"
  shift
  echo "[entrypoint] FATAL: $*" >&2
  echo "[entrypoint] Refusing API startup; 90-second idle cooldown before exit status $status." >&2
  sleep 90
  exit "$status"
}

# Fail closed; never generate a temporary JWT secret or leak any credential.
if [ -z "${JWT_SECRET:-}" ]; then
  fail_with_cooldown 1 "JWT_SECRET not configured."
fi
if [ -z "${DATABASE_URL:-}" ]; then
  fail_with_cooldown 1 "DATABASE_URL is required for API runtime."
fi
if [ -z "${SUPABASE_URL:-}" ]; then
  fail_with_cooldown 1 "SUPABASE_URL is required to validate the database target."
fi
if [ -z "${DIRECT_URL:-}" ]; then
  fail_with_cooldown 1 "DIRECT_URL is required for read-only Prisma schema verification."
fi

# Runtime startup must never write schema or advance migration history.
# Reviewed migrations are a separate, explicitly approved operation via
# scripts/migrate-safe.sh, after backup and staging verification.
#
# Comparing DATABASE_URL/DIRECT_URL/SUPABASE_URL only proves that those
# three settings agree with EACH OTHER. It cannot establish authorization to
# connect to the owner-confirmed deployment project. Require an independently
# provisioned project ref before any DB query, just as manual migrations do.
if [ -z "${TAD_EXPECTED_SUPABASE_PROJECT_REF:-}" ]; then
  fail_with_cooldown 1 "TAD_EXPECTED_SUPABASE_PROJECT_REF is required for independent target verification."
fi
if node ../../scripts/verify-supabase-runtime-target.cjs; then
  echo "[entrypoint] Supabase target independently pinned; no DB connection attempted."
else
  status="$?"
  fail_with_cooldown "$status" "Independent Supabase target verification failed ($status)."
fi

echo "[entrypoint] Checking Supabase target and schema (read-only; no migrations)."
if node ./scripts/check-supabase-target.cjs; then
  :
else
  status="$?"
  fail_with_cooldown "$status" "Supabase project preflight failed ($status)."
fi

# Keep the existing fail-closed Prisma parity guard. A missing table / column,
# UUID/TEXT mismatch or failed query must never be suppressed to launch NestJS.
if DATABASE_URL="$DIRECT_URL" node ./scripts/check-prisma-drift.cjs; then
  echo "[entrypoint] Prisma schema parity verified; no migrations executed."
else
  status="$?"
  fail_with_cooldown "$status" "Prisma schema parity check failed ($status)."
fi

echo "[entrypoint] Starting node dist/main.js ..."
exec node --expose-gc dist/main.js
