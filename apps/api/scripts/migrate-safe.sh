#!/bin/sh
# Manual migration entrypoint for apps/api. Keep this aligned with
# docker-entrypoint.sh; never use Prisma db push against a shared schema.
set -eu

# Manual operations must be intentionally approved, not triggered by a
# legacy script name in an unattended deployment.
if [ "${TAD_APPROVE_MANUAL_MIGRATION:-}" != "YES" ]; then
  echo "[migration] REFUSED: explicit TAD_APPROVE_MANUAL_MIGRATION=YES required." >&2
  exit 1
fi

# Validate presence and print variable NAMES only; do not log URLs or tokens.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[migration] REFUSED: DATABASE_URL is required." >&2
  exit 1
fi
if [ -z "${SUPABASE_URL:-}" ]; then
  echo "[migration] REFUSED: SUPABASE_URL is required." >&2
  exit 1
fi
if [ -z "${DIRECT_URL:-}" ]; then
  echo "[migration] REFUSED: DIRECT_URL is required." >&2
  exit 1
fi

# Independently pin the *canonical* project before making ANY schema write.
# Matching runtime and migration URLs alone cannot prove the destination is
# the project authorized by the infrastructure owner.
if [ -z "${TAD_EXPECTED_SUPABASE_PROJECT_REF:-}" ]; then
  echo "[migration] REFUSED: TAD_EXPECTED_SUPABASE_PROJECT_REF is required (independently confirmed)." >&2
  exit 1
fi
node ../../scripts/verify-supabase-runtime-target.cjs

# Retain the existing runtime/migration consistency preflight as defense in depth.
node ./scripts/check-supabase-target.cjs

# Prisma's datasource uses DATABASE_URL; temporarily point ONLY this
# subprocess at the verified direct/session migration connection.
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma

# Prisma migrate deploy applies *pending* SQL only. It does not detect drift
# when migration history says "applied" but critical tables/columns are absent.
# Do not report success or start the API if the read-only schema inspection
# finds missing tables/columns, UUID/TEXT mismatches or broken relations.
# This query uses information_schema metadata only (no customer records).
DATABASE_URL="$DIRECT_URL" node ./scripts/check-prisma-drift.cjs
