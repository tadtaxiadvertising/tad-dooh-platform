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
# Reject noncanonical textual aliases BEFORE checking the actual target.
# The offline parser trims/lowercases refs; a raw shell equality check would
# otherwise let uppercase/padded aliases bypass the incident-specific freeze.
case "${TAD_EXPECTED_SUPABASE_PROJECT_REF:-}" in
  *[!a-z0-9]*)
    echo "[migration] REFUSED: project ref must be lowercase ASCII without whitespace." >&2
    exit 1
    ;;
esac
node ../../scripts/verify-supabase-runtime-target.cjs

# Retain the existing runtime/migration consistency preflight as defense in depth.
node ./scripts/check-supabase-target.cjs

# P0 #217 incident freeze: this specific owner-confirmed production project
# has 23 missing model tables and unresolved financial/UUID schema drift.
# A normal Prisma migrate deploy can write pending SQL without repairing it.
# Do not try to use this ordinary migration runner for incident recovery.
# Removing this code requires a separately reviewed recovery PR AFTER an
# encrypted offsite backup and successful isolated restore are proven.
# No environment variable or manual YES approval can override this block.
if [ "${TAD_EXPECTED_SUPABASE_PROJECT_REF:-}" = "ltdcdhqixvbpdcitthqf" ]; then
  echo "[migration] REFUSED: P0 #217 production project frozen; no SQL executed." >&2
  exit 1
fi

# Prisma's datasource uses DATABASE_URL; temporarily point ONLY this
# subprocess at the verified direct/session migration connection.
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma

# Prisma migrate deploy applies *pending* SQL only. It does not detect drift
# when migration history says "applied" but critical tables/columns are absent.
# Do not report success or start the API if the read-only schema inspection
# finds missing tables/columns, UUID/TEXT mismatches or broken relations.
# This query uses information_schema metadata only (no customer records).
DATABASE_URL="$DIRECT_URL" node ./scripts/check-prisma-drift.cjs
