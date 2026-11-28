# API liveness vs readiness — deployment safety (2026-11-18)

Incident: [#319](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/319). Related: [#314](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/314) Railway missing runtime config, [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147) CI not executing, [#217](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217) schema target drift, [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313) CI-ungated promotion.

## Root cause

The API sets global NestJS prefix `api/v1` but only excludes the exact `health` path. NestJS docs specify a plain `health` exclusion does not cover children such as `health/full`. The release readiness script already requests `/health/full`; the documented path must be excluded explicitly. At the same time `/health/full` returned HTTP 200 even when JSON status was `degraded`. Railway evaluates **HTTP 2xx**, not JSON payloads, when deciding to activate a deployment.

Prior Railway deployments are mislabeled SUCCESS even as entrypoint logs show a fatal absent `JWT_SECRET`. A healthcheck cannot make a container lacking credentials boot; it only prevents future false-positive promotion. The Railway service's relationship to authoritative EasyPanel-hosted public API is still not confirmed.

## Intended API contract

| URL | Status when healthy | When DB is disconnected / master sync view unavailable | Audience |
| --- | --- | --- | --- |
| `GET /health` | HTTP 200, `status: up` | HTTP 200 (liveness only) | Load balancer liveness |
| `GET /health/full` | HTTP 200, safe JSON `status: up` with DB booleans | HTTP 200, JSON `status: degraded` (backward compatible) | Existing TAD release smoke |
| `GET /health/ready` | HTTP 200 `{status: "up"}` | HTTP 503 `{status: "degraded"}` via exception filter | Railway/EasyPanel readiness, not secrets |
| `GET /api/v1/health/db` | Existing DB diagnostics | Existing DB diagnostics | Legacy/versioned diagnostics, not newly added root exception |

Readiness only probes whether PostgreSQL responds and the player master-sync view is available. It does **not** certify JWT key rotation, payments, schema alignment, device authorizations or all portal availability.

`/health/full` no longer discloses internal process memory, uptime, node environment or PostgreSQL connection counts. Its structured `db` object retains only `connected` and `masterSyncViewReady`, which are required by `scripts/check-api-readiness.cjs`.

Official references:
- https://docs.nestjs.com/faq/global-prefix
- https://docs.railway.com/deployments/healthchecks

## Verification gates (before merge)

1. Run `pnpm --filter api exec jest --runInBand src/health/health.controller.spec.ts`.
2. Run `node --test scripts/api-health-route-contract.test.cjs scripts/check-api-readiness.test.cjs`.
3. Run `pnpm --filter api run build` and the existing release gate. These must actually execute; GitHub currently reports `steps: []`.
4. Stage a synthetic API DB: verify `/health` 200 on process up, `/health/full` 200 with safe flags, and `/health/ready` 200 when DB + master-sync view are both ready. Bring the staging database connection down and check `/health/ready` returns HTTP **503** while `/health` stays 200. Restore it and check recovery.
5. Ensure GET paths are root paths (not prefixed with `/api/v1`) and contain no stack traces, credentials, connection strings or sensitive DB metrics.

## Deployment / rollback

- **Do not set a Railway healthcheckPath to `/health/ready` while this PR is merely a draft.** It would return 404 on the old image and block promotion.
- Confirm which service really serves `tad.api.ibusiness.com.do`, then repair missing runtime variables securely; verify Supabase target identity and migration status before any migration against production.
- After a tested SHA is deployed, set the authoritative service's `healthcheckPath=/health/ready` (for Railway via deployment settings, and its correct target port). Monitor the next deployment and require green readiness before cutover.
- Railway healthchecks run at **deployment time only**, not continuously. Use separate uptime, device-sync freshness and ledger reconciliation monitoring for continuous assurance.
- If healthcheck rejects a valid deployment, inspect DB and master-sync status and restore the **previous verified image**; do not blindly suppress readiness, extend timeouts or bypass auth/financial controls.
- No production configuration or database mutation is part of this PR.
