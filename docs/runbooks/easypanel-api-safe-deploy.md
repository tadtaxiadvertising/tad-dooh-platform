# TAD API — Safe EasyPanel deployment and incident response

**State:** runbook only; production secrets have NOT been verified rotated.  
**Issues:** #244 (P0 exposed secrets), #147 (GitHub Actions unavailable).

## Important: EasyPanel build-argument behavior

For a Git/Dockerfile App, EasyPanel automatically passes project/service environment variables to Docker Buildx as build arguments. Moving credentials to the same service's Environment tab alone **does not prevent credentials appearing in build commands/logs**. This is documented by EasyPanel:
- https://easypanel.io/docs/builders
- https://easypanel.io/docs/services/app
- https://docs.docker.com/build/building/variables/

The repo Dockerfile does not declare privileged build arguments, but the deployment orchestrator still included sensitive values in its command. Treat the exposed Supabase secret/service-role key, DB password, application/Supabase JWT secrets and SMTP credentials as compromised. Publishable/anon keys alone are not privileged server secrets.

**Never paste raw secret values, full build commands, environment dumps or unredacted logs into an issue, chat or CI artifact.**

## Preferred separation of build and runtime

1. **Contain:** restrict affected logs/artifacts and audit who could access them; retain sanitized incident evidence.
2. **Build separately:** build the reviewed API commit from a credential-free environment (no production env), using the pinned pnpm version and Dockerfile.api. Inspect image history/provenance for sensitive fields. Publish to an access-controlled registry with an immutable commit tag or digest.
3. **Stage safely:** use a staging EasyPanel App with Source → Docker Image, pulling the prepared image rather than building source with production credentials. Validate port 3000, runtime settings, logging and health. Avoid destructive migrations or sharing production DB credentials in staging.
4. **Prepare production cutover:** preserve the existing runtime environment, domains, resource limits and rollback image reference. In the production App, configure Source → Docker Image with a verified immutable image and private registry pull credentials. Docker Image sources are pulled, not built, by EasyPanel.
5. **Rotate compromised credentials:** replace Supabase privileged API keys, database password (both runtime and migration URLs), SMTP secrets, and JWT signing/application secrets. Update all dependent services, then revoke old credentials promptly. Coordinate JWT rotation with session lifetimes and tablet offline-to-online behavior. Do not roll back to compromised secrets.
6. **Inspect runtime startup:** check sanitized EasyPanel logs for successful Prisma migrations and NestJS listening on the configured port. Docker build success alone does not confirm this.
7. **Run readiness checks from a network with access to the domain:**

    node --test scripts/check-api-readiness.test.cjs
    node scripts/check-api-readiness.cjs https://tad.api.ibusiness.com.do

   The script checks GET /health, GET /health/ready and GET /health/full in order. Each route must return HTTP success and status up; the full response must also confirm DB connectivity and the master-sync view flag. A failing orchestrator route rejects the check even if the full route is healthy. It avoids outputting response bodies, credentials and origin URLs.
8. **Run E2E smoke:** verify authentication, campaigns, device status, one tablet offline → local queue → reconnect → idempotent sync, and email delivery. Check migrations without schema resets, db push or destructive changes.
9. **Close P0 only with evidence:** old keys revoked, secure image source in use, no secret values in build commands/logs, and operational checks passed; summarize without sharing credentials.

## Readiness failure interpretation

- MISSING_ORIGIN / INVALID_ORIGIN: supply a plain HTTPS origin, no paths, credentials or query strings.
- NETWORK_OR_RESPONSE_FAILURE: diagnose DNS, TLS, proxy reachability or invalid JSON. A sandbox-only network failure does not prove public outage.
- LIVENESS_FAILURE: process or routing failure.
- ORCHESTRATOR_READINESS_FAILURE: `/health/ready` returned a degraded or malformed payload despite HTTP success.
- READINESS_FAILURE: API, DB connection, or master-sync readiness degraded. Never auto-drop/recreate the materialized view.
- HTTP_FAILURE: non-2xx API response.

Rollback to a previously verified **image digest** with **rotated** runtime secrets, never to compromised credentials.

## Confirmed observations (2026-11-10)

- PR #243 merged; EasyPanel Docker build succeeded at 20:40:30 UTC.
- Supabase project ACTIVE_HEALTHY; all 23 migrations in main are applied in production (no missing, extra or failed Prisma migrations; read-only comparison).
- public.mv_active_campaigns exists and is populated.
- API process and external readiness: **not yet verified**; external network checks from the current environment failed to resolve/reach the host.
- GitHub Actions jobs fail before runner allocation (runner_id 0, no steps, 0 ms billable); not evidence of application test failures.
- Key rotation and secure EasyPanel source transition: **not yet verified**.
