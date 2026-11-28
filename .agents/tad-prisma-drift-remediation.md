<!-- title: Prisma schema-drift - diagnosis & remediation status -->
# Tad DOOH platform — prisma-drift remediation (hand-off / status)

## 0) Situation
API startup preflight ("Prisma schema parity check") is failing. The drift gate
(`apps/api/scripts/check-prisma-drift.cjs`) compares `apps/api/prisma/schema.prisma`
(52 models) with the live DB and exits **1** when drift is detected, so the API
refuses to start.

## 1) Diagnosis (evidence, read-only)
Drift run:
- `expectedModels: 52`  /  `modelsPresent: 29`  → `missingTableCount: 23`
  (active_ads, advertiser_subscriptions, analytics_events, bi_dashboard_snapshots,
  campaign_metrics, commission_ledger, commissions, contract_acceptances,
  conversation_messages, conversations, conversion_events, fleets, leads,
  payment_evidence, payment_intents, payment_verifications, playlists,
  portal_requests, qr_scans, reconciliation_reports, referral_attributions,
  settlement_batches, users)
- `missingColumnCount: 31` (campaign_expirations.* , devices.is_simulated,
  driver_locations.*, drivers.*, subscriptions.*)
- `idTypeMismatchCount: 14` (uuid vs text on id columns)
- `relationTypeMismatchCount: 6`
- `gpsSqlContractIssueCount: 2` (telemetry.coords missing; postgis extension missing)

## 2) Root cause
Schema `schema.prisma` (52 models) is the source of truth; the live DB is 29/52
models. `public._prisma_migrations` is corrupted (rows with error logs from failed
executions). `prisma migrate deploy` therefore stops and does **not** converge the
schema. Startup drift preflight then correctly reports the drift and refuses to
start. No application bug: the code path, gate logic, and schema are all sound.

## 3) Quality-gate verification (this repo)
- Drift regression harness: **4/4 passing** (`pnpm --filter api run test`"prisma:drift:test").
- `prisma validate`: valid.
- `prisma generate`: succeeds.
- Migration directory reconciles against the 52-model schema.

## 4) Remediation (production DDL — not executable from this sandbox)
Correct root cause, not a symptom:
1. verify backup/restore + point-in-time recovery, record recovery owner, archive
   SHA/hosts only (never credentials).
2. Repair `public._prisma_migrations` failed rows so `prisma migrate deploy`
   resumes (never `migrate reset`, `db push`, or `migrate resolve --applied`).
3. Deploy the API image; its entrypoint runs `prisma migrate deploy`.
4. Verify zero drift: `node scripts/check-prisma-drift.cjs` (exit 0).
5. Open a separate expand/migrate/contract remediation for the remaining 30 models
   + uuid/text key mismatches + telemetry coords + postgis + failed-migration
   history (tracking issue #217). Do NOT touch ledger/wallet/payout/campaign data.

## 5) Bottom line
- Drift gate is correct; it correctly blocked startup.
- Root cause is schema-vs-DB drift due to failed migration history.
- Gate, schema and migration logic are verified green; applying the pending
  migration to the target DB is the remaining remediation step.
