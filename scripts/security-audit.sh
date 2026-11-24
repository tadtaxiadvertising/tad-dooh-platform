#!/bin/bash
# Manual Security Audit Script - Extended for Free Plan Monitoring
# Usage: ./scripts/security-audit.sh
# Requires: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, DB_PASSWORD in protected environment

set -euo pipefail

# Target must be explicitly selected by an authorized operator.
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ ! "$PROJECT_REF" =~ ^[a-z0-9]{20}$ ]] ||
   [[ -z "$SUPABASE_ACCESS_TOKEN" ]] ||
   [[ -z "$DB_PASSWORD" ]]; then
    echo "ERROR: missing or invalid Supabase audit configuration." >&2
    exit 1
fi

# Libpq reads credentials from the environment, never from psql argv or URLs.
export PGHOST="db.$PROJECT_REF.supabase.co"
export PGUSER="postgres" PGDATABASE="postgres" PGPORT="5432"
export PGPASSWORD="$DB_PASSWORD"

api_get() {
    # Supply the bearer token over stdin rather than curl argv.
    curl -fsS --config - "https://api.supabase.com/v1/projects/$PROJECT_REF$1" <<CURL_CONFIG
header = "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
CURL_CONFIG
}

echo "=== Supabase Security Audit $(date -u) ==="
echo "Project: $PROJECT_REF"
echo "Plan: Free (500MB DB, 1GB Storage, 500K Edge Fn/mo, 200 Realtime)"
echo ""

# 1. Security Advisories
echo "--- 1. Security Advisories ---"
ADVISORIES=$(api_get "/database/lints")

# An error payload or unexpected JSON shape cannot mean zero security findings.
if ! jq -e 'type == "array" and all(.[]; type == "object" and (.name | type == "string" and length > 0) and (.level | IN("ERROR", "WARN", "INFO")))' <<<"$ADVISORIES" >/dev/null; then
    echo "ERROR: invalid Supabase security advisory response." >&2
    exit 1
fi

ERROR_COUNT=$(echo "$ADVISORIES" | jq '[.[] | select(.level=="ERROR")] | length')
WARN_COUNT=$(echo "$ADVISORIES" | jq '[.[] | select(.level=="WARN")] | length')
INFO_COUNT=$(echo "$ADVISORIES" | jq '[.[] | select(.level=="INFO")] | length')

echo "ERROR: $ERROR_COUNT | WARN: $WARN_COUNT | INFO: $INFO_COUNT"
echo ""

echo "$ADVISORIES" | jq -r '.[] | select(.level=="ERROR" or .level=="WARN") | "\(.level): \(.name)"'
echo ""

# 2. Database Size & Connections
echo "--- 2. Database Size & Connections ---"
psql -X -v ON_ERROR_STOP=1 \
    -c "
    SELECT 
        pg_size_pretty(pg_database_size('postgres')) as total_db,
        pg_size_pretty(pg_total_relation_size('telemetry')) as telemetry,
        pg_size_pretty(pg_total_relation_size('playback_events')) as playback_events,
        (SELECT count(*) FROM pg_stat_activity WHERE datname='postgres') as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections;
    "

DB_SIZE_MB=$(psql -X -v ON_ERROR_STOP=1 \
    -c "SELECT round(pg_database_size('postgres')/1024/1024) as mb;" -t -A | head -1)
if ! [[ "$DB_SIZE_MB" =~ ^[0-9]+$ ]]; then
    echo "ERROR: invalid database size result." >&2
    exit 1
fi
echo "Database: ${DB_SIZE_MB} MB / 500 MB limit (Free)"

if [ "$DB_SIZE_MB" -gt 450 ]; then
    echo "❌ CRITICAL: >450MB (90%)"
elif [ "$DB_SIZE_MB" -gt 400 ]; then
    echo "⚠️  WARNING: >400MB (80%)"
else
    echo "✅ OK"
fi
echo ""

# 3. Storage Usage
echo "--- 3. Storage Usage ---"
STORAGE=$(api_get "/storage/buckets")
echo "$STORAGE" | jq -r '.[] | "\(.name): \(.public // false | if . then "public" else "private" end) - \(.file_size_limit // "no limit")"'

if api_get "/storage/usage" >/dev/null 2>&1; then
    echo "Storage usage retrieved (raw metadata withheld)."
else
    echo "Storage usage endpoint unavailable (optional)."
fi
echo ""

# 4. Auth Config
echo "--- 4. Auth Config ---"
api_get "/config/auth" | jq '{leaked_password_protection_enabled, password_min_length, enable_signup, mfa_enabled, jwt_expiry, session_timebox, enable_email_confirmations}'
echo ""

# 5. Edge Functions
echo "--- 5. Edge Functions (Free: 500K/mo) ---"
FUNCTIONS=$(api_get "/functions")
FUNC_COUNT=$(echo "$FUNCTIONS" | jq 'length')
echo "Deployed functions: $FUNC_COUNT"
echo "$FUNCTIONS" | jq -r '.[] | "\(.name): v\(.version // "latest") - \(.status // "unknown")"'

if [ "$FUNC_COUNT" -gt 0 ]; then
    echo "Recent invocations (24h):"
    for func in $(echo "$FUNCTIONS" | jq -r '.[].slug'); do
        LOGS=$(api_get "/functions/$func/logs?limit=10" 2>/dev/null || echo '[]')
        RECENT=$(echo "$LOGS" | jq '[.[] | select(.timestamp > (now - 86400))] | length')
        echo "  $func: $RECENT invocations"
    done
