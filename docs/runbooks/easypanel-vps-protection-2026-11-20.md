# EasyPanel / TAD VPS protection — 2026-11-20

**State:** preventive code candidate (PR only; NOT merged or deployed).  
**Incident:** operator reports EasyPanel's **own admin UI** unreachable and SSH unavailable. This has **not** been proven to result from TAD's API. Production host memory, disk, Docker Swarm and panel logs remain unavailable.

## Evidence and scope

- The pre-change `apps/api/docker-entrypoint.sh` called `prisma migrate deploy` on **every API container start**, then checked schema parity and exited nonzero on drift. The supplied prior EasyPanel logs have 23 applied Prisma migrations while 23 modeled tables remain absent; repeated startups were observed. A crash-restart policy can produce resource pressure; **no host-level causal attribution is established**.
- The pre-change `Dockerfile.api` is a single-stage image that builds the whole API in the same container context. An EasyPanel Git/Dockerfile build may create substantial CPU/RAM/disk pressure and may receive build arguments from configured project/service variables; see [EasyPanel builders](https://easypanel.io/docs/builders). This PR **does not** rewrite the Dockerfile or make host builds safe.
- PR changes the official API runtime shell to **never run schema migrations automatically**, while retaining the Supabase-project identity preflight and read-only Prisma parity failure gate. On missing config / failed preflight / drift, it logs a non-secret diagnostic and uses a **fixed 90-second idle cooldown before a nonzero exit** to reduce preflight restart intensity.
- This cooldown is **not** a guarantee against host overload, a Docker daemon failure, a NestJS runtime crash *after* successful preflight, or Docker build spikes. It does not repair the missing schema.
- Reviewed migration route **remains separate** at `apps/api/scripts/migrate-safe.sh` and requires `TAD_APPROVE_MANUAL_MIGRATION=YES`. Never set this in a production service's always-on environment.

## Immediate host recovery (out-of-band)

1. Do not trigger another TAD build, redeploy, schema migration, destructive cleanup, or VPS reinstall while the control panel and SSH are unavailable.
2. Recover access through the **VPS provider's out-of-band web console, rescue/KVM console, or provider support**. Inspect memory, disk usage, OOM-killer events, Docker daemon and Swarm state before restarting individual services.
3. If safe and supported by the provider, restart **only** the EasyPanel management service after checking host health. Preserve Docker volumes and current deployment references; avoid `docker system prune --volumes`, removing Swarm, and deleting databases. Do not assume rebooting the VPS is risk-free.
4. Preserve sanitized logs and the API deployment image digest/SHA. Correlate the first EasyPanel failure timestamp with app/container restart history and Docker builder activity before assigning root cause.

## Mandatory steps before adopting this PR

- Verify the exact production Supabase reference and restorable backup; the inspected connected project may be different from EasyPanel's actual runtime.
- Restore Prisma schema parity **on staging first**; the current failure gate intentionally refuses startup against 23 missing modeled tables. Removing automated migration from boot requires an explicit, approved migration step **before** promoting an API image whose schema needs an upgrade.
- Run `sh -n apps/api/docker-entrypoint.sh` and `node --test scripts/api-entrypoint-env.test.cjs scripts/api-safe-migrate.test.cjs`; run API TypeScript build, Docker image build and staging health checks, including malformed env, target mismatch, 23 missing tables and happy-path startup. Verify the real image has BusyBox `sleep` in its PATH.
- Test that container shutdown/termination during the cooldown does not prevent EasyPanel stop/redeploy. Verify the nonzero status is visible and triggers alerts rather than being silently ignored.
- With management UI restored, disable unreviewed **GitHub auto-deploy** for the affected production services; deploy **immutable, CI-verified images built outside the secret-bearing EasyPanel VPS**, following `docs/runbooks/ghcr-api-verified-image-easypanel-cutover-2026-11-18.md`.
- Size the VPS and isolate build workloads. Review EasyPanel **Settings → Server → Docker Builders** for CPU/RAM/swap caps (too-low build caps can fail builds). Set app CPU/memory limits based on measured host headroom, while reserving capacity for the EasyPanel management service, Docker daemon and OS.
- Set observability alerts for free memory, swap, disk, OOM kills, panel availability, Docker service restart counts, Prisma drift and failure-cooldown events. Test under 10x telemetry load without violating tablet offline buffering and webhook/payment idempotency.

## Out of scope / safety

This PR is a **preventive smallest-safe-change proposal**, not a confirmed fix to the inaccessible EasyPanel UI. It does not touch database tables, keys, wallets, payouts, offline queues, production images or deployment settings. Do not merge as a direct incident recovery shortcut. The live dashboard and SSH remain unreachable until provider-side access is recovered.
