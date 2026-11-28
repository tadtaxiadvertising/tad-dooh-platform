# Advertiser Docker CI coverage — 2026-11-12

## Evidence / GOAL
Base main SHA: `5261218a568f2fa1b189dc55b2501ffa1f333dd1` (PR #258 merge).
At that SHA, `.github/workflows/ci.yml` builds only api, admin, driver and player. Advertiser has a canonical `Dockerfile.advertiser` and is built as a Next.js app in `.github/workflows/landing-v5-checks.yml`, but that is not a Docker image build. The latter is path-filtered for PRs; therefore it is not a substitute for the required Docker matrix.

## PLAN / minimal change
Add advertiser to the existing isolated Docker matrix, preserving its `needs` and the summary gate. Add a Node contract test covering the five images and requiring the gate wiring. No changes to application code, dependencies, schema, production, financial ledger, idempotency, offline-first, or RBAC.

## Verification
- Repository inspection: PASS — confirmed gap on base SHA.
- Contract test: NOT EXECUTED in this environment; run `node --test scripts/ci-docker-matrix.test.cjs`.
- CI Docker builds: NOT EXECUTED; review all five jobs and required summary for the PR head SHA.
- `pnpm install --frozen-lockfile`, `pnpm audit --audit-level=high`, Jest, TypeScript, Prisma: NOT EXECUTED in this run.
- Authenticated or mutating E2E: NOT EXECUTED and prohibited outside approved isolated staging.
- Release: BLOCKED pending CI evidence and resolution/risk review of issue #195.

## Rollback / STOP
Revert the PR commit(s) only; do not modify production. If the new advertiser image fails, inspect Docker build logs, lockfile and memory limits; do not remove the image from the required gate merely to turn CI green. Rebase/reconcile against main and parallel branches before any merge. Never merge or deploy on failing or missing required gates.