fi
echo ""

# 6. Realtime
echo "--- 6. Realtime (Free: 200 concurrent) ---"
if api_get "/realtime/usage" >/dev/null 2>&1; then
    echo "Realtime usage retrieved (raw metadata withheld)."
else
    echo "Realtime usage endpoint unavailable (optional)."
fi
echo ""

# 7. Effective public DML privileges (including inherited PUBLIC grants)
echo "--- 7. RLS Deny-by-Default Check ---"
GRANT_COUNT=$(psql -X -v ON_ERROR_STOP=1 \
    -c "SELECT count(*)::integer
            FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind IN ('r','p','v','m','f')
              AND EXISTS (
                SELECT 1
                FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name)
                CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) AS perms(privilege)
                WHERE pg_catalog.has_table_privilege(roles.role_name, c.oid, perms.privilege)
              );" \
    -t -A | head -1)
if ! [[ "$GRANT_COUNT" =~ ^[0-9]+$ ]]; then
    echo "ERROR: invalid PostgreSQL privilege count." >&2
    exit 1
fi
echo "Public relations with effective anon/authenticated DML access: $GRANT_COUNT"

if [ "$GRANT_COUNT" -gt 0 ]; then
    echo "❌ FAIL: Found grants (should be 0)"
else
    echo "✅ OK: No grants to anon/authenticated"
fi
echo ""

# 8. Function search_path
echo "--- 8. Function search_path (mutable check) ---"
MUTABLE_FUNCS=$(psql -X -v ON_ERROR_STOP=1 \
    -c "
    SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT p.proconfig @> ARRAY['search_path=pg_catalog,public']);
    " -t -A | head -1)
if ! [[ "$MUTABLE_FUNCS" =~ ^[0-9]+$ ]]; then
    echo "ERROR: invalid PostgreSQL function count." >&2
    exit 1
fi
echo "Functions with mutable search_path: $MUTABLE_FUNCS"

if [ "$MUTABLE_FUNCS" -gt 0 ]; then
    echo "❌ FAIL: Found mutable functions"
    psql -X -v ON_ERROR_STOP=1 \
        -c "
        SELECT p.proname, p.proconfig 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND (p.proconfig IS NULL OR NOT p.proconfig @> ARRAY['search_path=pg_catalog,public']);
        "
else
    echo "✅ OK: All functions have immutable search_path"
fi
echo ""

# 9. st_estimatedextent Permissions
echo "--- 9. st_estimatedextent Permissions ---"
psql -X -v ON_ERROR_STOP=1 \
    -c "
    SELECT 
        p.proname,
        pg_get_function_identity_arguments(p.oid) as args,
        has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
        has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'st_estimatedextent';
    "
echo ""

# 10. Long-running queries
echo "--- 10. Long-running Queries (>30s) ---"
psql -X -v ON_ERROR_STOP=1 \
    -c "
    SELECT count(*) AS active_queries_over_30_seconds
    FROM pg_stat_activity
    WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
      AND state = 'active';
    "
echo ""

# 11. Idle in transaction
echo "--- 11. Idle in Transaction (>5min) ---"
psql -X -v ON_ERROR_STOP=1 \
    -c "
    SELECT count(*) as count, max(state_change) as oldest
    FROM pg_stat_activity
    WHERE state = 'idle in transaction' 
      AND state_change < now() - interval '5 minutes';
    "
echo ""

echo "=== Audit Complete ==="

# Summary
# Exception applies to one extension-managed object, never to all public tables.
KNOWN_BLOCKED_ERRORS='{"name":"rls_disabled_in_public","schema":"public","table":"spatial_ref_sys"}'
KNOWN_WARNS='["extension_in_public","anon_security_definer_function_executable","authenticated_security_definer_function_executable"]'

NEW_ERRORS=$(echo "$ADVISORIES" | jq --argjson known "$KNOWN_BLOCKED_ERRORS" \
    '[.[] | select(.level=="ERROR" and ((.name == $known.name and .metadata.schema == $known.schema and .metadata.name == $known.table) | not))] | length')

NEW_WARNS=$(echo "$ADVISORIES" | jq --argjson known "$KNOWN_WARNS" \
    '[.[] | select(.level=="WARN" and ((.name | IN($known[])) | not))] | length')

EXIT_CODE=0

if [ "$NEW_ERRORS" -gt 0 ]; then
    echo "❌ NEW ERRORS: $NEW_ERRORS (excluding known blocked)"
    EXIT_CODE=1
fi

if [ "$NEW_WARNS" -gt 0 ]; then
    echo "⚠️  NEW WARNINGS: $NEW_WARNS (excluding known)"
fi

if [ "$GRANT_COUNT" -gt 0 ]; then
    echo "❌ GRANTS TO ANON/AUTHENTICATED: $GRANT_COUNT"
    EXIT_CODE=1
fi

if [ "$MUTABLE_FUNCS" -gt 0 ]; then
    echo "❌ MUTABLE SEARCH_PATH FUNCTIONS: $MUTABLE_FUNCS"
    EXIT_CODE=1
fi

if [ "${DB_SIZE_MB:-0}" -gt 450 ]; then
    echo "❌ DATABASE CRITICAL: ${DB_SIZE_MB}MB > 450MB"
    EXIT_CODE=1
elif [ "${DB_SIZE_MB:-0}" -gt 400 ]; then
    echo "⚠️  DATABASE WARNING: ${DB_SIZE_MB}MB > 400MB"
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All checks passed. No new security regressions."
fi

exit $EXIT_CODE