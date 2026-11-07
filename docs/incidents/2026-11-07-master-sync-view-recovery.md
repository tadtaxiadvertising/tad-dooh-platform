# TAD master-sync startup incident: missing materialized view

**Date:** 2026-11-07  
**Status:** Root cause confirmed, draft remediation; not applied to production by this PR.  
**Priority:** P1 platform availability / advertising playback.  
**Affected:** API startup, campaign synchronization, device manifests, targeting.

## Evidence (live connected Supabase, read-only)

The 21st Prisma migration (`20261107_z_restore_internal_observability`) applied successfully. On subsequent NestJS startup:
- `42703: column c.target_all does not exist`.
- Repeated `42P01: relation "mv_active_campaigns" does not exist`.

Current Postgres metadata confirms:
- `public.campaigns` lacks `target_all`, despite Prisma `Campaign.targetAll` mapped to that column.
- `public.mv_active_campaigns` does not exist.
- `public."_CampaignToDriver"` does not exist, but the old MV definition requires it.
- `device_campaigns.device_id` is physically TEXT (the related `devices.id` is UUID); `campaigns.id` and `device_campaigns.campaign_id` are UUID; `drivers.id` is TEXT.
- `campaigns`, `devices`, `drivers` and `device_campaigns` each currently have **zero rows** in the inspected project. If the business expects active inventory, investigate a possible data migration/connection mismatch. Region and matching env project refs do not prove that historic production data is present.
- `public.refresh_active_campaigns()` already exists and has default `EXECUTE` permissions for `anon` and `authenticated`. It is not SECURITY DEFINER, but these grants are unnecessary.
- The prior `PrismaService.initializeSreViews()` attempted **DROP MATERIALIZED VIEW on every app boot**, then created it from `prisma/views.sql`. It caught each SQL error and finally logged success even when the view did not exist.
- `SyncService` queries the MV directly and has no alternative for an absent relation. Player/driver offline caches must never be cleared as a workaround.

## Root cause

The runtime view definition is out of sync with physical tables, and data-definition changes were run imperatively on every API start instead of via tested, versioned migrations. An unavailable dependent object caused repeated raw errors. Historical migration history was already known to contain failed/mis-marked operations (#217).

## Safe remediation in this PR

1. Remove **all view DROP/CREATE** from `PrismaService.onModuleInit`. Keep the app's DB connect separate from an inexpensive, cached, read-only `pg_matviews` readiness check.
2. Log `MASTER_SYNC_VIEW_UNAVAILABLE` once per incident until the view recovers, never log URL credentials or dump business data; do not report that the view is configured when it is not.
3. Preserve `/health` liveness (so EasyPanel does not churn), report `status=degraded` and `db.masterSyncViewReady=false` via `/health/full` when sync is unavailable.
4. Retire the old `create_mv.js` manual DDL launcher and leave `prisma/views.sql` as a deprecated, non-executable pointer to migration history.
5. Add a new **additive** migration: create the missing `campaigns.target_all` column, `"_CampaignToDriver"` join table with database-compatible physical types, and `mv_active_campaigns` with indexes and direct Data API permissions revoked. **No DROP.**
6. The new MV only includes `status='ACTIVE'`, `active=true`, and campaigns within their approved date window. This prevents unapproved/pending-payment campaigns from playing even if they have `active=true` by default.
7. For explicit device assignment, handle both hardware IDs and UUID-form strings in the materialized aggregates; current database `device_campaigns.device_id` is TEXT, so a UUID-only join would underdeliver.
8. Revoke default public execution of `refresh_active_campaigns()` without changing its invoker security context.

## Important trade-offs and limitations

- A newly-created empty MV can be structurally healthy even when there are **zero devices/campaigns/drivers**. Healthy view availability is NOT proof of a working ad inventory.
- This patch deliberately does **not** reconstruct the other 26 missing Prisma models or reconcile incompatible physical UUID/TEXT primary keys; see #217. In particular, `videos` remains missing and some `Campaign.findMany({ include: { videos: true } })` paths may still fail. Do not declare the player end-to-end ready on this basis.
- `campaigns.target_all` is added with `DEFAULT true` to match the existing Prisma `@default(true)`. For serving ads, the MV also requires `status='ACTIVE'`, preventing activation through defaults alone. A future product-approved targeting default change must update API, Prisma and DB together.
- The `"_CampaignToDriver"` relation uses A=campaign UUID and B=driver TEXT to match the **physical production schema**, not the current Prisma String/TEXT assumptions. Test Prisma client relation reads and writes explicitly in staging.
- Materialized views cannot enforce ordinary table RLS; the migration revokes direct role grants. The application must enforce authorization on sync endpoints. No general RLS policy is added to existing financial tables.
- This does not change tablet Service Worker, IndexedDB or cached media. Preserve cached playable content when sync endpoints fail.

## Required gates before merging/deploying

1. Confirm intended Supabase project ref against the live EasyPanel deployment WITHOUT printing credentials. Verify a restorable snapshot/PITR.
2. Reconcile whether the inspected project should contain 0 devices/drivers/campaigns; if not, identify the correct historical database before applying DDL.
3. Apply this migration to a **staging restore** with representative UUID/TEXT schema and synthetic seeded campaigns/devices/drivers. Test `prisma migrate deploy`, `prisma validate`, client generate, and strict API TypeScript.
4. Verify `mv_active_campaigns` exists with `ispopulated=true` and a unique unconditional `campaign_id` index. Run `REFRESH MATERIALIZED VIEW CONCURRENTLY` on staging; PostgreSQL requires a populated view plus such an index.
5. Test global, city, multi-city, device UUID, device hardware ID, driver, negative targeting, expiry, and pending-payment campaigns; ensure **at most 15 slots** and no unauthorized creative delivery.
6. Run focused PrismaService and HealthController Jest tests; verify bootstrap never executes DROP/CREATE, returns one clear warning when view missing, and `/health/full` reports degradation.
7. Verify `anon` and `authenticated` cannot directly select the MV, change the implicit relation, or execute the refresh helper. Exercise protected NestJS manifest endpoints with the device's real authorization token.
8. Check offline→reconnect→sync→reconciliation on a tablet/player fixture; if the API is temporarily degraded, existing cached ads must not be wiped.
9. At 10x campaigns/devices, confirm refresh latency, index cost, PostgreSQL pool usage and no per-request refresh/DDL storms.
10. Merge only after CI + staging pass; monitor view freshness, manifest errors and ad playback on rollout. For rollback, redeploy prior API without dropping the new additive tables/view. No destructive rollback against production.

## Read-only post-deployment checks

```sql
SELECT to_regclass('public.mv_active_campaigns') AS sync_view,
       to_regclass('public."_CampaignToDriver"') AS driver_target_table;

SELECT column_name, udt_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='campaigns'
  AND column_name='target_all';

SELECT schemaname, matviewname, ispopulated, hasindexes
FROM pg_catalog.pg_matviews
WHERE schemaname='public' AND matviewname='mv_active_campaigns';

SELECT i.relname AS index_name, ix.indisunique
FROM pg_index ix
JOIN pg_class i ON ix.indexrelid=i.oid
WHERE ix.indrelid=to_regclass('public.mv_active_campaigns');

SELECT p.proname,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='refresh_active_campaigns';
```

References: PostgreSQL docs on [REFRESH MATERIALIZED VIEW](https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html) and [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html).

**Do not run `prisma db push`, `migrate reset`, `DROP MATERIALIZED VIEW`, or bulk `migrate resolve --applied` on production.**
