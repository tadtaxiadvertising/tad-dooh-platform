#!/usr/bin/env bash
# Fail-closed, mock-only local release gate. No production database or deploy.
# Run only inside a trusted, isolated checkout with dependencies already installed.
set -euo pipefail
umask 077

# Use shell built-ins to determine the repository path before any child process.
script_dir="${BASH_SOURCE[0]%/*}"
[[ "$script_dir" != "${BASH_SOURCE[0]}" ]] || script_dir='.'
ROOT="$(cd -- "$script_dir/.." && pwd -P)"

# All tools, including those checking the environment, run under a fresh,
# allowlisted environment. Unsetting a short list of secrets is not sufficient:
# SMTP, AWS, provider-specific and future credentials could otherwise leak.
/usr/bin/env -i \
  PATH="${PATH:-/usr/local/bin:/usr/bin:/bin}" \
  CI=true NODE_ENV=test \
  bash -s -- "$ROOT" <<'ISOLATED_GATE'
set -euo pipefail
umask 077
ROOT="$1"
cd -- "$ROOT"

# Do not let tests load secrets from checkout-local dotfiles even with env -i.
# Ignore dependency, git and generated trees when searching.
unsafe_env="$(find "$ROOT" \
  \( -type d \( -name node_modules -o -name .git -o -name .next \) -prune \) -o \
  \( \( -type f -o -type l \) \
     \( -name '.env' -o -name '.env.*' -o -name '.envrc' -o -name '.envrc.*' \) \
     ! -name '*.example' -print \) -quit)"
if [[ -n "$unsafe_env" ]]; then
  echo 'BLOCKED: environment file present in checkout; use an isolated sanitized checkout' >&2
  exit 2
fi

# Never read ~/.npmrc, ~/.config, or global credentials from the calling HOME.
private_home="$(mktemp -d -t tad-critical-api-XXXXXXXX)"
trap 'rm -rf -- "$private_home"' EXIT
mkdir -m 700 -- "$private_home/home" "$private_home/tmp" "$private_home/cache" "$private_home/config"
export HOME="$private_home/home" TMPDIR="$private_home/tmp"
export XDG_CACHE_HOME="$private_home/cache" XDG_CONFIG_HOME="$private_home/config"

command -v node >/dev/null || { echo 'BLOCKED: Node.js 22 required' >&2; exit 2; }
command -v pnpm >/dev/null || { echo 'BLOCKED: pnpm 10.34.9 required' >&2; exit 2; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "$NODE_MAJOR" == 22 ]] || { echo 'BLOCKED: expected Node.js 22' >&2; exit 2; }
PNPM_VERSION="$(pnpm --version)"
[[ "$PNPM_VERSION" == '10.34.9' ]] || { echo 'BLOCKED: expected pnpm 10.34.9' >&2; exit 2; }
[[ -d node_modules && -d apps/api/node_modules ]] || {
  echo 'BLOCKED: workspace dependencies missing; no tests executed' >&2
  exit 2
}

# Fixture DB URLs only: validation must never connect or migrate.
export DATABASE_URL='postgresql://fixture:fixture@127.0.0.1:59999/fixture'
export DIRECT_URL="$DATABASE_URL"
export SUPABASE_URL='https://fixture.supabase.invalid'
export NEXT_TELEMETRY_DISABLED=1

echo '[1/5] Node-only migration, entrypoint and target contracts'
node --test \
  scripts/api-entrypoint-env.test.cjs \
  apps/api/scripts/check-supabase-target.test.cjs \
  apps/api/scripts/prisma-drift-core.test.cjs

echo '[2/5] Prisma schema validation (no database connection)'
pnpm exec prisma validate --schema apps/api/prisma/schema.prisma

echo '[3/5] Critical API Jest tests (mock-only)'
pnpm --filter api exec jest --runInBand \
  src/modules/commission/commission-atomic-ledger.spec.ts \
  src/modules/commission/commission-reconciliation-integrity.spec.ts \
  src/modules/commission/commission-settlement-approval.spec.ts \
  src/modules/commission/commission-admin-actor.spec.ts \
  src/modules/qr-scan/qr-scan-referral-ownership.spec.ts \
  src/modules/drivers/__tests__/drivers-public-signup-device-binding.spec.ts \
  src/modules/drivers/__tests__/drivers-admin-device-assignment-atomic.spec.ts \
  src/modules/device/device-registration-ownership.spec.ts \
  src/modules/analytics/analytics-unknown-device-enrollment.spec.ts \
  src/modules/analytics/analytics-impression-verification.spec.ts \
  src/modules/telemetry/telemetry-playback-batch-tenant.spec.ts \
  src/modules/telemetry/__tests__/telemetry.service.spec.ts \
  src/modules/telemetry/telemetry-canonical-pop.spec.ts \
  src/modules/telemetry/telemetry-gps-sync-ack.spec.ts \
  src/modules/fleet/fleet-track-batch-binding.spec.ts \
  src/modules/drivers/__tests__/drivers.service.create.spec.ts \
  src/modules/qr-scan/__tests__/qr-scan.service.spec.ts \
  src/modules/auth/guards/tenant.guard.spec.ts \
  src/common/interceptors/idempotency.interceptor.spec.ts

echo '[4/5] API strict TypeScript check'
pnpm exec tsc --noEmit --project apps/api/tsconfig.json

echo '[5/5] API build'
pnpm --filter api run build

echo 'PASS: critical API local gate. NO staging/production readiness implied.'
ISOLATED_GATE
