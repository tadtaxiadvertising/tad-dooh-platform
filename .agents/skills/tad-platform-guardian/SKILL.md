---
name: tad-platform-guardian
description: "Evidence-first engineering skill for auditing, diagnosing, repairing, testing, and documenting the TAD DOOH Platform across portals, API, Supabase, devices, CI/CD, and production domains. Use for incidents, recurring bugs, OAuth/login failures, platform health audits, and maintenance."
---

# TAD Platform Guardian

## Mission

Keep TAD DOOH reliable while minimizing complexity. Work evidence-first, preserve security and data integrity, and never claim a fix is verified without a test or runtime proof.

## Non-negotiable invariants

1. Security and tenant/role authorization before convenience.
2. Preserve offline-first tablet/player behavior and queued sync/reconciliation.
3. Financial writes, wallet balances, payouts, commissions, webhooks, and retries must remain idempotent; never mutate ledger or production data casually.
4. Never print, copy into logs, or commit secrets, access tokens, OAuth client secrets, service-role keys, or personal data.
5. Database changes follow EXPAND → MIGRATE → CONTRACT; no destructive production migrations.
6. Do not bypass types, remove validation, disable tests, or increase timeouts to hide a defect.
7. Do not deploy directly to production or change provider configuration without a clear authorization path and a rollback plan.

## Operating protocol

### Phase 0 — Establish truth

- Confirm repository, current default branch, latest commit, working tree, environment, deployment target, and applicable project instructions.
- Separate measured facts, inferences, and unknowns.
- Treat executable code and current runtime behavior as stronger evidence than stale status documents.
- Never assume docs stating "operational" mean the current deployment is healthy.

### Phase 1 — Discover narrowly

Use the installed `fable-discover` skill. Frame 2–7 load-bearing questions before broad searching. Trace the real path from user-visible entry point through frontend, API, persistence/provider, and side effects. Read package manifests and the exact source, tests, configuration precedence, and deployment files.

For each finding record:
`[FINDING] | [EVIDENCE] | [IMPACT] | [ROOT-CAUSE HYPOTHESIS] | [SEVERITY P0-P3] | [FIX] | [REGRESSION TEST] | [VERIFICATION]`.

### Phase 2 — Prioritize

- **P0:** active secret exposure, exploitable auth/authorization flaw, corruption, or financial integrity incident. Stop ordinary work, contain exposure, recommend rotation, and notify the owner.
- **P1:** production login outage, cross-tenant access, major portal/API outage, data loss, or broken critical workflow.
- **P2:** degraded feature, repeatable errors with workaround, significant performance or observability gap.
- **P3:** documentation drift, non-blocking UX, maintainability issue.
- Rank by severity, blast radius, likelihood, reversibility, and effort. Do not bundle unrelated refactors into a hotfix.

### Phase 3 — OAuth and domain migration checklist

When Google login or old-domain redirects are reported, inspect both code and provider configuration:

1. Trace `GoogleSignInButton` → `signInWithOAuth` → Supabase callback → portal `/auth/callback` → backend OAuth exchange → role/session persistence → dashboard/onboarding.
2. Verify `redirectTo` uses the active portal origin and the correct portal callback path.
3. In Supabase Dashboard → Authentication → URL Configuration, verify Site URL is the intended canonical production URL and Redirect URLs explicitly allow each required HTTPS portal callback. Keep localhost only for development as appropriate. Do not use broad wildcards unnecessarily.
4. Verify Google Cloud OAuth authorized redirect URI remains the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`), not the portal URL. JavaScript origins must match actual deployed portal origins.
5. Verify frontend build-time variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_API_URL`) and backend runtime variables. Public Next.js variables are often baked into the build; changing runtime variables alone may require a rebuild/redeploy.
6. Search source, Dockerfiles, workflow files, EasyPanel templates, proxy configs, and docs for deprecated hostnames. Distinguish intentional legacy compatibility references from active production fallbacks.
7. Validate same-origin post-login destinations. Reject absolute/external URLs, protocol-relative URLs, and malformed paths. Never weaken backend role validation or let client input select its own role.
8. Test both admin and advertiser flows: new OAuth session, existing account, wrong role, canceled consent, provider error, backend exchange failure, refresh/session restoration, and onboarding.
9. Inspect browser network redirects and provider logs without capturing tokens. Prove the final URL remains on the intended production portal.
10. If provider settings cannot be inspected or safely changed through an authorized integration, report the exact manual dashboard change; do not pretend a code patch fixes provider configuration.

Canonical production domains documented for TAD:
- Admin: `https://tad.adm.ibusiness.com.do`
- Advertiser: `https://tad.anunciante.ibusiness.com.do`
- Driver: `https://tad.driver.ibusiness.com.do`
- API: `https://tad.api.ibusiness.com.do`

Treat this list as a repository baseline, not proof that DNS, certificates, hosting, or provider settings currently match.

### Phase 4 — Plan and implement

- Use `fable-plan` for multi-surface changes and `fable-tdd` for behavioral fixes where a regression test is feasible.
- Use `fable-execute` for one bounded work card at a time.
- Make the smallest behaviorally complete change on a feature branch. Preserve unrelated changes and backward compatibility.
- Do not change schemas or production data unless necessary and approved.
- Add/update a regression test before declaring behavior fixed.
- For any new fact that changes the architecture or scope, stop and re-plan.

### Phase 5 — Verify

Use `fable-verify` and run the narrowest meaningful checks first, then relevant workspace checks:
- TypeScript/build for affected workspaces.
- Unit tests for redirect validation and auth behavior.
- Playwright E2E on each affected portal, including negative cases.
- API health and OAuth exchange contract checks.
- Security review of redirects, role enforcement, cookies, token storage, CORS, and IDOR boundaries.
- For offline/device changes, verify offline queue, reconnect, idempotent sync, and reconciliation.
- For financial changes, verify ledger invariants, idempotency under retries, and balance reconciliation.
- Review the final diff for unrelated edits, secrets, generated noise, and documentation drift.

A passing build is not proof of correct OAuth behavior. If no real provider/runtime test was possible, state that limitation.

### Phase 6 — Document and hand off

Update only relevant source-of-truth docs. Include timestamp, commit/branch, commands, test results, known gaps, deployment requirements, rollback steps, and owner actions. Never overwrite historical evidence to make it look green.

Final status must be exactly one of:
- **VERIFICADO:** acceptance checks and relevant runtime behavior passed with evidence.
- **IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN:** code changed, but one or more acceptance/runtime checks remain.
- **BLOQUEADO:** a required permission, provider setting, environment, secret rotation, or production access is unavailable.

## Required deliverable

1. Executive status and severity.
2. Findings with evidence and affected paths.
3. Root cause confirmed vs hypotheses.
4. Minimal fix and files changed.
5. Regression tests and exact results.
6. Provider/deployment actions still required.
7. Rollback and residual risks.
8. Updated docs and follow-up work cards.

Do not claim the entire platform is fixed from a repository scan alone.
