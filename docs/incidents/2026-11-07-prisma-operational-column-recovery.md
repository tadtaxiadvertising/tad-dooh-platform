# Repair missing Prisma columns in existing operational tables

**Date:** 2026-11-07  
**Status:** Proposed, branch-only migration; no direct production SQL.  
**Objective:** eliminate repeatable Prisma `P2022` / PostgreSQL `42703` errors caused by model-to-table column absence.  
**Business context:** zero operational rows is expected at TAD's current development stage; **do not seed or restore business records**.

## Evidence (2026-11-07, read-only connected Supabase)

Comparison of 52 Prisma models to `information_schema.columns` in the current database:
- 26 models have physical tables; 26 models still lack tables.
- Among present tables, **34 Prisma scalar fields** have no matching column name.
- Exact breakdown: 19 in `drivers`, four in `subscriptions`, seven in `campaign_expirations`, two in `driver_locations`, one in `devices` and one in `media`; total **34**.
- `devices.is_simulated` missing: even `findUnique` can fail when Prisma selects it.
- `drivers` missing onboarding, subscription and legal acceptance fields that are part of the current Prisma model.
- `subscriptions` missing required `valid_until`, optional `device_id` and `paid_at`, and `is_simulated`.
- `driver_locations` missing `speed` and `is_simulated`.

## Safe additive migration

`20261107_zzzz_restore_operational_scalar_columns` adds **26 scalar fields** across devices/drivers/subscriptions/driver_locations using Prisma-mapped names, nullable types and conservative explicit defaults. It adds three unique keys for driver identifiers plus lookup indexes.

Financial protection: `subscriptions.valid_until` is required, but there is **no authorized universal expiration date**. The migration begins with a precondition: if the column is absent and existing subscriptions contain rows, raise an exception **before running any DDL**, rather than backfill fake expiry values. The column is added NOT NULL without a default only for an empty table.

No wallet/commission/ledger records, subscription balances or commercial prices are updated. No destructive SQL.

## Explicit remaining work

- `media.mimeType` is a second Prisma field alongside `media.mime_type @map("mime_type")`; do NOT add a fake duplicate physical column. Choose one canonical field and update all code/select/response contracts in a separate review.
- `campaign_expirations` is not simply missing seven names: physical table has legacy `expiry_date`, while the model expects scheduled notification/remaining-day fields. Align domain semantics before changing DDL or mappings.
- Physical UUID/TEXT mismatches remain in `devices`, `campaigns`, `driver_locations`, and other models. A column-presence fix does not reconcile foreign-key type drift.
- 26 **entire model tables** are missing, including `device_commands`, `device_heartbeats` and `videos`; they block real approved-device sync until a staged, native-type-verified migration is applied.
- Existing `drivers.status` and `subscriptions.status` database defaults diverge from current Prisma defaults. Do not change business/financial defaults without documented product signoff.

## Release gates

1. Verify active EasyPanel project ref, PITR/snapshot and staging restore.
2. Confirm row counts and inspect current production columns using read-only metadata queries.
3. Run `node --test apps/api/scripts/operational-columns.contract.test.cjs` (4 focused contracts), Prisma `migrate deploy` on staging, `prisma validate`, and `prisma generate`.
4. Run API strict TypeScript and focused registration/onboarding/subscription tests, plus existing driver/mobile offline flow.
5. Verify each added column name/type/nullability, unique index, insert defaults, and no unrelated data changed.
6. Run a minimal **synthetic** device registration and driver onboarding on staging only; do not create fake production inventory.
7. Check DB grants/RLS and permission boundaries before deployment; monitor logs for `P2022` and subsequent FK mismatch errors after rollout.

## Read-only verification

```sql
SELECT table_name, column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('devices','drivers','subscriptions','driver_locations')
ORDER BY table_name, ordinal_position;

SELECT
  (SELECT count(*) FROM public.devices) AS device_count,
  (SELECT count(*) FROM public.drivers) AS driver_count,
  (SELECT count(*) FROM public.subscriptions) AS subscription_count;
```

Related: #217 (broader drift), #147 (Actions runners), PR #228 (license and command bugs). **Not yet verified on PostgreSQL staging.**
