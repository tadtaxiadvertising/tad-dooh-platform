# CI recovery checkpoint — 2026-11-02

Base: main at 06e611e7383511fb1ff131da7d80fc3b620944c8. This branch is documentation-only. No production changes.

## Verified source evidence
- .github/workflows/ci.yml test job runs `pnpm exec playwright test --reporter=dot` whenever `tests/e2e` exists.
- Root package.json does not declare `@playwright/test` or `playwright` in root devDependencies.
- Root playwright.config.ts imports `@playwright/test`, assumes cross-service endpoints on localhost, and deliberately has no webServer.
- PR #181 reports CI error `Command "playwright" not found`, global TypeScript failures in Admin, and high/critical audit findings.
- The same CI workflow warns and continues when TruffleHog is absent: secret scanning is not guaranteed by this gate.

## Root cause hypothesis / safe next step
The root E2E command has no guaranteed root Playwright executable. Confirm lockfile/workspace dependency ownership, test prerequisites and service startup before changing package manifests. Add an explicit pinned test-runner dependency with frozen-lockfile consistency, install browsers in CI, and supply isolated service fixtures or dedicated services. Do not silence E2E or point tests at production.

## Gates
1. pnpm install --frozen-lockfile
2. pnpm exec playwright --version
3. pnpm exec playwright test --list
4. Run E2E with deterministic local services and browsers installed
5. Confirm strict typecheck, lint, API tests, Prisma, audit and Docker gates
6. Review PR #181 separately; do not merge or deploy with failing security gates.

## Security
Treat any live credential found in source/history as a potential P0 incident: isolate, revoke/rotate, then investigate. Avoid printing credentials in CI output. No secrets were copied into this checkpoint.

Status: root cause evidence gathered; remediation not yet implemented or tested.
