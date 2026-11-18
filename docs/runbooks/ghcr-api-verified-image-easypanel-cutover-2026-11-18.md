# TAD API — audited image publication and safe EasyPanel cutover

**Status:** implementation candidate. No image has been published, no EasyPanel service has been modified and no secrets have been rotated by this PR.

**Incidents:** [#244](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/244) (production credentials in Docker build args), [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147) (Actions jobs fail before running), [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313) (untested main → Railway deploy) and [#314](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/314) (Railway missing runtime configuration).

## Threat model and why a regular build is unsafe

EasyPanel's Git/Dockerfile builder can forward service/project runtime environment variables to `docker buildx build --build-arg`. In #244 a logged build command actually exposed privileged secrets. Merely moving those values to the *Environment* section of that same Git/Dockerfile service is **not** sufficient to prevent the command-line disclosure.

The private API Docker image must be built **outside the secret-bearing service**, with only reviewed repository files. Runtime secrets must enter only after that immutable image is pulled by EasyPanel. Docker `ARG`, `ENV`, buildx flags and image labels must never contain privileged values.

References:
- https://easypanel.io/docs/builders
- https://easypanel.io/docs/services/app
- https://docs.docker.com/build/building/variables/
- https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions

## New manual publication mechanism

`.github/workflows/publish-audited-api-image.yml` is **workflow_dispatch only** and targets exactly `main` of `tadtaxiadvertising/tad-dooh-platform`. It does **not** deploy or update EasyPanel.

It refuses to publish unless:

1. `main` is still the exact commit the operator triggered, with no head change.
2. The latest **push** runs for `CI Quality Gates` and `Docker Image CI` on that same SHA are `completed/success`.
3. Every required job (format, typecheck, Jest/Node contracts, Prisma, audit, all five CI portal Docker builds, the summary, and four independent Docker-image builds) actually ran on a runner and passed its mandatory steps. Zero-step `failure` jobs cannot satisfy the gate.
4. GitHub can authenticate to GHCR using `GITHUB_TOKEN` with `packages: write`; it is a **registry authentication token**, never a Docker build arg or source file.

The published image uses `ghcr.io/tadtaxiadvertising/tad-dooh-platform-api:sha-<full-commit-sha>` and reports the immutable `ghcr.io/tadtaxiadvertising/tad-dooh-platform-api@sha256:<digest>`. Use the **digest**, not `latest` or a mutable tag, in EasyPanel.

`.dockerignore` now explicitly excludes nested `.env`, `.env.*`, `.envrc` and private-key files, as well as root env files and Git metadata. This is defense in depth: audit the checked-out source and image history/provenance before declaring a release safe.

**Current blocker:** GitHub Actions runners fail before job steps (#147), so this workflow should **fail closed** until runners and required checks are restored. Branch protection on the private repository is separately required to stop unverified merges (#313). A successfully published image is not automatically approved for production.

## Authorized operator cutover procedure

**Phase A — Containment and rotation planning (P0)**

- Limit access to the affected EasyPanel build logs and artifacts. Preserve only sanitized incident evidence; never paste credentials or full build commands into issues/chat.
- Confirm the secure registry package is **private**, and provision private-image pull access in EasyPanel using a least-privilege, read-only package credential stored in EasyPanel's secret manager. If the pull role cannot be configured safely, do not cut over.
- Inventory dependencies of the exposed Supabase privileged API key, Postgres database password (runtime and migration URLs), SMTP credentials and JWT signing secrets; coordinate rotation/revocation. JWT rotation must preserve a tested offline tablet reauthentication/reconnect strategy. Do not temporarily re-enable known compromised credentials during rollback.
- Confirm the authoritative API host, DNS and reverse-proxy routing. Railway's `tad-dooh-platform` service currently has no variables configured and is **not proven** to serve EasyPanel's `tad.api.ibusiness.com.do` domain.

**Phase B — Build and verify**

- Restore GitHub Actions runner allocation first, then require successful `CI Quality Gates` and `Docker Image CI` executed for the **same** `main` SHA. Do not fake checks, delete tests or bypass the gate.
- From GitHub Actions, manually run **Publish audited TAD API image (GHCR)** on `main`. Confirm it fails closed if any required check is missing and that its output reports an immutable digest, not runtime environment contents.
- Inspect GHCR package visibility, image provenance and history. Do not assume default package visibility is what EasyPanel can access; verify with the private registry integration.

**Phase C — Staging / review**

- Preserve domain mapping, port configuration, credentials inventory, runtime/volume settings and the previous verified image digest for rollback. Test image pull in a **staging** EasyPanel Docker Image App (not Git/Dockerfile build), without production secrets.
- In a controlled staging environment, verify expected config names exist, `check-supabase-target.cjs` accepts the same intended Supabase project for runtime/migration, and the Prisma migration history matches the actual schema (#217). Back up before any actual migration. **Never run `db push`, `migrate reset` or a guessed migration target.**
- Check `/health` and `/health/full` using `scripts/check-api-readiness.cjs`, then run role isolation, campaign payment review guards, device offline queue / reconnect / ACK idempotency, mail delivery and two-admin commission concurrency tests.
- Ensure financial settlement endpoints stay fail-closed unless bank confirmation and reconciliation are implemented.

**Phase D — Production promotion**

- After staging review and **authorized change approval**, switch EasyPanel Source to **Docker Image** and configure only the reviewed immutable GHCR digest. Production credentials are injected only at runtime from secret storage, never sent as `--build-arg`.
- Rotate old compromised credentials and verify old values are revoked, then check runtime logs without printing key material. Schedule a controlled migration/secret cutover with rollback plan that does not destroy offline tablet queues.
- Observe readiness, API latency, 5xx/403, wallet/ledger reconciliation and tablet sync for the deployment window. Abort/rollback application **image** to a prior vetted digest if needed, while retaining rotated secrets.
- Do not close #244 until rotations/revocations, secure source type, image digest, non-exposure verification and offline/auth/finance smoke evidence have been recorded.

## Verification command

```bash
node --test scripts/ghcr-api-promotion-contract.test.cjs scripts/ci-docker-matrix.test.cjs
```

The security contract is also included in the existing `CI Quality Gates` Node test step. This branch contains no migration, payment mutation, secret values, forced deployment or registration of a new production runtime.
