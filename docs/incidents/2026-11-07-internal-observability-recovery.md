# Internal error and notification table recovery

**Date:** 2026-11-07  
**Status:** Draft migration, pending staging validation; production not modified.  
**Scope:** `public.system_errors`, `public.notifications` only.  
**Priority:** P1–P2 operational observability; not a fix for the separate financial schema drift.

## Evidence

On the connected Supabase project, both tables are absent, but Prisma declares `SystemError` and `Notification` models. Backend code calls `systemError.create` in error-handling paths and attempts `notification.create` to record financial anomalies. These operations fail when the tables do not exist, obscuring incident visibility.

The models contain only scalars and independent indexes; **no foreign keys**. The earlier drift inventory reports 29 missing model tables; this proposal addresses two only. Current 20 Prisma migration records still coexist with historical failed migrations and unrelated UUID/TEXT drift.

## Proposed smallest safe change

`apps/api/prisma/migrations/20261107_z_restore_internal_observability/migration.sql` creates exactly:
- `system_errors`: text client-generated PK, source/severity/message, optional details/entity, retry count, resolved state, timestamps and query indexes.
- `notifications`: text client-generated PK, title/message/type/category, read flag/entity, timestamp and indexes.

Both use Prisma-compatible scalar names/defaults, have RLS explicitly enabled, and revoke `PUBLIC`, `anon` and `authenticated` table access. No service or UI path is changed. SQL contains no DROP/DELETE/TRUNCATE, no data backfill and no financial table operations.

**Important:** Protecting raw notifications in PostgREST can prevent direct client-side Supabase Realtime access. Backend-authorized delivery remains the intended safe default. Do not grant `anon`/`authenticated` SELECT or INSERT without a separately reviewed ownership policy.

## Required verification before merge

1. Confirm EasyPanel API environment's Supabase project ID matches the inspected project using the redacted startup preflight; verify a restorable backup.
2. Apply the migration to a staging clone with representative schema and synthetic data. Run `prisma migrate deploy`, client generation and `prisma validate`.
3. Compare `information_schema.columns` types/defaults/nullability with the Prisma model; verify all listed indexes and that no other table changed.
4. Validate `relrowsecurity=true`, grants denied to `anon` and `authenticated`, and privileged API DB role can write.
5. Run API Jest/typecheck, Nest startup and error-reporting/notification service integration smoke tests in staging. Verify no log data or secrets are returned by public endpoints.
6. Confirm player/driver offline synchronization, wallet/ledger, invoices, and commission state are untouched; monitor DB connection usage at 10x.
7. Only after the quality gates pass, merge and deploy. The API entrypoint performs the migration automatically; no direct production SQL action is part of this PR.

## Post-deployment read-only verification

```sql
SELECT to_regclass('public.system_errors') AS errors_table,
       to_regclass('public.notifications') AS notifications_table;

SELECT c.relname, c.relrowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('system_errors','notifications');

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name IN ('system_errors','notifications');
```

Related: #217 (remaining model drift), #147 (CI runner failures), #223 (financial idempotency archival).
