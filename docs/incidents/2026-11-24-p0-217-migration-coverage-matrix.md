# TAD P0 #217 — Prisma model ↔ versioned migration coverage

**Evidence checkpoint:** 2026-11-24 UTC  
**GitHub source:** `main@0c3d25b8a63420dbe5d2bc5fb48bcc49b968fd6f`  
**Connected Supabase project:** `ltdcdhqixvbpdcitthqf` (not independent proof of the current EasyPanel runtime variables)  
**State:** **FORENSIC ONLY — RESTORE NOT VERIFIED — NO PRODUCTION MIGRATION AUTHORIZED**

This matrix extends [the full P0 backup and isolated-restore runbook](2026-11-21-p0-217-canonical-backup-restore-runbook.md). It is **not** a candidate migration, an inferred baseline for rebuilding managed schemas, or approval for `prisma migrate deploy`.

## What was checked (read-only)

1. Parsed **52** `model` blocks from the **exact GitHub SHA** of `apps/api/prisma/schema.prisma`; used each model's `@@map` to derive its expected physical `public` table name.
2. Compared those names by `SELECT` to `information_schema.tables` for physical `public` base tables in the connected Supabase project. There are **33 public base tables**, of which **29 correspond to Prisma models** and **23 expected model tables are absent**.
3. Inspected every `migration.sql` in the **23 versioned directories** under `apps/api/prisma/migrations` for literal `CREATE TABLE` statements. The folder also contains **two standalone .sql files** that are not versioned Prisma migration directories; they do not make Prisma replay a baseline.
4. Used a separate read-only `pg_catalog.pg_class` and `pg_namespace` lookup to check if the ten missing model-table names exist elsewhere. The `users` name exists only under `auth`; the other nine names did not appear as relations in any schema. **`auth.users` is not the missing `public.users` Prisma model and must never be copied, renamed or dropped as a shortcut.**
5. Inspected only metadata flags / SQLSTATE indicators in `public._prisma_migrations` (no full historical logs and no business data): **23/23 rows marked finished**, **0 rolled back**. The three historical migrations below each retain nonempty error logs.

## Missing models: two distinct recovery classes

### A. Missing and without a direct literal `CREATE TABLE` in any of the 23 versioned migration SQL files — 10

| Missing `public` table | Versioned literal creation |
|---|---|
| `advertiser_subscriptions` | Not found |
| `analytics_events` | Not found |
| `bi_dashboard_snapshots` | Not found |
| `campaign_metrics` | Not found |
| `contract_acceptances` | Not found |
| `fleets` | Not found |
| `playlists` | Not found |
| `portal_requests` | Not found |
| `reconciliation_reports` | Not found |
| `users` | Not found; unrelated `auth.users` exists |

These tables may derive from an **untracked historical baseline, a retired migration, manually provisioned SQL or a later-added Prisma model**. The inspection does **not** establish which possibility explains any individual table. It establishes that merely replaying the **current versioned migration files** does not contain a direct creation for these ten models.

### B. Missing despite a literal `CREATE TABLE` in a currently finished migration — 13

| Versioned migration | Missing tables with a direct creation |
|---|---|
| `20260424_v12_schema_sync` | `active_ads`, `commissions` |
| `20260921_phase6_commissions_qr_conversation_metrics` | `commission_ledger`, `conversation_messages`, `conversations`, `conversion_events`, `leads`, `payment_evidence`, `payment_intents`, `payment_verifications`, `qr_scans`, `referral_attributions`, `settlement_batches` |

**Important:** literal SQL presence does not prove that a table was successfully created, committed, retained, or later dropped. Likewise, a finished migration row does not prove that its historical SQL matches the current live schema.

## Historical error linkage (metadata only)

| Migration | Marked finished? | Historical logs? | SQLSTATE indicator |
|---|---|---|---|
| `20260309_add_drivers_and_subscriptions` | Yes | Yes | `42P01` — undefined table |
| `20260424_v12_schema_sync` | Yes | Yes | `42804` — datatype mismatch |
| `20260921_phase6_commissions_qr_conversation_metrics` | Yes | Yes | `42P01` — undefined table |

The April migration includes `CREATE TABLE wallets` followed by foreign-key work and then other table creations. The September migration starts by creating `settlement_batches`, then executes `ALTER TABLE commissions` **before** subsequent QR/conversation/payment creations. Since `commissions` is absent in the current catalog and the September history mentions `42P01`, an upstream missing-table dependency is a **plausible failure chain**, but **not a demonstrated execution timeline**. The statement that a migration was entirely rolled back or that a specific statement failed requires preserved operator logs and transactional evidence. Do not infer rollback semantics from SQLSTATE alone.

## Safe next operations: evidence → hypothesis → staging test → reviewed fix

1. **Freeze destructive operations:** no `prisma db push`, `migrate reset`, bulk `migrate resolve`, blind `migrate deploy`, UUID/TEXT casts, disabling startup parity, production schema DDL or API promotion.
2. **Prove source identity and recovery:** operator privately validates `SUPABASE_URL`, `DATABASE_URL` and `DIRECT_URL` refs from EasyPanel, then independently proves a complete off-site, encrypted backup covering application tables, managed Auth identities, Storage metadata **and actual object bytes**, and a successful **isolated side-effect-disabled restore**. Do not treat a three-file `supabase db dump` as full coverage; the CLI normally excludes managed `auth`/`storage` schemas.
3. **Reconstruct lineage in staging:** locate or recover an authoritative historical baseline / earlier schema for the ten class-A tables. On the **restored clone only**, compare actual constraints, indexes, `@@map` names, RLS/grants, UUID/TEXT relations and money/idempotency rules before proposing any DDL.
4. **Reconcile class B separately:** inspect privately preserved historical migration error SQLSTATEs and the physical dependency graph. Do not assume that replaying September's `ALTER TABLE commissions` is safe, nor that all `IF NOT EXISTS` clauses can be rerun without semantic differences.
5. **EXPAND → MIGRATE → CONTRACT:** author forward-only, independently reviewed, idempotent migrations **after** staging restore, with explicit ledger/wallet/payout invariants, ownership checks, tablet offline→reconnect and 10× event-scale validation. Production release requires verified backup rollback/restore, actual schema-parity check, migration smoke and controlled rollout.
6. **Keep records:** record source SHA, snapshot identity, aggregate table/column/constraint counts, object-byte checksums, restored target, restore test evidence and reviewer approval in a **private access-controlled evidence ledger**. GitHub issues contain only non-sensitive outcomes.

## Verification and limits

- **Verified:** GitHub source model count 52; current connected PostgreSQL `public` counts (33 total/29 mapped/23 missing); direct literal `CREATE TABLE` coverage (10 absent, 13 present); `auth.users` versus missing `public.users`; finished-row/log-error metadata; zero production writes.
- **Not verified:** current private EasyPanel runtime connection identity; historical causes for each missing model; availability of a complete off-site backup; recovery of managed Auth and Storage object bytes; restored clone; correctness of any proposed new migration.
- **Parsing limitation:** this matrix audits **direct literal `CREATE TABLE` statements** in tracked versioned migration files. It does not rule out indirect/dynamic DDL, historical migrations outside this checkout, external bootstrap SQL or vendor-managed creation. A complete provenance claim requires historical sources and an isolated restore.
