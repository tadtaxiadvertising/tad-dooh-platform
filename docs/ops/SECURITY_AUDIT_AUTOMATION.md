# Weekly Supabase Security Audit — operator runbook

**Workflow:** `.github/workflows/security-audit-weekly.yml`  
**Schedule:** Monday at 06:00 UTC, plus explicit `workflow_dispatch`.  
**Production database:** use the project reference already established in the protected deployment configuration; verify identity privately before any access. This runbook authorizes **read-only diagnosis**, not DDL, migrations, payments, credential rotation, or production releases.

## Current status and evidence (2026-11-23)

- [GitHub Actions run #45222770481](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/45222770481) failed **before running security checks**. Its `Run Security Audit` job preflight recorded an invalid project reference (placeholder) and an empty management access token. The step exited 1. This is a **configuration failure**, not a security assessment with zero findings.
- [Issue #516](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/516) tracks restoration and verification of the scheduled workflow.
- A separate **read-only** Supabase Security Advisor query on 2026-11-23 reported two `function_search_path_mutable` WARN findings, one `auth_leaked_password_protection` WARN finding and nine `rls_enabled_no_policy` INFO findings; no ERROR findings were returned by that advisor query. These findings **do not prove full platform security**. The function and Auth warnings are tracked in [#507](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/507); RLS/grants in [#318](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/318).
- Production backup/restore remains blocked under [#217](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217). Production credentials/history incidents remain open at [#244](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/244) and [#489](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/489).

## Required GitHub Actions configuration

The job reads these names **only in its audit step**, via GitHub Actions secrets (never via tracked files, public issues, Docker build arguments, or command-line URLs):

| Secret | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_PROJECT_REF` | Yes | Exact intended Supabase project reference (format validated by workflow) |
| `SUPABASE_ACCESS_TOKEN` | Yes | Authorized Supabase Management API token with sufficient *read* access |
| `DB_PASSWORD` | Yes | Database password for authorized read-only monitoring; currently the workflow connects as `postgres`, so treat this as privileged and plan least-privilege replacement |
| `SLACK_WEBHOOK_URL` | No | Failure/success notifications; handle as a credential |

**Administrator-only recovery:**
1. In the repository's GitHub **Settings → Secrets and variables → Actions**, verify that the names above exist in the correct scope and are available to the scheduled workflow. GitHub does not display stored secret values. The placeholder `REPLACE_WITH_SECRET` is never an acceptable reference.
2. Privately confirm the expected Supabase project and token read permissions. Use new/rotated credentials as coordinated in #244/#489; do not reuse or expose compromised credentials. Avoid sending passwords/tokens in PRs, logs, chats, support tickets or issues.
3. Verify the connectivity and authorization path without logging token contents. The workflow is configured to fail closed on missing configuration. Do not add `continue-on-error`, blanket exclusions or skip audits.
4. Trigger **Actions → Weekly Supabase Security Audit → Run workflow** using authorized repository access, then review the *actual* steps and exit code. If advisories are returned, triage them independently of configuration recovery.
5. Capture the workflow run URL, commit SHA, step outcomes, aggregate advisory counts, sanitized failure reason, and any post-remediation advisor comparison in issue #516. Close only with evidence that audit steps executed, not merely that job setup succeeded.

## What the workflow monitors

It queries security lints; database size/connection counts; Storage usage and buckets; Auth configuration; Edge Functions; Realtime; PostgreSQL table grants to `anon`/`authenticated`; functions lacking configured `search_path`; PostGIS `st_estimatedextent` privileges; idle transactions; and long-running queries.

The workflow's current thresholds are 400 MB warning and 450 MB critical on its assumed 500 MB free-plan database limit. **Check current project limits independently** before acting on threshold alerts. Success is conditional on all required queries, controls and checks completing; an early error cannot certify any results.

The current workflow contains narrowly scoped legacy exceptions. Never broaden them based solely on a lint name: assess **object identity, ownership, privileges and reachability** first. See the workflow source for the current exact exception logic.

## Safe diagnosis without credential exposure

Prefer the connected Supabase **Security Advisor** for a read-only assessment, preserving advisory title, severity, affected object and [official remediation guidance](https://supabase.com/docs/guides/database/database-linter). Validate the database/project identity separately. Do **not** print raw SQL results containing customer data.

For an operator-run local check, use an approved ephemeral environment and pass secrets through a protected secret store/environment or libpq's secured password file. Do not interpolate database passwords into PostgreSQL URLs (shell history, process arguments and error output may expose them). Do not embed Supabase bearer tokens in command-line arguments or public action logs. When testing locally, make sure monitoring SQL is read-only and the database role is appropriately restricted.

## Status checklist (not yet completed)

- [ ] Authorized secrets are supplied to GitHub Actions without exposing their values.
- [ ] Scheduled workflow accesses the correct approved project and runs real security checks.
- [ ] GitHub job and each required step have successful execution evidence, or findings are explicitly triaged.
- [ ] Known advisories have documented disposition; no security check was weakened to make CI green.
- [ ] Incident #516 contains sanitized run evidence and a reviewer verifies closure.
- [ ] Production release gates #217, #244, #489 and #313 are handled independently.

**State:** configuration root cause identified; scheduled job remediation and verification **pending**.
