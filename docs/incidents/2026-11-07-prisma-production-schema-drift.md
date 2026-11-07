# Incident: Prisma migration history diverges from the production schema

**Date:** 2026-11-07  
**Environment:** TAD API / connected Supabase us-west-2 project  
**Severity:** P1 (availability, integrity); financial flows require P0-level change controls.  
**Status:** Diagnosed; targeted migration proposed; production repair not verified.

## Evidence (read-only queries, 2026-11-07)

1. The API logs `prisma.systemSetting.upsert()` failing because `public.system_settings` does not exist.
2. `public._prisma_migrations` contains 18 rows marked finished, but 11 retain error logs from failed executions. Therefore `prisma migrate deploy` saying "No pending migrations" does **not** establish schema parity.
3. Comparing the 52 `model` declarations in `apps/api/prisma/schema.prisma` with `information_schema.tables` in `public` found **21 present and 31 absent** (excluding the three non-model tables `_prisma_migrations`, `media_campaign`, and `rate_limit_windows`).
4. Missing tables include `system_settings`, `users`, `playlists`, `device_commands`, `commissions`, `commission_ledger`, `idempotency_keys`, `payment_intents`, `payment_evidence`, and `settlement_batches`.
5. The recorded failed migration errors include:
   - Missing dependency tables (`42P01`: `devices`, `media_assets`, `campaigns`, `financial_transactions`, `commissions`).
   - PostgreSQL `uuid` vs `text` mismatches (`42804` and `42883`).
   - `CREATE INDEX CONCURRENTLY` inside a transaction (`25001`).
   - SQL syntax errors (`42601`).
6. Actual database identifiers still have incompatible types in places: `drivers.id` is `text`, while `telemetry.driver_id` and `wallets.driver_id` are `uuid`. Do not rewrite their types or recreate foreign keys without checking rows and dependencies.

## Targeted change in this PR

The migration `20261107_restore_system_settings` adds only the missing `public.system_settings` table and its unique key index. It follows the Prisma model mapping, enables RLS, and revokes anonymous/authenticated Data API privileges.

**It does not recreate the other 30 missing models or modify ledger, wallet, payout, campaign, or driver data.** This is an intentionally scoped availability improvement, *not* a declaration that the production schema is healthy.

The existing `SystemSettingsService.onModuleInit` seeds defaults on startup with `update: {}`, preserving values that already exist. However, the code currently proposes `slotPrice=500` while other pricing components contain 1500/2500 references. **Do not deploy and restart as a financial-signoff shortcut.** Approve the authoritative commercial values and review downstream pricing before enabling new defaults in production.

## Required recovery sequence

1. Take and **verify** a restorable backup/snapshot. Record point-in-time recovery capability and a recovery owner. Do not copy customer data into issues or logs.
2. Record production deployment SHA, active Supabase project, `DATABASE_URL` and `DIRECT_URL` **hosts only** (never print credential strings).
3. Run read-only checks below and archive counts, column types, foreign keys, RLS settings, and migration status.
4. Review the targeted migration and the financial defaults. Deploy to a staging database that has a representative schema and synthetic data. Run API build and focused Jest tests.
5. After required approvals, merge the PR and deploy the API image. Its entrypoint uses `prisma migrate deploy` and will pick up the new migration. Never use `prisma migrate reset`, `prisma db push`, or bulk `migrate resolve --applied` on production.
6. Verify `public.system_settings` existence, column types, `relrowsecurity`, no grants to `anon`/`authenticated`, seed idempotency, admin configuration endpoints, and health checks.
7. Open a **separate expand/migrate/contract remediation** to reconcile all remaining models, UUID/TEXT discrepancies, foreign keys, and failed migration history. Use a staging restore; reconcile financial ledger/idempotency with controlled invariants; validate offline sync and 10x ingestion performance.
8. Keep the Next.js `Server Reference ID ... "x"` error separate until actual user requests versus malformed scanners can be distinguished by route, build SHA, and action headers. Do not disable Server Actions security.

## Read-only verification SQL

```sql
SELECT to_regclass('public.system_settings') AS system_settings;

SELECT migration_name,
       finished_at IS NOT NULL AS finished,
       rolled_back_at IS NOT NULL AS rolled_back,
       logs IS NOT NULL AS has_failure_log
FROM public._prisma_migrations
ORDER BY started_at;

SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('drivers','wallets','telemetry','system_settings')
  AND column_name IN ('id','driver_id','key','value','type','group','created_at','updated_at')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'system_settings';

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'system_settings';
```

## Completion criteria

The targeted fix is only **verified** once its migration executes in the intended database and a live API startup + settings endpoint works. Full incident closure additionally requires a tracked remediation for the 30 other missing models and incompatible key types, with automated regression checks. A green `migrate deploy` alone is insufficient.
