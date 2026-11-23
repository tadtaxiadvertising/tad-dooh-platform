# TAD — Prisma schema drift: evidence update (2026-11-20)

**Severity:** P0 operational gate (API cannot safely boot while drift persists).  
**Scope:** Connected Supabase project in `us-west-2` and EasyPanel log supplied 2026-11-20.  
**Status:** Investigated via read-only metadata; **not repaired**; production runtime identity must still be confirmed against the connected project ref without exposing credentials.

## Evidence established

- EasyPanel logs show `23 migrations found`, `No pending migrations to apply`, then schema inspection reports **52 expected models / 29 present**, **23 missing tables**, **34 missing columns**, **14 primary-key UUID/TEXT mismatches**. The pasted log truncates before the full mismatch report, so scalar and relation mismatch totals are not known from that log.
- Direct read-only database queries on the connected, ACTIVE_HEALTHY Supabase project show **33 public base tables** (includes non-model tables), and **23 Prisma migration rows** with `finished_at IS NOT NULL` and `rolled_back_at IS NULL`. The list of public tables confirms critical absences: `users`, `commission_ledger`, `commissions`, `payment_intents`, `payment_evidence`, `settlement_batches`, `playlists`, and more.
- **11 historical Prisma migration rows** have nonempty `logs` containing failure/error indicators despite being marked finished: `20260309_add_drivers_and_subscriptions`, `20260424_v12_schema_sync`, `20260521_add_media_asset_processing_fields`, `20260628_add_schedule_and_weight_fields`, `20260916_gin_indexes`, `20260916_wallet_unification`, `20260917_add_currency_to_financial_transactions`, `20260917_campaign_targeting_jsonb`, `20260921_phase6_commissions_qr_conversation_metrics`, `20261012_campaign_notification_dedup`, `20261012_telemetry_gps_burst_fix`. Historical logs are evidence of attempted errors, not by themselves proof that each migration remains wholly unapplied.
- `information_schema.columns` confirms `campaigns.id`, `devices.id`, `financial_transactions.id`, and `campaign_expirations.id` are `uuid` while `drivers.id` is `text`. The current Prisma schema declares String identifiers without `@db.Uuid` for some UUID-backed models; do not fix this by blind type conversion.
- The **current** `apps/api/docker-entrypoint.sh` performs the Supabase-target preflight and read-only `check-prisma-drift.cjs` only; it **does not execute `migrate deploy`**. The explicitly approved manual migration script is `apps/api/scripts/migrate-safe.sh`. Startup stops if drift is detected. Earlier logs/documentation may describe a superseded entrypoint; do not conflate historical migration attempts with the current read-only startup failure.
- The project's connection validation verifies matching Supabase refs between `DATABASE_URL`, `DIRECT_URL` and `SUPABASE_URL` inside EasyPanel, but **does not prove** that the independently connected Supabase project is the same as that deployment; the visible pooler host only shows region.

## Root cause assessment

**Confirmed mechanism:** Prisma migration metadata reports completion despite an incomplete live schema. Re-running `migrate deploy` alone would not reconstruct these objects because the associated historical migrations are marked complete. The current read-only schema-parity gate deliberately blocks NestJS startup.  
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


## Follow-up forensic evidence (2026-11-20, metadata and aggregate reads only)

