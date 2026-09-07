#!/bin/bash
# Manual Security Audit Script - Extended for Free Plan Monitoring
# Usage: ./scripts/security-audit.sh
# Requires: SUPABASE_ACCESS_TOKEN, DB_PASSWORD env vars

set -euo pipefail

PROJECT_REF="ltdcdhqixvbpdcitthqf"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ -z "$SUPABASE_ACCESS_TOKEN" || -z "$DB_PASSWORD" ]]; then
    echo "Error: Set SUPABASE_ACCESS_TOKEN and DB_PASSWORD environment variables"
    echo "  export SUPABASE_ACCESS_TOKEN='your_pat_token'"
    echo "  export DB_PASSWORD='your_db_password'"
    exit 1
fi

api_get() {
    curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        "https://api.supabase.com/v1/projects/$PROJECT_REF$1"
}

echo "=== Supabase Security Audit $(date -u) ==="
echo "Project: $PROJECT_REF"
echo "Plan: Free (500MB DB, 1GB Storage, 500K Edge Fn/mo, 200 Realtime)"
echo ""

# 1. Security Advisories
echo "--- 1. Security Advisories ---"
ADVISORIES=$(api_get "/database/lints")

ERROR_COUNT=$(echo "$ADVISORIES" | jq '[.[] | select(.level=="ERROR")] | length')
WARN_COUNT=$(echo "$ADVISORIES" | jq '[.[] | select(.level=="WARN")] | length')
INFO_COUNT=$(echo "$ADVISORIES" | jq '[.[] | select(.level=="INFO")] | length')

echo "ERROR: $ERROR_COUNT | WARN: $WARN_COUNT | INFO: $INFO_COUNT"
echo ""

echo "$ADVISORIES" | jq -r '.[] | select(.level=="ERROR" or .level=="WARN") | "\(.level): \(.name) - \(.detail)"'
echo ""

# 2. Database Size & Connections
echo "--- 2. Database Size & Connections ---"
PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
    -c "
    SELECT 
        pg_size_pretty(pg_database_size('postgres')) as total_db,
        pg_size_pretty(pg_total_relation_size('telemetry')) as telemetry,
        pg_size_pretty(pg_total_relation_size('playback_events')) as playback_events,
        (SELECT count(*) FROM pg_stat_activity WHERE datname='postgres') as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections;
    "

DB_SIZE_MB=$(PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
    -c "SELECT round(pg_database_size('postgres')/1024/1024) as mb;" -t -A | head -1)
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

STORAGE_USAGE=$(api_get "/storage/usage" 2>/dev/null || echo '{}')
echo "Storage usage: $STORAGE_USAGE"
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
REALTIME=$(api_get "/realtime/usage" 2>/dev/null || echo '{}')
echo "Realtime usage: $REALTIME"
echo ""

# 7. RLS Deny-by-Default
echo "--- 7. RLS Deny-by-Default Check ---"
GRANT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
    -c "SELECT count(*) FROM information_schema.table_privileges WHERE grantee IN ('anon','authenticated') AND table_schema='public';" \
    -t -A | head -1)
echo "Grants to anon/authenticated on public tables: $GRANT_COUNT"

if [ "$GRANT_COUNT" -gt 0 ]; then
    echo "❌ FAIL: Found grants (should be 0)"
else
    echo "✅ OK: No grants to anon/authenticated"
fi
echo ""

# 8. Function search_path
echo "--- 8. Function search_path (mutable check) ---"
MUTABLE_FUNCS=$(PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
    -c "
    SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT p.proconfig @> ARRAY['search_path=pg_catalog,public']);
    " -t -A | head -1)
echo "Functions with mutable search_path: $MUTABLE_FUNCS"

if [ "$MUTABLE_FUNCS" -gt 0 ]; then
    echo "❌ FAIL: Found mutable functions"
    PGPASSWORD="$DB_PASSWORD" psql \
        "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
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
PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
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
PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
    -c "
    SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
    FROM pg_stat_activity 
    WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
      AND state = 'active'
    ORDER BY duration DESC
    LIMIT 5;
    " 2>/dev/null || echo "Query check skipped (permissions)"
echo ""

# 11. Idle in transaction
echo "--- 11. Idle in Transaction (>5min) ---"
PGPASSWORD="$DB_PASSWORD" psql \
    "postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres" \
    -c "
    SELECT count(*) as count, max(state_change) as oldest
    FROM pg_stat_activity
    WHERE state = 'idle in transaction' 
      AND state_change < now() - interval '5 minutes';
    " 2>/dev/null || echo "Check skipped"
echo ""

echo "=== Audit Complete ==="

# Summary
KNOWN_ERRORS='["rls_disabled_in_public"]'
KNOWN_WARNS='["extension_in_public","anon_security_definer_function_executable","authenticated_security_definer_function_executable"]'

NEW_ERRORS=$(echo "$ADVISORIES" | jq --argjson known "$KNOWN_ERRORS" \
    '[.[] | select(.level=="ERROR" and (.name | IN($known[])) | not)] | length')

NEW_WARNS=$(echo "$ADVISORIES" | jq --argjson known "$KNOWN_WARNS" \
    '[.[] | select(.level=="WARN" and (.name | IN($known[])) | not)] | length')

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