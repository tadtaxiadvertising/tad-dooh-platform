# TAD — Prisma schema drift: evidence update (2026-11-20)

**Severity:** P0 operational gate (API cannot safely boot while drift persists).  
**Scope:** Connected Supabase project in `us-west-2` and EasyPanel log supplied 2026-11-20.  
**Status:** Investigated via read-only metadata; **not repaired**; production runtime identity must still be confirmed against the connected project ref without exposing credentials.

## Evidence established

- EasyPanel logs show `23 migrations found`, `No pending migrations to apply`, then schema inspection reports **52 expected models / 29 present**, **23 missing tables**, **34 missing columns**, **14 primary-key UUID/TEXT mismatches**. The pasted log truncates before the full mismatch report, so scalar and relation mismatch totals are not known from that log.
- Direct read-only database queries on the connected, ACTIVE_HEALTHY Supabase project show **33 public base tables** (includes non-model tables), and **23 Prisma migration rows** with `finished_at IS NOT NULL` and `rolled_back_at IS NULL`. The list of public tables confirms critical absences: `users`, `commission_ledger`, `commissions`, `payment_intents`, `payment_evidence`, `settlement_batches`, `playlists`, and more.
- **11 historical Prisma migration rows** have nonempty `logs` containing failure/error indicators despite being marked finished: `20260309_add_drivers_and_subscriptions`, `20260424_v12_schema_sync`, `20260521_add_media_asset_processing_fields`, `20260628_add_schedule_and_weight_fields`, `20260916_gin_indexes`, `20260916_wallet_unification`, `20260917_add_currency_to_financial_transactions`, `20260917_campaign_targeting_jsonb`, `20260921_phase6_commissions_qr_conversation_metrics`, `20261012_campaign_notification_dedup`, `20261012_telemetry_gps_burst_fix`. Historical logs are evidence of attempted errors, not by themselves proof that each migration remains wholly unapplied.
- `information_schema.columns` confirms `campaigns.id`, `devices.id`, `financial_transactions.id`, and `campaign_expirations.id` are `uuid` while `drivers.id` is `text`. The current Prisma schema declares String identifiers without `@db.Uuid` for some UUID-backed models; do not fix this by blind type conversion.
- `apps/api/docker-entrypoint.sh` invokes `migrate deploy` followed by the read-only `check-prisma-drift.cjs`; `set -eu` causes startup to stop if drift is detected. This is intentional fail-closed protection. The supplied repeated log prefaces are consistent with repeated startup attempts but do not prove the deployment orchestrator's exact restart policy.
- The project's connection validation verifies matching Supabase refs between `DATABASE_URL`, `DIRECT_URL` and `SUPABASE_URL` inside EasyPanel, but **does not prove** that the independently connected Supabase project is the same as that deployment; the visible pooler host only shows region.

## Root cause assessment

**Confirmed mechanism:** Prisma migration metadata reports completion despite an incomplete live schema, so `migrate deploy` has no pending SQL to execute. The deliberate schema-parity gate blocks NestJS startup.  
**Likely historical contributors:** failed migration attempts later marked completed, pre-existing UUID/TEXT model mismatches, and dependencies missing during prior migration runs (see `docs/incidents/2026-11-07-prisma-production-schema-drift.md`). **The exact provenance of every missing table is not yet proven.**

## Safe recovery gates

1. **Identity:** Have the EasyPanel operator compare project refs from `DATABASE_URL`, `DIRECT_URL`, and `SUPABASE_URL` with the connected Supabase project privately. Do not paste URLs, refs paired with credentials, JWTs or keys into tickets.
2. **Recovery readiness:** Take and *test restore* a backup to staging; record PITR coverage and the rollback owner.
3. **Forensics:** Preserve migration-history metadata and DDL; inspect failure logs privately, checksums, complete live `information_schema` and FK/RLS/index inventory. Check app deployment SHA to ensure schema/client match deployed code.
4. **Staging first:** Build a forward-only `EXPAND → MIGRATE → CONTRACT` reconciliation migration. Explicitly resolve UUID/TEXT relationship mapping without rewriting production primary keys. Identify legacy tables/data before any creation; all SQL must be reviewed for idempotency and transactional safety.
5. **Security / financial:** Every added public table must have reviewed RLS and grants. Validate ledger balance derivation, webhook idempotency, commissions and payout reconciliation. Validate the offline tablet queue during reconnect and retries.
6. **Verification:** Run Prisma drift check with a read-only connection and require all five reported mismatch counts to be zero; run migrations in a staging restore; `pnpm --filter api run build`, relevant tests, then authenticated API/device/financial smoke tests. Measure performance and lock impact at 10x before release.
7. **Release:** Deploy only the reviewed, rehearsed migration with an agreed maintenance/rollback plan. Do not `prisma db push`, `prisma migrate reset`, `--accept-data-loss`, bulk `migrate resolve --applied`, or disable the startup parity gate.

## Current result

**Verified:** read-only inventory, Prisma migration metadata, existing fail-closed startup code.  
**Not verified:** matching EasyPanel runtime project ref, restorable backup, full DDL dependencies, schema reconciliation, live API restoration. **No production SQL mutations performed.**

Related investigation: `docs/incidents/2026-11-07-prisma-production-schema-drift.md`.
