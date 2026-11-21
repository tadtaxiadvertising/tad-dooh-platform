# TAD #217 — Design of a staged Prisma/PostgreSQL reconciliation (NOT executable)

**Incident:** [#217](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217) · **Severity:** P0 · **Analysis date:** 2026-11-21 UTC  
**Source of truth used for comparison:** `main` commit `777020dae7ae51ebd1b150e3928fa7d4f3d531a4`, `apps/api/prisma/schema.prisma` (52 models), against **read-only** `information_schema` metadata from the owner-confirmed Supabase project `ltdcdhqixvbpdcitthqf`.  
**Status:** evidence-only staging design; **NO SQL migrations are approved**, no backup was created, no restore was tested, no production state was changed.

The EasyPanel operator independently stated that this is the API's canonical project. A private three-URL preflight of the deployed runtime remains necessary. Source migrations **are not a faithful representation of actual installed DDL** merely because Prisma says they finished. Never rebuild missing tables by replaying previously marked-applied migrations.

## Executive finding

| Metadata check | Observed 2026-11-21 | Consequence |
| --- | ---: | --- |
| Prisma models | 52 | Baseline from tracked schema |
| Present/missing mapped model tables | 29 / **23** | API fail-closed correctly rejects startup |
| Physical `public` base tables / catalog columns | 33 / 346 | Includes non-model tables; not business row counts |
| Physical `public` FKs / RLS-enabled base tables | 13 / 9 | Aggregate catalog counts; not proof of correct FK mappings or RLS policies |
| Missing columns of **present** model tables | **34** | Creating the 23 missing tables alone cannot close the gap |
| Primary-key `String` expected TEXT versus actual UUID | **14** | Must reconcile Prisma/native types and FK compatibility |
| Six verified logical relation type conflicts | **6** | Adding these FKs as written is unsafe/incompatible |
| Prisma migration rows finished | 23 / 23 | Cannot infer full DDL application |
| Rows retaining historical error logs | **11** | Historical SQL failures require forensic treatment |
| Auth user rows / Storage buckets / Storage metadata rows | 13 / 2 / 11 | Counts only; individual records and object bytes were not inspected |
| Backup to encrypted off-site storage | **not evidenced** | **No schema change authorized** |
| Full isolated restore from off-site copy | **not evidenced** | **No schema change authorized** |

Prior comparison of the 23 SQL migration file checksums against Prisma history showed **23/23 matching** when preserving CRLF in two January files. This is **documented forensic evidence**, not independently recomputed in this read-only catalog pass. Earlier issue text reporting 21/23 was corrected as a line-ending false positive; never edit old migration files or mark history as applied to hide drift.

## A. Missing model tables (23)

| Domain | Tables presently absent | Required review before creation |
| --- | --- | --- |
| Identity, fleet and onboarding | `users`, `fleets`, `portal_requests`, `contract_acceptances`, `advertiser_subscriptions` | Distinguish `public.users` from existing `auth.users`; validate ownership, consent and deletion behavior |
| Campaigns and telemetry analytics | `playlists`, `active_ads`, `analytics_events`, `campaign_metrics`, `bi_dashboard_snapshots`, `qr_scans`, `conversion_events` | Preserve device/campaign identifiers, impression dedupe, cold-start behavior |
| Finance, payouts and attribution | `commissions`, `commission_ledger`, `settlement_batches`, `payment_intents`, `payment_evidence`, `payment_verifications`, `leads`, `referral_attributions`, `reconciliation_reports` | Ledger, balance derivation, idempotency, evidence integrity and ownership; never fabricate historical rows |
| Conversations | `conversations`, `conversation_messages` | Parent-before-child, ACL, retention and authored-message ownership |

**Important:** these are missing **mapped Prisma model tables**, not a list of every absent database object. Some earlier missing objects (e.g. `device_commands`, `notifications`, `videos`, `idempotency_keys`) now exist. Do not treat the historical 30-name inventory as today's exact missing set.

## B. Missing scalar columns on tables that already exist (34)

| Table | Missing columns | Count |
| --- | --- | ---: |
| `campaign_expirations` | `advertiserId`, `campaignId`, `driverId`, `notificationSent`, `notified_at`, `remainingDays`, `scheduled_for` | 7 |
| `devices` | `is_simulated` | 1 |
| `driver_locations` | `is_simulated`, `speed` | 2 |
| `drivers` | `agreement_version`, `bank_account`, `cedula`, `consecutive_months_under_goal`, `contract_accepted`, `contract_accepted_at`, `hardware_config`, `identidad_vehicular`, `insurance_accepted`, `insurance_accepted_at`, `is_simulated`, `level`, `onboarding_status`, `password`, `referral_code`, `referred_by`, `subscription_end`, `subscription_paid`, `taxi_plate` | 19 |
| `media` | `mimeType` | 1 |
| `subscriptions` | `device_id`, `is_simulated`, `paid_at`, `valid_until` | 4 |
| **Total** | | **34** |

These are column *names as defined by Prisma mapping*, not recommendations to issue `ALTER TABLE ADD COLUMN` immediately. Inspect nullability, defaults, indexes, relation semantics and real current rows first. **Never seed driver passwords, bank details, identity numbers, consent flags or subscription payments with invented values.** Some camelCase fields and legacy snake_case columns may represent unresolved mapping conventions.

## C. Existing UUID primary keys that Prisma expects as TEXT (14)

```text
advertisers.id             campaign_expirations.id  campaign_intents.id
campaigns.id               devices.id               driver_locations.id
financial_transactions.id  invoices.id              media_assets.id
media.id                   payroll_payments.id      playback_events.id
telemetry.id               wallets.id
```

The safe choice cannot be determined from types alone. Compare source-to-target logical relation intent and real data on a **restored isolated clone**. Consider mapping existing physical UUID columns as Prisma `@db.Uuid` only when compatible with all relevant model fields, dependent queries, raw SQL, offline identifiers and downstream serialized contracts. Do **not** perform global UUID→TEXT or TEXT→UUID casts on production or generate random replacement identifiers.

## D. Confirmed logical relationship conflicts (6)

The following were individually rechecked on the live PostgreSQL catalog with **SELECT only** on 2026-11-21. These are **source-level logical relations**, not evidence that matching physical FK constraints currently exist or that row values are orphaned.

| Referencing column/type | Referenced column/type |
| --- | --- |
| `device_campaigns.device_id` — TEXT | `devices.id` — UUID |
| `devices.driver_id` — UUID | `drivers.id` — TEXT |
| `driver_locations.device_id` — UUID | `devices.device_id` — TEXT |
| `driver_locations.driver_id` — UUID | `drivers.id` — TEXT |
| `telemetry.driver_id` — UUID | `drivers.id` — TEXT |
| `wallets.driver_id` — UUID | `drivers.id` — TEXT |

**No FK is authorized on any pair above** until reference semantics, representative data, compatible types, unique targets and orphan checks have been proven in the isolated restore. An apparently empty operational table is not proof that other Auth, Storage or financial data are empty.

## E. Stage-gated implementation sequence (all stages BLOCKED pending recovery checkpoint)

**G0 — Containment, identity and full restore proof (mandatory):**
1. Run `scripts/verify-supabase-runtime-target.cjs` privately with operator-authorized `TAD_EXPECTED_SUPABASE_PROJECT_REF`; print verdicts only, never URLs. Reconcile with EasyPanel deployment SHA and secrets incident [#244](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/244).
2. Coordinate an approved **write-quiescence window or provider-supported point-in-time-consistent snapshot strategy** before multiple role/schema/data exports; three independently invoked `db dump` commands alone do not prove a single data-consistent backup under concurrent writes. Then export into a restricted encrypted volume **outside Git**; run `scripts/verify-supabase-backup-export.cjs`. Its `EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED` is **only** byte-integrity verification.
3. Capture a time-scoped, **aggregate-only** source baseline using [restore proof SQL](sql/2026-11-21-restore-readonly-proof.sql), and repeat on the isolated clone. Compare only after establishing a consistent snapshot time; matching counts are necessary diagnostics, **not** proof of successful restore. Copy the export to independently retained encrypted off-site storage. Export actual Storage bucket object **bytes** separately and prove checksum, coverage and retention. Do not equate `storage.objects` rows with downloaded media.
4. Restore the off-site copy in an **isolated, side-effect-disabled** PostgreSQL/Supabase-compatible instance; verify Auth users, Storage objects, schema/constraints, aggregate counts, hashes, and restore elapsed time (RTO/RPO). Do not provision paid projects without authorization. Never restore over `ltdcdhqixvbpdcitthqf` or implicitly over inactive `tadprod`.
5. Owner and reviewer attest restore evidence **privately**. The absence of a full verified restore blocks every subsequent schema-write stage.

**G1 — Forensic source-of-truth signoff on restored clone:**
1. Preserve existing migration metadata and 11 historical failure indicators. Review original SQL, modern Prisma mapping and actual catalog object/column/index/constraint ownership. Do not rewrite applied SQL or use `migrate resolve --applied` to conceal missing DDL.
2. Resolve the 14 UUID/TEXT PK discrepancies and six logical FK types with a change-impact matrix for API, frontend, tablet, queues, media and finance. Choose a stable ID representation with no destructive mass casts.
3. Document the full set of 23 missing tables, 34 missing columns, all unique constraints, indexes, functions/triggers, PostGIS location types, RLS policies and grants. Prove critical table data counts and presence of Auth/Storage state without exposing records in public CI or tickets.

**G2 — EXPAND, staged in small, reviewable migration batches on clone only:**
1. Add independent structures only after their base identifiers, owner relations and permissions are approved.
2. Respect parent-before-child dependencies: `conversations` → `conversation_messages`; `leads` → `payment_intents` → `payment_evidence`/`payment_verifications`; `leads` → `referral_attributions`; `settlement_batches` and `drivers` before `commissions`; `campaigns` before `playlists`. Do not install an FK merely because a Prisma `@relation` exists.
3. Add columns as nullable/compatibility-first when necessary. Review sensitive `drivers` fields and subscription/financial defaults individually. Enable reviewed RLS and least-privilege grants for new `public` tables; never grant `anon` or `authenticated` broad privileges by default.
4. Treat PostGIS and `telemetry.coords` as a separate migration contract; never modify `spatial_ref_sys` ownership or silently disable GPS checks.

**G3 — MIGRATE/VERIFY on clone:**
1. Backfill only approved datasets, in bounded, idempotent batches with verifiable counts and rollback checkpoints. Preserve existing IDs, identity/consent flags and immutable financial events.
2. Enforce uniqueness, ledger/accounting invariants, payout idempotency and duplicate-event detection **before** adding restrictive constraints. Validate FK compatibility and referential data in advance; plan lock-sensitive index creation at 10× event volume.
3. Run `apps/api/scripts/check-prisma-drift.cjs` with **read-only** credentials against the clone; require zero missing tables, columns, PK and scalar conflicts, relation mismatches, and GPS issues. Also compare physical FK/index/RLS/grants against reviewed contracts; the existing parity checker **does not certify all constraints or data integrity**.
4. Run strict TypeScript/Jest, auth and ledger regression tests, Driver/Player offline queue reconnect/replay, proof-of-play/telemetry idempotency, and load/burst benchmarks at 10× scale. Record no real PII, wallets, tokens or media.

**G4 — CONTRACT/PRODUCTION only after explicit separate change approval:**
1. Require final owner signoff for the exact deployment SHA, schema SQL, data invariants, independent backup/restore proof, P0 #244 credential containment, and main protection [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313).
2. Stage additive migrations under a reviewed maintenance/roll-forward plan; keep current API startup fail-closed and telemetry/financial/offline checks. Defer destructive contract cleanup until compatibility is proven across versions.
3. Preserve the restoration artifact independently; verify post-deploy parity on the *actual* target and live health only through authorized, redacted methods. Never interpret green CI as approval to touch production.

## F. Current result and non-goals

- **Verified here:** source and live catalog metadata comparison (52 models/23 tables/34 columns/14 ID and six relation mismatches), current linked Supabase project identification and read-only queries. No end-user or ledger rows retrieved.
- **Not verified:** private runtime URL preflight, encrypted off-site export, Storage object-byte backup, restore trial, clone migration, data-level financial/offline integrity or production recovery.
- **No changes proposed to:** production database, Prisma migrations, API entrypoint, RLS grants, data permissions, secrets, financial ledgers, offline queues or Docker.
- **Release status:** **P0 blocked / #217 stays open.** This file is an analysis and staged design, not executable SQL or a migration authorization.

See [canonical backup and restore runbook](2026-11-21-p0-217-canonical-backup-restore-runbook.md), [read-only inventory SQL](sql/2026-11-20-prisma-recovery-readonly-inventory.sql), [aggregate clone-restore proof SQL](sql/2026-11-21-restore-readonly-proof.sql) and [historical drift evidence](2026-11-20-prisma-drift-evidence-update.md).