1. **SQLSTATE grouping by historical migration:** `42P01` affects the 20260309, 20260521, 20260628, 20260917 currency, and 20260921 phase6 migrations; `42804` affects 20260424; `42883` affects 20260916 wallet; `25001` affects 20260916 GIN and 20260917 targeting; `42601` affects 20261012 notification dedup and telemetry GPS migrations. Codes were extracted without disclosing full historical SQL logs.
2. **Logical FK columns diverge in six confirmed cases (source Prisma @relation versus actual PostgreSQL types):** `device_campaigns.device_id` TEXT versus `devices.id` UUID; `devices.driver_id` UUID versus `drivers.id` TEXT; `driver_locations.device_id` UUID versus `devices.device_id` TEXT; `driver_locations.driver_id` UUID versus `drivers.id` TEXT; `telemetry.driver_id` UUID versus `drivers.id` TEXT; `wallets.driver_id` UUID versus `drivers.id` TEXT. These are **logical mapping mismatches**; do not claim six violated physical FK constraints. The live DB has 13 declared FK constraints; several incompatible logical relations cannot be constrained as written.
3. **Aggregate records in seven existing operational tables:** `drivers`, `devices`, `device_campaigns`, `driver_locations`, `telemetry`, `wallets`, `financial_transactions` each returned **0 rows** when checked. This does **not** imply other tables are empty (e.g. settings), that a different Supabase project is empty, or that backups are unnecessary.
4. **RLS posture:** `public` has 33 base tables; 24 have RLS disabled. An effective-privilege check found **zero** RLS-disabled tables with SELECT/INSERT/UPDATE/DELETE grants to `anon` or `authenticated`. Therefore **no demonstrated direct-table data exposure via these roles**. Retain deny-by-default; do not automatically grant client roles or enable permissive policies as a workaround.
5. **Supabase security advisories:** nine public tables have RLS enabled without policies (current intended deny-by-default may be acceptable for privileged server operations); two public functions have mutable `search_path` warnings (`update_campaign_expirations_updated_at`, `refresh_active_campaigns`); leaked-password protection is disabled. Triage separately before any privileged-function or Auth config change. [Supabase linter reference](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

The executable **read-only** inventory is in `docs/incidents/sql/2026-11-20-prisma-recovery-readonly-inventory.sql`. Only run against a verified target with appropriate limited catalog permissions; the script includes no write statements. Its outputs are scoped to the connected Supabase project. This is not a recovered API or completed incident.

### Privilege detail for mutable-search-path functions

Read-only `pg_proc` inspection confirms both functions use invoker privileges, not `SECURITY DEFINER`. `refresh_active_campaigns()` grants no `EXECUTE` to `PUBLIC`, `anon` or `authenticated`. `update_campaign_expirations_updated_at()` inherits `EXECUTE` to those roles, but is a PostgreSQL trigger function attached to `public.campaign_expirations`, not a general-purpose SQL RPC. The two functions have no fixed `search_path`. A separate reviewed security migration should inspect and qualify their definitions, then pin safe `search_path` values without changing function behavior. No direct privilege exploit was established by these metadata checks.

### SQL inventory execution check

The complete eight-statement, SELECT-only SQL inventory was executed against the connected Supabase project on 2026-11-20 and returned without a SQL error; the final result was the function privilege metadata above. Major report sections were also checked individually (migration counts/SQLSTATEs, table availability, relationship mismatches, RLS grants, row counts). This is verification of **read-only diagnostics**, not production schema repair.


## 2026-11-21 forensic and recovery-gate update (read-only)

**Source revision:** GitHub `main` at `953c7c1e160f05caa6c84b428d65169920116ba7`, together with metadata queries through the connected Supabase project. This is a continuation of the **P0** incident, not approval to restore, deploy or bypass the API parity guard.

### Current deployment contract (corrects outdated historical narrative)

The present `apps/api/docker-entrypoint.sh` performs target-reference checks and read-only Prisma schema-parity verification; **no schema migrations run at API startup**. The separate `apps/api/scripts/migrate-safe.sh` requires explicit `TAD_APPROVE_MANUAL_MIGRATION=YES` for reviewed migration operations and performs a parity postcheck. Historical migration execution and the current startup behavior must not be confused.

### Source/database checksum comparison

- All **23 of 23** recorded Prisma migration SQL SHA-256 checksums match the corresponding `apps/api/prisma/migrations/*/migration.sql` content on the compared `main` revision.
- Two January 2026 files require **CRLF** normalization to reproduce the stored SHA-256, consistent with historical Windows line endings. Their SQL payloads are not shown to differ.
- All 23 rows are marked finished; **11 retain historical SQL error logs**. Safe SQLSTATE-only extraction (without log bodies) found `42P01`, `42804`, `42883`, `25001`, `42601`. Do not infer that a failed migration successfully applied its intended SQL or infer a specific operator command solely from these flags.
- **Do not edit old SQL checksums, delete migration history or use `migrate resolve --applied`** as a substitute for restoring missing schema.

### Project identity and backup capability — mandatory gates

- The connected Supabase organization reports **plan `free`**. Supabase documents daily managed backups for **Pro, Team and Enterprise**, and recommends **manual off-site logical backups** for Free. Consequently a managed daily backup, PITR or a usable restore point **must not be assumed**. This does not prove that no operator-created backup exists. Official reference: https://supabase.com/docs/guides/platform/backups
- No Supabase development branches were returned by the connected project's `list_branches` call. Creating a new project or development branch may incur costs; do not provision one without explicit cost review and authorization.
- The older `verify-production.ps1` committed in **September 2026** identifies `tadprod` (`tockqchhrzkopvjncdaj`) as the expected migration destination. The **October 2026** `easypanel-env-template.md` instead references `ltdcdhqixvbpdcitthqf`. On inspection, the latter is `ACTIVE_HEALTHY` and `tadprod` is `INACTIVE`. Neither repository file alone proves which is the canonical production data store, and the EasyPanel runtime URL values were not read.
- **Do not execute the old `verify-production.ps1` as an authority to switch projects.** An authorized EasyPanel operator must confirm the active runtime project's reference *privately and without exposing URL credentials*, and record the authoritative deployment configuration and where the correct business data actually resides.
- Prior to any DDL, obtain an approved **logical export** of the confirmed target using a tool compatible with the currently installed Supabase CLI/PostgreSQL versions, store it securely off-site, and **prove restore into an isolated, non-production PostgreSQL instance** with network/side-effect safeguards. Record the restore test, object counts and rollback owner without recording secrets or personal data. A dashboard entry alone is not proof of recoverability.

### Catalog integrity and exposure qualifiers

- The connected project's `public` catalog contains 33 physical base tables, of which 9 have RLS enabled and 24 do not. Read-only privilege checks reported **zero** direct `SELECT` grants on these tables to either `anon` or `authenticated`, and neither role has `USAGE` on `public`. This does **not** prove external exposure, nor establish that all other roles or configurations are safe; preserve least-privilege grants and explicitly review RLS for any reconstructed public tables.
- `wallets`, `telemetry`, `financial_transactions`, `devices` and `driver_locations` do not show declared physical FKs in the inspected catalog. The six previously observed `UUID`/`TEXT` logical relation mismatches remain a separate integrity issue. No bulk casts or assumption of referential integrity are permitted.
- Estimated row counts from `pg_stat_user_tables` are **not exact**. Prior exact seven-table counts applied only to the connected project at that earlier query time; neither is proof that `tadprod` or any historical backup lacks customer data.

### Recovery exit criteria (currently NOT MET)

1. Canonical production identity confirmed independently of repo templates; security incident #244 contained and credentials rotated by the infrastructure owner.
2. Current-target backup created, stored securely, **restored and validated** on an isolated clone without external effects.
3. A new, reviewable **EXPAND → MIGRATE → CONTRACT** reconciliation plan preserves UUID/TEXT key mappings, wallet ledger and payment idempotency, player offline synchronization, RLS and GPS/PostGIS behavior.
4. On a staging restore, the live Prisma drift checker reports zero missing tables/columns, zero type and relationship mismatches, and zero GPS contract issues; all 646 existing API Jest tests plus focused regression tests, runtime startup and 10x telemetry testing pass.
5. Actual GitHub Actions jobs execute on a runner, private-branch release protections are enforced and the security/release owners approve the deployment. **Until then, do not merge a remediation or deploy**.

**Actions performed for this update:** Supabase queries against metadata/catalog only and GitHub documentation changes on a non-main branch. **No secrets read or shared, no business rows exported, no migration SQL executed, no database writes and no infrastructure changes.**

---

## 2026-11-23 — current fail-closed runtime log and independent catalog cross-check

**New operator-supplied EasyPanel log:** The API entrypoint announces a **read-only** Supabase target/schema check, reports that its runtime/migration project references match, and then exits with `Prisma schema parity check failed (1)`. A 90-second idle cooldown follows before exit status 1. Multiple partial blocks of the same diagnostic are visible in the uploaded log; the final complete report contains the counts below. `JWT_SECRET=SET` and other `SET` labels establish presence only; they do not establish validity or secret hygiene. The log is not evidence that migrations ran during startup.

**Source inspected:** `main@cb6f6c384241396a6515cd4677d9d749a8cf693a`. `apps/api/docker-entrypoint.sh` runs `check-supabase-target.cjs`, then `check-prisma-drift.cjs` with the direct connection URL, and fails closed. `check-prisma-drift.cjs` compares Prisma DMMF to `information_schema` and `pg_extension`. The GPS-specific verifier validates the PostGIS extension and `telemetry.coords`, which Prisma DMMF may omit when its type is unsupported. No schema DDL is executed by this path.

### Exact diagnostic and independent read-only verification

| Check | New runtime report | Supabase read-only verification |
| --- | ---: | --- |
| Prisma models expected/present | 52 / 29 | Source report only; model count not independently regenerated by the SQL metadata queries |
| Tables absent from `public` | 23 | **23/23 names confirmed absent** |
| Columns absent | 31 | **31/31 names confirmed absent** |
| Prisma TEXT ID vs. PostgreSQL UUID | 14 | **14/14 reported IDs have `uuid` storage** |
| Logical relation type mismatch | 6 | **6/6 reported pairs have incompatible `text`/`uuid` types** |
| Other scalar type mismatches | 0 | Not independently checked across all Prisma fields |
| `telemetry.coords` | Missing | Missing |
| PostGIS | Not installed | `pg_extension` reports not installed |
| Physical `public` base tables | Not part of model count | 33 |
| `_prisma_migrations` | Not part of this log | 23 rows / 23 finished / 11 with historical nonempty logs / 0 rolled back |

Catalog checks ran against the separately connected Supabase project `ltdcdhqixvbpdcitthqf`, using **only aggregate and system-metadata SELECTs**. No application/customer rows, raw migration logs or credentials were selected. The EasyPanel log's internal project-ref consistency alone does not prove its URLs resolve to this independently connected project; this still needs the private operator check described above.

**Interpretation:** The earlier snapshot described **34** missing columns, while the current report and independent cross-check show **31**. This difference is **not evidence of a successful schema repair**. It may reflect a different source/client schema revision or a physical DB change; compare the deployed image SHA, Prisma DMMF and historical catalog snapshots before attributing a cause. The 23 missing model tables, UUID/TEXT identity problems, and GPS contract blockers remain unchanged in kind.

Six logical mapping mismatches **do not** establish six violated physical foreign keys. Likewise, 11 nonempty historical migration logs do not establish the outcome of each individual SQL statement. `migrate deploy` must not be repeated as a purported fix when all 23 migration records are already marked complete.

### Hard stop and staged recovery

- **No direct production repair:** no `prisma db push`, `migrate reset`, `migrate resolve --applied`, destructive casts, seeds, `CREATE EXTENSION`, ad-hoc missing-table creation, or bypass of the entrypoint schema gate.
- **First unblock recovery:** privately verify EasyPanel's actual deployed image SHA and runtime project identity; contain exposed secrets under #244/#489; obtain an encrypted off-site backup including recoverable Auth identities, managed Storage metadata **and bytes**, and demonstrate a side-effect-isolated restore as required by the [canonical P0 #217 runbook](2026-11-21-p0-217-canonical-backup-restore-runbook.md).
- **Only in restored staging:** reconcile Prisma model-to-physical UUID/TEXT mappings without indiscriminate PK rewrites; design additive ordered migrations, guarded RLS/grants, PostGIS and GPS schema dependencies, wallet/ledger idempotency and offline tablet retry/reconciliation. Test 10x ingestion, complete API checks and zero drift on the exact tested SHA.
- **Release gate:** require real CI, reviewed migration/rollback plan, branch controls #313 and security/backup signoff before any production deploy.

**Outcome:** **DIAGNOSIS VERIFIED / API RECOVERY NOT VERIFIED / RESTORE_NOT_VERIFIED**. No database write, migration, deployment, credential rotation or finance operation was performed to produce this update. Public incident tracking: [#217](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217).
