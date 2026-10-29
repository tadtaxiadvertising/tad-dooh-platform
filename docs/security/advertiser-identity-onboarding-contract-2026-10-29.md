# Identity contract blocker — advertiser onboarding

Date: 2026-10-29. Static source inspection only; no runtime test.

## Evidence

- `apps/api/src/modules/onboarding/onboarding.service.ts`: `onboardAdvertiser` creates a Prisma `advertiser` with bcrypt password and status `PENDING_REVIEW`, and a campaign `PENDING_PAYMENT`. No Supabase Auth user is created in this method.
- `apps/api/src/modules/auth/auth.service.ts`: `login` authenticates using `anonClient.auth.signInWithPassword` (Supabase Auth), then looks up the Prisma advertiser by email, injects `app_metadata.role = ADVERTISER` and `entityId` on the Supabase user.
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`: validates Supabase access token and derives `req.user = {id,email,role,entityId}`.
- `apps/advertiser/pages/advertiser/onboarding.tsx`: on successful signup stores `advertiserId` locally, then calls unauthenticated `POST /onboarding/advertiser/:id/complete` to mark ACTIVE and redirects to login.

## Root-cause hypothesis

The onboarding write path and login identity provider may be disconnected: creating a Prisma advertiser does not, in the inspected service, provision a Supabase Auth identity. The login path requires such an identity. Check for database triggers, async provisioning jobs, or external hooks before concluding the user cannot sign in.

## Security invariant

A caller-supplied advertiser ID alone must never authorize status transitions. The current fail-closed controller mitigation prevents this operation but blocks normal completion; it is not the final product flow.

## Proposed implementation sequence

1. Confirm whether Supabase Auth provisioning occurs elsewhere; inspect migrations/triggers/jobs and existing real account lifecycle without exposing PII.
2. Define authoritative lifecycle: registered → pending review/payment → approved/active, according to product rules. Do not equate completion of a browser wizard with payment or administrative approval.
3. Provision and link Supabase Auth identities safely and idempotently, or adapt login contract only after verifying the current authentication design. Avoid storing or logging plaintext passwords.
4. Make status transitions server-authorized, checking role, ownership, and prerequisites. Use atomic state transition with idempotent retry semantics.
5. Update frontend to display pending review/payment accurately; avoid silently swallowing completion errors.
6. Add integration tests for first-time registration/login, failed provisioning, duplicate email, cross-account activation, pending payment, and replay.
7. Roll out behind feature flag or controlled cohort if the live flow is already in use.

## Stop conditions

Do not merge the temporary deny-all mitigation as the final fix. Do not touch payment, campaigns, database schema, or production configuration without verified contracts and a migration/rollback plan.

## Verification

Static inspection confirmed. No local typecheck, Jest, e2e or production checks performed.

## Follow-up audit — 2026-10-29 (PR #146)

Source inspection of the proposed branch shows Supabase Auth `auth.admin.createUser` before the Prisma advertiser/campaign transaction, with best-effort deletion of the newly created Auth identity on transaction failure. Registration is **not yet production-ready**:

- `createUser({ email_confirm: false })` does not establish that a verification email was sent. The current backend contains no signup confirmation dispatch in this path. A verified delivery-and-resend contract is required before release.
- The existing `EmailService` can return `success: true` in mock mode; it must not be used as evidence of delivered verification messages.
- Cross-system provisioning is not atomic. A timeout or failed compensation can leave an orphaned Supabase identity. Define a reconciliation job with a bounded, auditable retry and never delete an existing user on an ambiguous result.
- Email input is now normalized and validated in the proposed branch, and a regression assertion verifies the new Auth identity receives the `ADVERTISER` role. No role or account should be activated merely by completing the frontend wizard.
- Concurrent same-email registrations, existing OAuth identities, and duplicate responses need integration tests in staging.

### CI evidence

For PR #146 head `9df89f7d`, GitHub Actions reported failures on **2026-10-29**:

- [CI Quality Gates run 40829810616](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/40829810616): Format & Lint, TypeScript Check, Tests, Prisma Validation, Security Audit failed; downstream Docker matrix was skipped.
- [Docker Image CI run 40829810937](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/40829810937): API, Admin, Driver, Player image builds failed.
- The GitHub connector returned `BlobNotFound` (HTTP 404) when fetching job logs, so root causes are **not confirmed**. Job conclusions alone are not sufficient to attribute the failures to this PR.
- A subsequent head `b8530a76` also had failed CI runs. The branch has since advanced; recheck the latest head's gates before any merge.

### Required verification commands

Use the repository's Node 22 / pnpm 10 toolchain and an isolated test environment. Do not run migrations against production.

```bash
pnpm install --frozen-lockfile
pnpm --filter api test -- --runInBand onboarding.service.spec.ts
pnpm exec tsc --noEmit --project apps/api/tsconfig.json
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ci_test_db pnpm exec prisma validate --schema apps/api/prisma/schema.prisma
```

If the test command's argument forwarding differs for the installed pnpm/Jest versions, use `pnpm --filter api exec jest onboarding.service.spec.ts --runInBand`.

### Release gates

1. Demonstrate a real signup verification email and successful confirmation using staging Supabase SMTP; never rely on mock `sendEmail`.
2. Verify sign-in after confirmation, role/claim refresh, pending review/payment status, and no unauthorized activation.
3. Verify duplicate and concurrent registrations, compensation failure, retry, and orphan reconciliation without claiming existing OAuth identities.
4. Require passing Jest, typecheck, lint, Prisma validation, security scan, and relevant Docker builds. Inspect failed job logs before changing unrelated code.
5. Obtain review before merging PR #146. Do not deploy or mutate production in this audit.

### CI root-cause refinement (same day)

A read of the Actions jobs API for [main run 40829466235](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/40829466235) confirms **every independent job failed within about two seconds, with `runner_id: 0` and `steps: []`**. PR #146 [run 40830093254](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/40830093254) has the same signature. These failures occurred before checkout or tests, and therefore do **not** demonstrate that Jest, TypeScript, lint or Prisma code failed. The exact runner/provisioning cause requires GitHub Actions administration access. Tracked in [issue #147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147). Do not change source or weaken gates based on these non-executed jobs.
