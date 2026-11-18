#!/usr/bin/env bash
# Run the driver-code offer release gate without GitHub Actions or live services.
# Read-only regarding production: Jest uses mocks; builds write only local artifacts.
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v node >/dev/null || { echo "Node.js 22+ required" >&2; exit 2; }
command -v pnpm >/dev/null || { echo "Install pnpm from packageManager version before running" >&2; exit 2; }
test -d apps/api/node_modules && test -d apps/advertiser/node_modules || {
  echo "Missing installed workspace dependencies (API + advertiser); no tests executed" >&2
  exit 2
}

# Never use production credentials, services, or a real Supabase project.
unset DATABASE_URL DIRECT_URL JWT_SECRET SUPABASE_SERVICE_ROLE_KEY \
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SENDGRID_API_KEY
export NEXT_TELEMETRY_DISABLED=1
export NEXT_PUBLIC_API_URL="http://127.0.0.1:5999"
export BACKEND_INTERNAL_URL="http://127.0.0.1:5999"
export NEXT_PUBLIC_SUPABASE_URL="https://fixture.supabase.invalid"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="fixture-anon-key"
export NEXT_PUBLIC_LANDING_SIGNUP_ENABLED=false

echo "[1/5] Build the canonical price model"
pnpm --filter @tad/impact-calculator run build

echo "[2/5] Execute real TypeScript-based source and SSR regression tests"
node --test \
  scripts/landing.test.cjs \
  scripts/advertiser-driver-offer.test.cjs \
  scripts/advertiser-referral-capture.test.cjs \
  scripts/advertiser-estimate-pricing.test.cjs \
  scripts/advertiser-onboarding-presentation.test.cjs

echo "[3/5] Execute API service and controller Jest tests with local Prisma mocks"
pnpm --filter api exec jest --runInBand \
  src/modules/campaign/campaign-pricing.spec.ts \
  src/modules/commission/commission-settlement-approval.spec.ts \
  src/modules/commission/commission-atomic-ledger.spec.ts \
  src/modules/commission/commission-admin-actor.spec.ts \
  src/modules/campaign/campaign-coverage-security.spec.ts \
  src/modules/campaign/campaign-pending-inventory.spec.ts \
  src/modules/campaign/campaign-tenant-patch-security.spec.ts \
  src/modules/advertisers/advertisers-referral.spec.ts \
  src/modules/advertisers/advertisers-session.spec.ts \
  src/modules/advertisers/advertisers-oauth-status.spec.ts \
  src/modules/onboarding/oauth-profile.spec.ts \
  src/modules/advertisers/advertisers-login-status.spec.ts \
  src/modules/auth/guards/supabase-auth.guard.spec.ts \
  src/modules/auth/guards/advertiser-account-status.guard.spec.ts \
  src/modules/auth/guards/tenant.guard.spec.ts \
  src/modules/portal-requests/portal-requests.controller.spec.ts \
  src/modules/portal-requests/portal-requests-ownership.spec.ts \
  src/modules/portal-requests/portal-requests-approval.spec.ts \
  src/modules/onboarding/onboarding.service.spec.ts \
  src/modules/onboarding/onboarding.controller.spec.ts \
  src/modules/onboarding/dto/onboard-advertiser.dto.spec.ts

echo "[4/5] Build API and run scoped advertiser strict TypeScript validation"
pnpm --filter api run build
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json

echo "[5/5] Build the advertiser portal with fixture-only URLs"
pnpm --filter @tad/advertiser run build

echo "Advertiser offer local gate PASS — no GitHub Actions, no live DB, no production changes"
