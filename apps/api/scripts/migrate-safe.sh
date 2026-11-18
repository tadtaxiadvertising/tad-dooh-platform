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

# Ensures both URLs belong to the same Supabase project. Fail closed when
# the ref cannot be established; do not touch the DB on mismatch.
node ./scripts/check-supabase-target.cjs

# Prisma's datasource uses DATABASE_URL; temporarily point ONLY this
# subprocess at the verified direct/session migration connection.
DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
