# Supabase function search_path hardening — review-only change (#507)

**State:** Prepared, NOT applied. This document is not a production migration authorization.

## Evidence (2026-11-23, metadata-only)

Production API Supabase project: `ltdcdhqixvbpdcitthqf`. The live security advisor reported `function_search_path_mutable` for two functions:

| Function | Current security mode | Anonymous / authenticated EXECUTE | Dependency |
| --- | --- | --- | --- |
| `public.refresh_active_campaigns()` | SECURITY INVOKER | denied / denied | `public.mv_active_campaigns` materialized view |
| `public.update_campaign_expirations_updated_at()` | SECURITY INVOKER | permitted / permitted | Trigger on campaign expirations |

The refresh function's source refers to `mv_active_campaigns` without schema qualification in both normal and fallback paths. Simply setting an empty search path would break the refresh. The trigger updates `NEW.updated_at` using `NOW()`; no body rewrite is required.

The materialized view exists and is populated. The roles `anon` and `authenticated` currently lack CREATE privilege on schema `public`. These findings are **defense-in-depth warnings**, not proof of active exploitation.

## Proposed patch

Review `docs/security/manual-sql/supabase-functions-searchpath-reviewonly.sql` (not included in `prisma/migrations`, container entrypoint, or automatic release paths).

It is a single transaction with a bounded lock wait and preflight that aborts when the functions, privilege posture, source body, or materialized view differ from inspected state. It preserves `SECURITY INVOKER`, existing grants and owner. The refresh function gets fully qualified view references and both functions receive `search_path = pg_catalog, pg_temp`.

It deliberately does **not** refresh the materialized view. The original broad exception/fallback behavior is left unchanged; a separate operational review must consider whether it could hide refresh errors.

## Release gate (STOP until all are satisfied)

1. **P0 #217:** verify encrypted, offsite, restorable PostgreSQL + Auth metadata + Storage bytes backup, including test restore and RPO/RTO evidence.
2. **P0 #244 / #489:** contain or rotate previously exposed credentials without posting values to logs/issues.
3. **P0 #313:** protect `main` with required PR approvals and strict passing GitHub Actions Summary; verify release SHA against actual API/DB targets.
4. Recheck live `pg_get_functiondef`, owner, `proconfig`, execution grants, view schema and references. Any drift aborts the manual SQL plan.
5. Run the SQL only against a restored staging clone first, preserving function owner and grant snapshots. Exercise campaign-expiration trigger and both refresh success/fallback paths using synthetic records and a disposable view; do not refresh production to test syntax.
6. In staging, query `pg_proc.proconfig`, `pg_get_functiondef`, grants and adviser status again; verify both warnings disappear. Run API tests, offline sync, CI and 10× operational assessment.
7. After explicit DBA/change approval, schedule a controlled production migration during a maintenance window with a rollback/roll-forward plan, then verify the live advisor and request error rates.

## Rollback and caveats

A code revert does not roll back database DDL. Do not automatically restore an unsafe mutable search path on production. If the function fails in staging, revert the *staging clone* to its snapshot; diagnose precisely. If an approved production deployment fails, use the preapproved restoration or roll-forward plan with the DBA and preserve function grants/owner. There is no data migration, credential mutation, payout operation, or tablet API change in this PR.

The separate `auth_leaked_password_protection` warning requires an Auth administrator to assess provider policy and enable breached-password checks; it cannot be fixed by this SQL plan or a repository-only change.
