#!/usr/bin/env bash
# Independent, production-equivalent public advertiser QA.
# No GitHub Actions quota, external APIs, production credentials or database writes.
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v node >/dev/null || { echo "Node 22+ required" >&2; exit 2; }
command -v pnpm >/dev/null || { echo "Install project-pinned pnpm separately; this QA script never installs dependencies" >&2; exit 2; }
command -v curl >/dev/null || { echo "curl required" >&2; exit 2; }
test -d apps/advertiser/node_modules || {
  echo "Missing installed workspace dependencies; run pnpm install --frozen-lockfile in an authorized development environment" >&2
  exit 2
}

PORT="${TAD_ADVERTISER_QA_PORT:-3993}"
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT >= 1024 && PORT <= 65535 )) || {
  echo "TAD_ADVERTISER_QA_PORT must be 1024-65535" >&2
  exit 2
}
if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
  echo "Refusing to reuse an occupied QA port: $PORT" >&2
  exit 2
fi

OUT="${TAD_ADVERTISER_QA_OUTPUT:-$(mktemp -d /tmp/tad-advertiser-v6-qa.XXXXXX)}"
[[ "$OUT" = /* ]] || { echo "QA output must be an absolute path" >&2; exit 2; }
case "$OUT/" in "$ROOT/"*) echo "QA output must be outside the repository" >&2; exit 2;; esac
mkdir -p "$OUT/screenshots"
SERVER_PID=""
cleanup() {
  code=$?
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if (( code != 0 )); then
    echo "QA failed (exit $code). Inspect $OUT" >&2
    if [[ -f "$OUT/server.log" ]]; then tail -n 60 "$OUT/server.log" >&2; fi
  else
    echo "QA PASS. Evidence (screenshots + logs): $OUT"
  fi
}
trap cleanup EXIT

# Do not allow credentials from the shell to leak into this fixture-only process.
unset DATABASE_URL DIRECT_URL JWT_SECRET SUPABASE_SERVICE_ROLE_KEY \
  STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SENDGRID_API_KEY \
  NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || true
export NEXT_TELEMETRY_DISABLED="1"
export NEXT_PUBLIC_LANDING_SIGNUP_ENABLED="false"
export NEXT_PUBLIC_SUPABASE_URL="https://fixture.supabase.invalid"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="fixture-anon-key"
export NEXT_PUBLIC_API_URL="http://127.0.0.1:5999"
export BACKEND_INTERNAL_URL="http://127.0.0.1:5999"

echo "[1/5] Regression tests (read-only)"
node --test \
  scripts/landing.test.cjs \
  scripts/landing-creative-reframe.test.cjs \
  scripts/landing-cinematic.test.cjs \
  scripts/advertiser-motion-v6.test.cjs \
  scripts/advertiser-release-drift.test.cjs \
  scripts/advertiser-release-gate.test.cjs \
  scripts/advertiser-deployment-check.test.cjs \
  scripts/advertiser-standalone-assets.test.cjs \
  scripts/advertiser-estimate-pricing.test.cjs \
  scripts/advertiser-driver-offer.test.cjs \
  scripts/advertiser-referral-capture.test.cjs \
  scripts/driver-landing.test.cjs \
  scripts/driver-preview-arithmetic.test.cjs \
  scripts/advertiser-onboarding-presentation.test.cjs \
  scripts/cookie-management.test.cjs > "$OUT/regression.log" 2>&1 || {
    tail -n 80 "$OUT/regression.log" >&2
    exit 1
  }

echo "[2/5] TypeScript strict (must pass even if next.config ignores build errors)"
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json > "$OUT/types.log" 2>&1 || {
  cat "$OUT/types.log" >&2
  exit 1
}

echo "[3/5] Scoped ESLint"
(
  cd apps/advertiser
  pnpm exec eslint --config eslint.config.mjs components/landing lib/landing --max-warnings 0
) > "$OUT/lint.log" 2>&1 || {
  cat "$OUT/lint.log" >&2
  exit 1
}

echo "[4/5] Production-equivalent isolated advertiser build"
pnpm --filter @tad/impact-calculator run build > "$OUT/calculator-build.log" 2>&1
pnpm --filter @tad/advertiser run build > "$OUT/advertiser-build.log" 2>&1 || {
  tail -n 100 "$OUT/advertiser-build.log" >&2
  exit 1
}

STANDALONE="$ROOT/apps/advertiser/.next/standalone"
TARGET="$STANDALONE/apps/advertiser"
test -f "$TARGET/server.js" || {
  echo "Next standalone output missing at $TARGET/server.js" >&2
  exit 1
}
# BEGIN local-standalone-assets
# Copy files into their served paths even when Next already created directories.
# "ln -sfn" without -T nests the link inside an existing directory and can
# make QA report missing assets despite a correct Next production build.
test -d "$ROOT/apps/advertiser/.next/static" || {
  echo "Missing Next build static assets" >&2
  exit 1
}
test -d "$ROOT/apps/advertiser/public" || {
  echo "Missing advertiser public assets" >&2
  exit 1
}
mkdir -p "$TARGET/.next/static" "$TARGET/public"
cp -R "$ROOT/apps/advertiser/.next/static/." "$TARGET/.next/static/"
cp -R "$ROOT/apps/advertiser/public/." "$TARGET/public/"
# END local-standalone-assets

echo "[5/5] Local-only Chromium smoke including scroll reversal and no-JS"
(
  cd "$STANDALONE"
  NODE_ENV=production PORT="$PORT" HOSTNAME=127.0.0.1 node apps/advertiser/server.js
) > "$OUT/server.log" 2>&1 &
SERVER_PID=$!
ready=false
for _attempt in $(seq 1 90); do
  if curl --max-time 2 -fsS "http://127.0.0.1:$PORT/" > /dev/null 2>&1; then
    ready=true
    break
  fi
  kill -0 "$SERVER_PID" 2>/dev/null || break
  sleep 1
done
[[ "$ready" = true ]] || { echo "Standalone Next server did not start" >&2; exit 1; }

export NODE_PATH="$ROOT/apps/advertiser/node_modules:$ROOT/apps/driver/node_modules"
export LANDING_BASE_URL="http://127.0.0.1:$PORT/"
node scripts/advertiser-release-drift.cjs "$LANDING_BASE_URL" > "$OUT/release-fingerprint.json" || {
  cat "$OUT/release-fingerprint.json" >&2
  echo "The locally built release is not Motion V6; refusing to claim browser QA." >&2
  exit 1
}
export LANDING_SCREENSHOT_DIR="$OUT/screenshots"
node scripts/landing-v3-smoke.cjs > "$OUT/browser.log" 2>&1 || {
  tail -n 100 "$OUT/browser.log" >&2
  exit 1
}
