# EasyPanel / TAD VPS protection — 2026-11-20

**State (verified 2026-11-21 00:08 UTC):** PR #406 merged to `main` (commit `79df080`), **not verified deployed to EasyPanel**. A source-code merge is not proof of runtime adoption.  
**Incident:** operator reports EasyPanel's **own admin UI** unreachable and SSH unavailable. This has **not** been proven to result from TAD's API. Production host memory, disk, Docker Swarm and panel logs remain unavailable.

## Evidence and scope

- The pre-change `apps/api/docker-entrypoint.sh` called `prisma migrate deploy` on **every API container start**, then checked schema parity and exited nonzero on drift. The supplied prior EasyPanel logs have 23 applied Prisma migrations while 23 modeled tables remain absent; repeated startups were observed. A crash-restart policy can produce resource pressure; **no host-level causal attribution is established**.
- The pre-change `Dockerfile.api` is a single-stage image that builds the whole API in the same container context. An EasyPanel Git/Dockerfile build may create substantial CPU/RAM/disk pressure and may receive build arguments from configured project/service variables; see [EasyPanel builders](https://easypanel.io/docs/builders). PR #406 **did not** rewrite the Dockerfile or make host builds safe.
- Merged PR #406 changed the official API runtime shell to **never run schema migrations automatically**, while retaining the Supabase-project identity preflight and read-only Prisma parity failure gate. On missing config / failed preflight / drift, it logs a non-secret diagnostic and uses a **fixed 90-second idle cooldown before a nonzero exit** to reduce preflight restart intensity.
- This cooldown is **not** a guarantee against host overload, a Docker daemon failure, a NestJS runtime crash *after* successful preflight, or Docker build spikes. It does not repair the missing schema.
- Reviewed migration route **remains separate** at `apps/api/scripts/migrate-safe.sh` and requires `TAD_APPROVE_MANUAL_MIGRATION=YES`. Never set this in a production service's always-on environment.

## Immediate host recovery (out-of-band)

1. Do not trigger another TAD build, redeploy, schema migration, destructive cleanup, or VPS reinstall while the control panel and SSH are unavailable.
2. Recover access through the **VPS provider's out-of-band web console, rescue/KVM console, or provider support**. Inspect memory, disk usage, OOM-killer events, Docker daemon and Swarm state before restarting individual services.
3. If safe and supported by the provider, restart **only** the EasyPanel management service after checking host health. Preserve Docker volumes and current deployment references; avoid `docker system prune --volumes`, removing Swarm, and deleting databases. Do not assume rebooting the VPS is risk-free.
4. Preserve sanitized logs and the API deployment image digest/SHA. Correlate the first EasyPanel failure timestamp with app/container restart history and Docker builder activity before assigning root cause.

## Mandatory steps before deploying the merged change

- Verify the exact production Supabase reference and restorable backup; the inspected connected project may be different from EasyPanel's actual runtime.
- Restore Prisma schema parity **on staging first**; the current failure gate intentionally refuses startup against 23 missing modeled tables. Removing automated migration from boot requires an explicit, approved migration step **before** promoting an API image whose schema needs an upgrade.
- Run `sh -n apps/api/docker-entrypoint.sh` and `node --test scripts/api-entrypoint-env.test.cjs scripts/api-safe-migrate.test.cjs`; run API TypeScript build, Docker image build and staging health checks, including malformed env, target mismatch, 23 missing tables and happy-path startup. Verify the real image has BusyBox `sleep` in its PATH.
- Test that container shutdown/termination during the cooldown does not prevent EasyPanel stop/redeploy. Verify the nonzero status is visible and triggers alerts rather than being silently ignored.
- With management UI restored, disable unreviewed **GitHub auto-deploy** for the affected production services; deploy **immutable, CI-verified images built outside the secret-bearing EasyPanel VPS**, following `docs/runbooks/ghcr-api-verified-image-easypanel-cutover-2026-11-18.md`.
- Size the VPS and isolate build workloads. Review EasyPanel **Settings → Server → Docker Builders** for CPU/RAM/swap caps (too-low build caps can fail builds). Set app CPU/memory limits based on measured host headroom, while reserving capacity for the EasyPanel management service, Docker daemon and OS.
- Set observability alerts for free memory, swap, disk, OOM kills, panel availability, Docker service restart counts, Prisma drift and failure-cooldown events. Test under 10x telemetry load without violating tablet offline buffering and webhook/payment idempotency.

## Out of scope / safety

The merged change is a **preventive smallest-safe-change mitigation**, not a confirmed fix to the inaccessible EasyPanel UI. It does not touch database tables, keys, wallets, payouts, offline queues, production images or deployment settings. Do not trigger a new main-based EasyPanel build as an incident recovery shortcut; wait for out-of-band host recovery, runner-based CI and staging readiness. The live dashboard and SSH remain unreachable until provider-side access is recovered.

## Subsequent verified findings

- Local hermetic POSIX test on the exact merged API entrypoint Git blob `9a22d48427a81118bac068c1bc96fded26f0e98e`: **8/8 scenarios passed** (missing JWT/runtime/migration/Supabase env, target rejection, Prisma drift, healthy startup). It is **not** a Docker build or production test.
- GitHub Actions runs `44841468072` (CI Quality Gates) and `44841467841` (Docker Image CI) reported failed jobs with **zero executed steps** for representative Tests and API Docker jobs. This is a runner/CI availability gap, not evidence of a failed application assertion; release cannot be declared verified.
- PR #405 was merged to `main` (docs only) and #406 subsequently merged. Multiple Dependabot upgrades were also merged in a short interval. Under EasyPanel GitHub Auto Deploy, **even documentation-only pushes can trigger a full Docker source rebuild**; this mechanism could produce host load but is not proven to have caused the panel outage.
- Draft PR #408 groups routine Dependabot version updates and leaves security updates independent; **do not merge while host access is unavailable**. Grouping alone cannot stop the build-on-push behavior. EasyPanel documents the App's **Disable Auto Deploy** control under the App overview: https://easypanel.io/docs/services/app.

### Freeze and recovery release gate

1. **Freeze new merges into `main`** until the server is reachable. Branch work and draft PRs do not imply promotion.
2. Provider out-of-band console/support must collect host RAM, OOM, disk/inodes, Docker and EasyPanel service state first. Never share secrets, unredacted build lines or full env dumps.
3. As soon as control-panel access is restored, disable GitHub **Auto Deploy** on every application rebuilding from this repository. Record deployment SHA/image digests and preserve rollback paths.
4. Reserve panel/host CPU and RAM, configure Docker Buildx builder resource limits and app reservations/limits, then build outside the VPS. Never ship production env to Docker build arguments.
5. Require executed green CI, staging smoke, schema parity and backup validation before promoting a fixed immutable image. Missing Prisma tables remain a separate #217 blocker.

## Update — 2026-11-21 00:20 UTC: PR #408 is now merged

PR #408 was merged in `main` at `3f44a14`. It groups *routine* Dependabot version updates but **cannot stop EasyPanel builds** from any subsequent push to `main`. The actual GitHub-to-EasyPanel auto-deployment setting and the deployment SHA are not observable with current access. No new merge to main is safe until provider console recovery or explicit isolation from GitHub webhooks.

### First responder: provider console, not EasyPanel UI or SSH

If both EasyPanel admin and SSH are inaccessible, use the **VPS provider's web/KVM/serial/rescue console**, or contact provider support to check the host. The repository now includes `scripts/easypanel-host-triage.sh` for this purpose **only when a trusted copy is available on the VPS** (do not fetch arbitrary remote scripts as root). This script collects only:

- UTC time, uptime and system load; RAM/swap, disk and inode capacity;
- Docker daemon and Swarm state;
- names/replica counts, EasyPanel and Traefik task states;
- Docker disk **summary** and *aggregate* kernel OOM count.

It **does not** fetch environmental secrets, URLs, full logs, Docker task errors, credentials or customer data; it does not restart/scale/alter any service, run a Docker cleanup or migrate a DB.

Run with `sh scripts/easypanel-host-triage.sh` from a verified checkout or script copy **on the host**. The Node fixture test is `node --test scripts/easypanel-host-triage.test.cjs`. The script tests were executed on a local synthetic environment (POSIX syntax, static no-write constraints and synthetic redaction, 3/3 passed). They are **not** evidence the production host is healthy.

If the script or repository is not available from the provider console, ask provider support for: RAM/swap exhaustion, OOM kills, root and Docker disk/inode availability, Docker daemon health, EasyPanel/Traefik task state and concurrent Docker builder processes. Preserve evidence **without posting full env vars, Docker build args or log dumps**.

### Interpretation and safe next actions

- **Out-of-memory/OOM:** stop or cap the identified build/restart source after confirming process ownership; reserve OS/EasyPanel headroom; switch to prebuilt images generated externally. Do not blindly increase timeouts.
- **Full disk/inodes:** identify build cache and container-log usage; take snapshots first. Never delete volumes, databases, Swarm state, or indiscriminately `docker system prune --volumes`.
- **Docker not active:** determine whether OS, disks or Docker daemon failed before restarting. A blind daemon or VPS reboot can cause additional outage.
- **Docker active, EasyPanel failing:** inspect the panel service status and *sanitized* error details via provider console before a controlled restart. Restore management access first, not `tad-api` at the expense of the host.
- **Panel restored:** disable GitHub **Auto Deploy** for all TAD GitHub-backed apps (EasyPanel supports `disableAppGithubDeploy`), preserve deployment SHA/image digest, configure constrained or remote Docker builders, and use reviewed immutable image digests from a secure registry. Never share the panel API bearer token.

Sources: [EasyPanel App](https://easypanel.io/docs/services/app), [disable GitHub auto-deploy API](https://easypanel.io/docs/api/services/app/disableAppGithubDeploy), [Docker builders](https://easypanel.io/docs/builders).

### Release gate

Even though the API no-migrate-on-boot mitigation (#406) is merged, **its deployment and production validation remain unknown**. Prisma model/schema drift (#217) still blocks safe API startup. GitHub CI/Docker jobs have been observed failing without executed steps (#147), so their red status must not be claimed as executed application tests. Do not merge, trigger GHCR promotion or perform manual EasyPanel redeploy until production control-plane access and test execution are restored.
