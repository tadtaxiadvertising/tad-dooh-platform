# TAD P0 #217 — canonical Supabase backup and isolated restore checkpoint

**Updated:** 2026-11-21 (UTC). **Status:** diagnostic verified; **no backup or restore verified**; no database repair authorized.
**Owner-declared operational destination:** Supabase project ref **ltdcdhqixvbpdcitthqf** (us-west-2, PostgreSQL 17, Free plan). The EasyPanel operator explicitly confirmed that the API uses this project on 2026-11-21. This is an **operator statement**, not a machine inspection of private EasyPanel runtime variables. A three-URL preflight is still required before DDL.

This document supplements issue https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217. It does not replace the historical incident evidence or assert that production is recovered.

**Updated forensic evidence (2026-11-24 UTC):** [Prisma model ↔ migration coverage matrix](2026-11-24-p0-217-migration-coverage-matrix.md) separates the 23 missing tables into **10 without direct creation in currently versioned migrations** and **13 with creation SQL in migrations recorded as finished**. These are different recovery cases; neither is permission to rerun historical SQL or to change production.

## Known current constraints (read-only)

- Supabase MCP returned ACTIVE_HEALTHY for ltdcdhqixvbpdcitthqf; organization plan Free; no development branches.
- Current catalog inspection: 33 base tables in public; 23 historically required Prisma-model tables remain missing; 23 Prisma migrations marked finished, 11 rows carry historic error logs; PostGIS absent; commission_ledger absent; system_settings present.
- Source expected 52 Prisma models with 23 missing tables, 34 missing columns and 14 UUID/TEXT identifier mismatches in the 2026-11-20 EasyPanel diagnostic. These numbers were **not** reconstructed by the new query.
- Supabase Free cannot be assumed to include platform daily backups/PITR. No off-site manual dump and no isolated restore has been evidenced.
- CI recovery (#434) does not fix the live database. Credential-exposure incident #244 and unprotected release path #313 remain separate P0 blockers.

**Hard stop:** do not run Prisma migrate deploy, migrate resolve, db push, reset, destructive/casting SQL, script-based seed, or an API deployment until this checkpoint is satisfied. Keep apps/api/docker-entrypoint.sh fail-closed.

## Step 0: containment and authorization (infrastructure owner)

1. Restrict access to the working host and operator account. Because #244 reports exposed database and privileged application credentials, use only privately authorized access and coordinate credential rotation/revocation. Never copy URLs, JWTs, passwords, dump contents or complete logs into GitHub, ChatGPT, CI artifacts or tickets. Do not place a DB credential into a command-line URL or a shell-history entry.
2. Privately record EasyPanel's actual runtime API image SHA and the **parsed project refs only** from SUPABASE_URL, DATABASE_URL and DIRECT_URL. Compare against the confirmed ref using scripts/verify-supabase-runtime-target.cjs. A string/ref match alone is not proof of data ownership; the owner has supplied the independent confirmation.
   **Proposed runtime enforcement (PR #530; not deployed):** the API entrypoint also requires `TAD_EXPECTED_SUPABASE_PROJECT_REF` independently provisioned by the infrastructure owner and validates all three project references before opening PostgreSQL. It fails closed when the reference is absent or mismatched, including legacy pooler usernames that do not encode a project ref. For the canonical API the independently confirmed value is `ltdcdhqixvbpdcitthqf` (non-secret). Do **not** add credentials to this runbook, log raw URLs, change EasyPanel blindly, or promote the image until this variable and scoped DB usernames have been checked in a restored staging environment. When migrating intentionally to a different project, obtain a new independent target approval before changing the protected setting.
3. Select a private, access-controlled, **encrypted volume outside the Git working tree**. Have an independently authorized off-site destination and encryption key management ready *before* creating plaintext SQL exports. Never use GitHub Actions or a publicly accessible bucket as the dump destination.
4. Check CLI versions, available capacity, and a recovery owner. Do not change Supabase billing or create a project/branch without separate authorization.

Official references:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/introduction
- https://supabase.com/docs/guides/database/connecting-to-postgres

## P0 stop gate: MANAGED_SCHEMA_COVERAGE_UNVERIFIED

**Important correction verified against the current [Supabase CLI v3 `db dump` reference](https://supabase.com/docs/reference/cli/supabase-db-dump):** the CLI's containerized `pg_dump` excludes **Supabase-managed schemas** such as `auth`, `storage`, and extension-managed schemas. Therefore, the `roles.sql`, `schema.sql`, and `data.sql` commands below create **only a partial logical export**, not an independently recoverable TAD backup. Adding `--data-only` does **not** establish coverage of managed schemas. The SHA-256 verifier merely checks these three files and must continue to return `EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED`.

**Live evidence, read-only as of 2026-11-21:** `auth.users` contains 13 rows; `storage.buckets` contains 2 buckets; `storage.objects` contains 11 metadata records. These are aggregate counts, not exported records, and may change. TAD must **not** claim complete recoverability or approve schema writes based on this three-file export.

Before approving the **full backup/restore gate**, the infrastructure owner and an independent reviewer must document, on a **private encrypted evidence ledger**, successful recovery of:

1. **Managed Auth state:** an independently approved, version-compatible method to preserve and restore the necessary `auth` identities and related managed metadata (including user IDs and identity-provider relationships), plus any custom Auth schema changes/policies; use a Supabase-supported workflow or reviewed PostgreSQL procedure appropriate for the target. Merely exporting application-side `public.users` (which is currently absent) is not Auth recovery.
2. **Managed Storage state:** bucket configuration, RLS/policies and `storage.objects` metadata **plus the actual object bytes** from every bucket; object metadata alone does not contain uploaded media. Preserve checksums and use secure, restricted APIs or provider-backed export with privately held credentials.
3. **Service configuration:** required Auth providers, signing-key and secrets-rotation state (incident #244), SMTP, external integrations, Edge Functions, Realtime publications and extension versions. The SQL dump cannot recreate the complete Supabase project configuration.
4. **Isolated restore proof:** replay from the **off-site encrypted copy** to a separate authorized, side-effect-disabled target, not production. Compare source and clone point-in-time aggregate counts with [the read-only restore baseline SQL](sql/2026-11-21-restore-readonly-proof.sql), verify actual Storage object-byte hashes, confirm user identities and run safe login/device reconciliation without emailing users or issuing payouts. Document failure/success status, target identity, checksums, RPO/RTO and reviewer approval **without** disclosing records or credentials.

Until all four are verified, report **`MANAGED_SCHEMA_COVERAGE_UNVERIFIED`** and **`RESTORE_NOT_VERIFIED`**; maintain incident #217 as P0 and the migration/deployment freeze. Do **not** improvise a live `pg_dump`/admin export targeting privileged managed tables or enable broad `anon`/`authenticated` grants just to complete this checklist; design and rehearse that separate export with the owner first. The official [Supabase backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) also calls out special handling for custom `auth`/`storage` changes.

## Optional automated aggregate comparison (still NOT restore proof)

After the infrastructure owner has created an independently authorized, consistent
source backup and a side-effect-disabled isolated clone, run the existing
[read-only source/clone SQL baseline](sql/2026-11-21-restore-readonly-proof.sql)
once against each database. Privately save **only the one-row aggregate JSON
objects** (keys corresponding exactly to the SQL output aliases) into two
separate regular files outside Git; no SQL records, access tokens, object names,
credentials, connection URLs or email addresses are required.

Run the offline comparison from a trusted checkout. Use local paths to these
private aggregate-only JSON files (do not paste the paths or contents into CI):

```sh
node scripts/compare-supabase-restore-snapshots.cjs /secure/source-aggregate.json /secure/clone-aggregate.json
```

The only acceptable diagnostic verdict is
`AGGREGATES_MATCH_RESTORE_UNVERIFIED`. Different counts, flags, bad
types, unexpected fields, symlinks or the exact same file fail closed. Even a
passing comparison **does not prove** the files came from different databases,
the snapshot was point-in-time consistent, Storage object bytes were preserved,
Auth identities can sign in, the off-site copy is encrypted or the application
can run. The **G0 hard stop remains active** until an independent operator
provides off-site backup evidence, verified managed Auth/Storage coverage,
byte-level comparisons, and a real isolated application restore test. Do not
treat this result as approval for production DDL, migration or deployment.

## Optional single-command G0 component preflight (non-release, offline)

The repository's individual source-export, Storage-byte and source/clone
aggregate verifiers can be run through a single **offline** command. This is
useful after an owner has independently produced the restricted private files
described below. It does **not** download them, validate that two snapshots
actually came from separate databases, establish recovery ownership, prove
managed Auth restoration or certify an encrypted off-site backup.

The infrastructure owner sets **only non-secret paths, an independent project
ref and an independently captured object count** in a private PowerShell
session. None of these files or values should be added to Git, GitHub issues
or CI artifacts. Use paths outside every Git checkout.

~~~powershell
$env:TAD_EXPECTED_SUPABASE_PROJECT_REF = "ltdcdhqixvbpdcitthqf"
$env:TAD_EXPECTED_STORAGE_OBJECT_COUNT = "<source count checked at export time>"
$env:TAD_RECOVERY_SQL_EXPORT_DIR = "<private encrypted path to SQL manifest and dumps>"
$env:TAD_RECOVERY_STORAGE_EXPORT_DIR = "<private encrypted path to Storage byte manifest and files>"
$env:TAD_RECOVERY_SOURCE_AGGREGATES_FILE = "<private source aggregate JSON>"
$env:TAD_RECOVERY_CLONE_AGGREGATES_FILE = "<private isolated clone aggregate JSON>"
try {
    node scripts/api-recovery-evidence-preflight.cjs
    if ($LASTEXITCODE -ne 2) { throw "RECOVERY_EVIDENCE_REFUSED: inspect private logs" }
    Write-Host "LOCAL_COMPONENT_CHECKS_MATCH; RESTORE_AND_PRODUCTION_RELEASE_UNVERIFIED"
} finally {
    @(
      "TAD_EXPECTED_SUPABASE_PROJECT_REF", "TAD_EXPECTED_STORAGE_OBJECT_COUNT",
      "TAD_RECOVERY_SQL_EXPORT_DIR", "TAD_RECOVERY_STORAGE_EXPORT_DIR",
      "TAD_RECOVERY_SOURCE_AGGREGATES_FILE",
      "TAD_RECOVERY_CLONE_AGGREGATES_FILE"
    ) | ForEach-Object { Remove-Item "Env:\$_" -ErrorAction SilentlyContinue }
}
~~~

The tool rejects missing/noncanonical inputs and individual checker errors
without printing sensitive paths, SQL, object names or connection URLs. It
deliberately exits **2 even when every local component matches**; exit 0 is
never issued, to prevent accidental use as a CI/deployment authorization.
The verdict is `RECOVERY_COMPONENTS_MATCH_RESTORE_UNVERIFIED`.
Actual source consistency, independent off-site archive readback, complete
managed Auth/Storage state and object bytes, isolated restoration, application
smoke tests, human review and migration/rollout approval remain mandatory
**G0 hard stops**. This tool must never replace them.

## Step 1: owner-operated logical export on Windows (no production writes)

Supabase's current CLI documentation describes three complementary logical exports: roles, schema and data. The CLI version matters (v3 uses --remote=<ref|branch|url> and targets local by default). Review the **installed** supabase db dump --help before these commands. Docker Desktop is required by the CLI workflow. Run in a private PowerShell session with an authenticated Supabase CLI session, not with a password embedded into command arguments.

**Consistency warning (release blocker):** the three CLI export invocations (roles, schema, data) are separate operations. A valid SHA-256 manifest does not prove that they represent **the same point in time** if clients are still writing. Arrange an authorized write-quiescence window or a provider-supported transactionally consistent snapshot method before trusting the complete backup; coordinate tablet offline/reconnect behavior and financial webhook retries rather than silently dropping events. Never stop services or suspend payments without an approved change window. Record the source snapshot timestamp and recheck counts using [the aggregate-only restore baseline query](sql/2026-11-21-restore-readonly-proof.sql) when the backup is restored. Differences need investigation, and matching aggregates alone do not establish a restorable backup.

The following example **refuses** to start unless an existing encrypted backup volume has been explicitly selected with TAD_ENCRYPTED_BACKUP_DIR. That environmental variable holds a local **directory path only**, never a secret. The operator must validate encryption/ACLs, enough free space and off-repo location; a directory variable cannot prove BitLocker or other encryption is actually enabled.

~~~powershell
$ErrorActionPreference = "Stop"
$projectRef = "ltdcdhqixvbpdcitthqf"
$root = $env:TAD_ENCRYPTED_BACKUP_DIR
if ([string]::IsNullOrWhiteSpace($root) -or -not (Test-Path -LiteralPath $root -PathType Container)) {
    throw "Configure an existing encrypted, restricted, off-repo TAD_ENCRYPTED_BACKUP_DIR first."
}
$root = (Resolve-Path -LiteralPath $root).Path
$cursor = Get-Item -LiteralPath $root
while ($null -ne $cursor) {
    if (Test-Path -LiteralPath (Join-Path $cursor.FullName ".git")) {
        throw "REFUSED: backup directory is inside a Git repository."
    }
    $cursor = $cursor.Parent
}
$cliVersion = (& supabase --version | Select-Object -First 1).Trim()
if ($LASTEXITCODE -ne 0 -or $cliVersion -notmatch '^3\.') {
    throw "REFUSED: this runbook requires verified Supabase CLI v3."
}
& supabase db dump --help
if ($LASTEXITCODE -ne 0) { throw "Cannot verify installed dump flags." }

$timestamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$destination = Join-Path $root ("tad-p0-217-" + $timestamp)
New-Item -ItemType Directory -Path $destination -ErrorAction Stop | Out-Null
$roles = Join-Path $destination "roles.sql"
$schema = Join-Path $destination "schema.sql"
$data = Join-Path $destination "data.sql"

& supabase db dump "--remote=$projectRef" -f $roles --role-only
if ($LASTEXITCODE -ne 0) { throw "Role export failed. Preserve private diagnostics; stop." }
& supabase db dump "--remote=$projectRef" -f $schema
if ($LASTEXITCODE -ne 0) { throw "Schema export failed. Stop." }
& supabase db dump "--remote=$projectRef" -f $data --data-only --use-copy -x storage.buckets_vectors -x storage.vector_indexes
if ($LASTEXITCODE -ne 0) { throw "Data export failed. Stop." }

$manifestFiles = foreach ($path in @($roles, $schema, $data)) {
    $item = Get-Item -LiteralPath $path
    if ($item.Length -eq 0) { throw "REFUSED: empty dump component." }
    [PSCustomObject]@{
        file = $item.Name
        bytes = $item.Length
        sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    }
}
$manifest = [PSCustomObject]@{
    project_ref = $projectRef
    exported_at_utc = $timestamp
    restore_verified = $false
    files = $manifestFiles
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $destination "manifest.json") -Encoding UTF8
Write-Host "EXPORT_COMPONENTS_WRITTEN_TO_PRIVATE_ENCRYPTED_VOLUME; RESTORE_NOT_YET_VERIFIED"
~~~

### Offline export-integrity gate (not restore proof)

After copying the manifest and the three SQL files onto the encrypted operator volume, run this verifier **from the checkout's repository root**. It only reads local hashes, rejects unexpected fields/paths, blocks a backup directory inside Git, and prints a verdict without printing any file content or private path. It does not prove disk encryption, off-site retention, Auth/Storage completeness or recoverability. The three files and manifest **must never** be committed.

~~~powershell
$env:TAD_EXPECTED_SUPABASE_PROJECT_REF = "ltdcdhqixvbpdcitthqf"
try {
    & node .\scripts\verify-supabase-backup-export.cjs $destination
    if ($LASTEXITCODE -ne 0) { throw "Export-integrity check refused or failed." }
} finally {
    Remove-Item Env:\TAD_EXPECTED_SUPABASE_PROJECT_REF -ErrorAction SilentlyContinue
}
~~~

Expected success code: `EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED`. A successful integrity check is **not** a verified restore, so do not flip `restore_verified` to true or unlock a production migration gate.

CLI version rationale: [Supabase CLI v3 changed remote targeting](https://supabase.com/changelog/supabase-cli-v3) and documents `--remote=<ref|branch|url>` for `db dump`. Explicit project targeting is mandatory; no unqualified `supabase db dump` command is permitted.


**Important limits:** these three SQL artifacts deliberately remain a **partial export** until the managed-schema stop gate above is independently satisfied. A nonempty dump or matching checksum is **not proof of completeness or recoverability**. The default Supabase CLI schema export filters Supabase-managed schemas; data and role exports have different coverage. Check the actual scope of auth users/identities, Storage metadata, custom Auth/Storage policies and project configuration during the restore trial. Do not publish counts that could identify individuals. Separately export actual **Storage bucket object bytes** to the approved encrypted off-site destination; database backup alone contains only their metadata. Configuration for third-party Auth providers, secrets, SMTP, hooks and Edge Functions also needs a separate confidential inventory.

After the exports, use an organization-approved encryption tool/key to create an encrypted off-site copy, check its read-back/hash and retention, then restrict or remove intermediary plaintext from the encrypted staging area according to the data-handling policy. Do not send the backup itself to this conversation or the repository. The manifest remains **private**.

## Optional supervised read-only Storage byte export (not a completed backup)

After credential-incident #244 is contained and the **service-role credential
has been rotated**, an authorized infrastructure owner can use
`scripts/export-supabase-storage-bytes.cjs` to transfer
*original* Storage object bytes from the independently pinned Supabase project
to an **existing encrypted, access-restricted, off-repository volume**. The
exporter uses HTTPS `GET` only and never writes to Supabase or logs
credentials, source object names or private paths. It creates new opaque file
names, streams hashes and uses the existing offline byte verifier as a
postcondition. The tool cannot attest encryption, rotated credentials,
source snapshot consistency, or isolated restore; these need separate proofs.

**Private inventory prerequisite:** during an owner-approved consistent
snapshot/write-quiescence window, privately obtain a JSON object with exactly
`project_ref`, `captured_at_utc` (`YYYYMMDDTHHMMSSZ`) and `objects`.
Each item in `objects` has exactly `bucket_id`, `object_name` and `bytes`
(nonnegative numeric byte size). The source is `storage.objects` and
`metadata->>'size'` after checking that every entry has a
valid size; capture an independent `COUNT(*)` and compare to the JSON
length. Never publish the inventory; object names can disclose customers.
Storage object versions and uncommitted transfers need separate investigation.

With the inventory securely saved as a local JSON file, set the nonsecret
values shown below **only on the trusted host**. Source the rotated
`SUPABASE_SERVICE_ROLE_KEY` directly from an approved secret store
into the process environment; **do not put the key in a script, CLI argument,
Docker Buildx args, chat, issue, CI log or template**. This helper is not for
running inside a Git/Dockerfile EasyPanel build. The three `YES`
flags are operator assertions, **not cryptographic proof** of approval,
rotation or encryption.

~~~powershell
$env:TAD_EXPECTED_SUPABASE_PROJECT_REF = "ltdcdhqixvbpdcitthqf"
$env:SUPABASE_URL = "https://ltdcdhqixvbpdcitthqf.supabase.co"
$env:TAD_EXPECTED_STORAGE_OBJECT_COUNT = "<count from private source snapshot>"
$env:TAD_PRIVATE_STORAGE_INVENTORY_FILE = "<absolute private inventory JSON path>"
$env:TAD_PRIVATE_STORAGE_EXPORT_DIR = "<absolute new directory on encrypted volume>"
$env:TAD_APPROVE_STORAGE_READONLY_EXPORT = "YES"
$env:TAD_ROTATED_SUPABASE_KEY_CONFIRMED = "YES"
$env:TAD_ENCRYPTED_BACKUP_VOLUME_CONFIRMED = "YES"
# SUPABASE_SERVICE_ROLE_KEY must already be supplied by approved secret manager.
node scripts/export-supabase-storage-bytes.cjs
if ($LASTEXITCODE -ne 2) { throw "STORAGE_EXPORT_REFUSED; keep partial files private" }
~~~

The destination must **not exist** beforehand. It must be below a real (not
symlinked) directory outside every Git checkout. On failure, partial bytes
remain in the restricted destination for operator investigation; the tool
never retries blindly or overwrites prior backups. It refuses unexpected
HTTP status, changed size, malformed inventory, unapproved project, and
failed post-hash verification. Successful output is deliberately exit
code **2**, with verdict
`STORAGE_EXPORT_HASHED_SOURCE_COVERAGE_AND_RESTORE_UNVERIFIED`.
This means only that listed objects were downloaded and hashed locally.
The existing `verify-supabase-storage-byte-export.cjs`
must also be used when validating the **encrypted off-site** copy.

**G0 remains a hard stop:** all managed Auth records and config, full Storage
metadata/bytes, snapshot consistency, independent off-site readback, isolated
restore (including object byte hashes), application smoke, reviewer sign-off
and credentials/release controls #244/#489/#313 must still be verified before
production migrations or API promotion.

## Separate offline Storage object-byte checkpoint (NOT full backup or restore proof)

**Why:** Supabase stores Storage object metadata separately from actual files. Its [database backup guidance](https://supabase.com/docs/guides/platform/backups) says backups do not include Storage files. Its [download guide](https://supabase.com/docs/guides/storage/management/download-objects) documents authorized file downloads. The current three-SQL verifier cannot recover media bytes.

**Read-only inventory observed 2026-11-21:** 11 Storage metadata rows, 11 distinct bucket/name pairs, in 2 buckets. These counts do NOT mean files have been downloaded. The operator must refresh them privately at export time, coordinating a consistent snapshot or approved write-quiescence window.

1. An authorized owner separately enumerates source Storage object identities and uses an approved restricted Storage download/S3-compatible transfer to obtain the original bytes, including required versions. Compare the inventory in private. Never upload keys, object names, customer data or dumps to GitHub, CI or chat. Avoid transformed previews.
2. Put files on an existing encrypted, ACL-controlled, off-repository volume under a separate storage-bytes directory. Name binaries with opaque hex paths such as objects/0000000000000001.blob, not bucket/object names. Use normal files, no symlinks or hardlinks.
3. Privately create storage-manifest.json with exactly: project_ref, exported_at_utc (YYYYMMDDTHHMMSSZ), restore_verified (false), source_object_count (integer from an independently captured inventory) and files. Each file entry has exactly bucket_id, object_name, file, bytes (zero allowed) and sha256 (64 hex digits). This mapping is sensitive; never commit or share it.
4. Verify offline with the independently confirmed source count. The commands never contact Supabase:

~~~powershell
$env:TAD_EXPECTED_SUPABASE_PROJECT_REF = "ltdcdhqixvbpdcitthqf"
$env:TAD_EXPECTED_STORAGE_OBJECT_COUNT = "<private source inventory count>"
try {
  node scripts/verify-supabase-storage-byte-export.cjs "<encrypted off-repo directory>/storage-bytes"
  if ($LASTEXITCODE -ne 0) { throw "Private Storage file integrity verification refused." }
} finally {
  Remove-Item Env:\TAD_EXPECTED_SUPABASE_PROJECT_REF -ErrorAction SilentlyContinue
  Remove-Item Env:\TAD_EXPECTED_STORAGE_OBJECT_COUNT -ErrorAction SilentlyContinue
}
~~~

Expected result: **STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED**. This checks only that each **local** file matches its declared byte length and SHA-256 hash and the listed file count matches the **separately supplied count**. It does NOT prove complete source inventory coverage, correct remote-object identity, disk encryption, off-site retention, consistent capture time, Auth/Storage metadata completeness, or the isolated restore. A manifest can be inaccurate despite its hashes matching. The verifier never reads actual Supabase objects or performs network/DB requests.

**P0 stop remains:** repeat the verification against the encrypted off-site copy after restoring it to an isolated target, validate object identity and bucket policy using the independent source inventory, verify Auth and application data, and obtain authorized recovery-owner approval. Continue reporting MANAGED_SCHEMA_COVERAGE_UNVERIFIED and RESTORE_NOT_VERIFIED. No production migrations/deployments authorized.

## Step 2: isolated restore rehearsal (mandatory, not yet done)

1. Provision only an **explicitly approved** disposable local Supabase-compatible environment or separate isolated project. A managed staging project may incur billing; get approval first. Match PostgreSQL major and relevant extension/managed-schema versions. **Never use either production ref or the inactive tadprod project as an implicit restore target.**
2. Isolate networking and side effects. Disable external SMTP, webhooks, payouts, billing processors, database webhooks, background jobs, device sync, analytics ingestion and credentials that could reach external production systems. Treat restored Auth data as sensitive; do not email users or make real payments.
3. Verify that the target is **not** ltdcdhqixvbpdcitthqf, and independently review its connection configuration before any restore commands. Import roles, schema and data following the version-matched official Supabase restoration guide, preserving an operator log of exit statuses **without** SQL records or credentials. Record and correct any expected managed-schema/extension differences in the **isolated clone only**.
4. Validate checksum of the downloaded encrypted archive; decrypt only onto an encrypted controlled volume and compare the three file SHA-256 hashes with the private manifest. Test actual Auth/Storage metadata and object-byte restoration, not just public tables. If any step fails, mark **restore_failed**, do not claim ready.
5. On the **clone only**, compare tables, columns/types, PK/FK/indexes, RLS and grants, functions/triggers, migration-history metadata, and aggregate row counts against the recorded source snapshot. Preserve the existing drift (23 missing tables, UUID/TEXT conflicts) as baseline evidence; a successful clone does **not** imply Prisma parity. Run apps/api/scripts/check-prisma-drift.cjs with an inspection-only role against the clone; an expected nonzero drift result is not a backup failure.
6. Perform a second rehearsal restoring from the off-site encrypted copy, not only from the local plaintext export, to prove end-to-end recovery. Record start/end UTC, RPO and measured RTO, reviewer, object-count comparisons and any restore errors, never customer records or credentials.

### Read-only missing-object inventory (2026-11-21; NOT a migration plan)

Fresh catalog check on the owner-confirmed project found exactly these **23** absent Prisma-model tables (compare to the full current Prisma DMMF when preparing actual repair):

```text
active_ads, advertiser_subscriptions, analytics_events, bi_dashboard_snapshots,
campaign_metrics, commission_ledger, commissions, contract_acceptances,
conversation_messages, conversations, conversion_events, fleets, leads,
payment_evidence, payment_intents, payment_verifications, playlists,
portal_requests, qr_scans, reconciliation_reports, referral_attributions,
settlement_batches, users
```

The current `schema.prisma` defines relationships requiring careful dependency ordering: `conversation_messages` references `conversations`; `payment_evidence` and `payment_verifications` reference `payment_intents`; `payment_intents` and `referral_attributions` reference `leads`; `commissions` references `drivers` and optional `settlement_batches`; `playlists` references `campaigns`. These are **Prisma source-level relations**, not proof of existing PostgreSQL foreign keys. The currently present referenced tables may have incompatible UUID/TEXT identifiers. Before creating ANY FK, reconcile actual physical column types, preserved data and target model types on a restored clone. Do not replay the historical migrations as-is or infer financial safety from a new empty ledger table.

## Step 3: schema repair **after** restore evidence

- Freeze the source schema/data point-in-time and capture a fresh read-only Prisma/catalog diff with the exact main SHA. Never rewrite old migration SQL files or force history resolution.
- Design reviewable **EXPAND → MIGRATE → CONTRACT** migrations. Add required structures in dependency order and adopt the canonical UUID/TEXT model contract without mass casting primary keys. Preserve existing financial data, enforce ledger/commission/idempotency constraints and safe FK ownership; include PostGIS/GPS contract review.
- Apply only on a faithful **isolated restore clone** first, with reviewed RLS and minimal privileges. Verify no grants accidentally expose public tables and that offline device sync/reconciliation works after reconnect and replay.
- Require strict Prisma drift-zero check, build/typecheck, offline and financial regression tests, load checks at 10x, GitHub runner-backed CI, backup proof and credential #244 containment before any approved production window. Write an explicit rollback decision tree with downtime/RPO, not merely "run migrate deploy".

## Evidence ledger (fill privately, post only sanitized verdicts)

| Gate | Current evidence | Result |
| --- | --- | --- |
| Owner-stated canonical project | 2026-11-21 EasyPanel operator confirmed ltdcdhqixvbpdcitthqf | Confirmed by operator; private runtime cross-check pending |
| Project Free/ACTIVE/PG17 | Supabase metadata checked 2026-11-21 | Verified |
| Production schema parity | 23 expected model tables absent on connected project | FAIL — correct blocking behavior |
| Manual logical export | No dump produced through the available Supabase integration | PENDING |
| Managed Auth/Storage schema + identity metadata coverage | CLI default dump excludes managed schemas; source contains live managed records | **BLOCKER — MANAGED_SCHEMA_COVERAGE_UNVERIFIED** |
| Off-site encrypted retention | No artifact/hash attested | PENDING |
| Independent Storage object backup | Not attested | PENDING |
| Isolated full restore + data integrity | No restore attempt attested | PENDING |
| Credential incident #244 | Open | BLOCKER |
| Approved new forward-only remediation | None | BLOCKER |

**Close #217 only after** canonical runtime target verification, owner-attested encrypted off-site backup and successfully rehearsed isolated restore, verified safe schema parity, financial/offline regressions, exact-main CI and approved release controls. This document alone must **never** satisfy a recovery gate.
