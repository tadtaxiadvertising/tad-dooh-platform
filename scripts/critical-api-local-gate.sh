#!/usr/bin/env bash
# Offline, mock-only release evidence for critical TAD API invariants.
# NOT a staging/database migration test, nor authorization for production.
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v node >/dev/null || { echo "BLOCKED: Node.js 22 required" >&2; exit 2; }
command -v pnpm >/dev/null || { echo "BLOCKED: pnpm 10.34.9 required" >&2; exit 2; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
test "$NODE_MAJOR" = 22 || { echo "BLOCKED: expected Node.js 22" >&2; exit 2; }
PNPM_VERSION="$(pnpm --version)"
test "$PNPM_VERSION" = "10.34.9" || { echo "BLOCKED: expected pnpm 10.34.9" >&2; exit 2; }
test -d node_modules && test -d apps/api/node_modules || {
  echo "BLOCKED: workspace dependencies missing; no tests executed" >&2
  exit 2
}

# Drop real credentials. The Prisma schema can be validated against a
# non-routable fixture URL; no SQL calls or production migrations are allowed.
unset DATABASE_URL DIRECT_URL JWT_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY \
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SENDGRID_API_KEY ADMIN_SECRET
export DATABASE_URL="postgresql://fixture:fixture@127.0.0.1:59999/fixture"
export DIRECT_URL="$DATABASE_URL"
export SUPABASE_URL="https://fixture.supabase.invalid"
export NEXT_TELEMETRY_DISABLED=1

echo "[1/5] Node-only migration, entrypoint and target contracts"
node --test \
  scripts/api-entrypoint-env.test.cjs \
  apps/api/scripts/check-supabase-target.test.cjs \
  apps/api/scripts/prisma-drift-core.test.cjs

echo "[2/5] Prisma schema validation (no database connection)"
pnpm exec prisma validate --schema apps/api/prisma/schema.prisma

echo "[3/5] Critical API Jest tests (mock-only)"
pnpm --filter api exec jest --runInBand \
  src/modules/commission/commission-atomic-ledger.spec.ts \
  src/modules/commission/commission-reconciliation-integrity.spec.ts \
  src/modules/commission/commission-settlement-approval.spec.ts \
  src/modules/commission/commission-admin-actor.spec.ts \
  src/modules/qr-scan/qr-scan-referral-ownership.spec.ts \
  src/modules/qr-scan/__tests__/qr-scan.service.spec.ts \
  src/modules/auth/guards/tenant.guard.spec.ts \
  src/common/interceptors/idempotency.interceptor.spec.ts

echo "[4/5] API strict TypeScript check"
pnpm exec tsc --noEmit --project apps/api/tsconfig.json

echo "[5/5] API build"
pnpm --filter api run build

echo "PASS: critical API local gate. NO staging/production readiness implied."
