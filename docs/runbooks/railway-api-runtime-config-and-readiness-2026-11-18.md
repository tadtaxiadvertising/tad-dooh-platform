# Railway API runtime configuration and readiness — 2026-11-18

**Incident:** [#314](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/314), related release-control gap [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313) and CI runner failure [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147).

## Observed failure and scope

The connected Railway project `discerning-commitment`, environment `production`, service `tad-dooh-platform`, builds `Dockerfile.api` from `main`.

At commit `9e75e83`, Railway built the container and reported deployment `CRASHED`. The runtime entrypoint reported four **missing variable names**: `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `DIRECT_URL`. It safely refused to start. An earlier commit (`96015d2`) was reported `SUCCESS` by Railway but its own entrypoint logs showed the same missing configuration, so a SUCCESS badge alone did not prove readiness. Railway service inventory returned no variable names.

**Do not infer that `tad.api.ibusiness.com.do` or the EasyPanel services are down.** This Railway service has a separate generated Railway domain and was not confirmed to be the authoritative public API. HTTP probes from the investigation environment were inconclusive.

### Read-only verification — 2026-11-19

- The current production service source is **pinned to commit `f3e105362eb598cde5739ed38c6028593ff2fee2`** even though its branch field is `main`. This is not evidence that later merges of `main` are live or that pushes will automatically redeploy this service.
- Latest attempted deployment `724a31a3-40c2-4ad2-8aac-b60bc7bcd50f` **FAILED** at healthcheck. Its own runtime logs establish a preflight/startup failure: `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_URL` and `DIRECT_URL` are reported `MISSING`; the entrypoint refuses to launch the API. Railway's service inventory lists zero configured variable names. No values were viewed or copied.
- Railway reports the prior deployment `c14baab9-b14a-48b2-a2ac-e0472cf2c21f` (commit `c34274b3`) **SUCCESS** with one running replica. There are four recent failed deploys and four active warnings. A running replica does **not** establish successful readiness, the authoritative API route, financial safety, or that newer financial patches are active.
- GitHub `main` includes merged financial changes through commit `5713e164a0be619dc81efe078503d7ef91455155`, but its official PR Quality Gates and Docker runs still failed with `steps: []` on inspected jobs. **No release certification exists.** Track [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147) and [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313).

## Recovery procedure — no secrets in repositories, comments or logs

1. **Identify the authoritative runtime.** Verify DNS, reverse proxy and EasyPanel routing out-of-band. If EasyPanel is the production API, classify Railway as a separate inactive/redundant service until ownership is agreed. Avoid enabling duplicate cron/scheduler or migration runners.
2. If the Railway service is **intended** to run production, an authorized operator must populate the secure Railway environment-variable store with the *correct existing values* for `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `DIRECT_URL` and any app-required Supabase auth fields. Do **not** use hard-coded defaults, copy secrets from unverified projects or print values. Do not put credentials in GitHub Issues, PRs, terminal history or chat.
3. Verify runtime and migration URLs identify the **same intended Supabase project** as the auth URL. Review the non-networking `apps/api/scripts/check-supabase-target.cjs` contract with fixture tests first. Avoid guessing between the connected healthy `us-west-2` project and any other Supabase project.
4. Before allowing deploy migration execution: use read-only `prisma migrate status` in a controlled staging context, confirm current schema against Prisma and drift issue #217, and take a verified backup. Do not use `db push`, `migrate reset`, destructive SQL or production schema shortcuts.
5. Run local fixture-only entrypoint verification: `node --test scripts/api-entrypoint-env.test.cjs apps/api/scripts/check-supabase-target.test.cjs`. No live DB or external tokens required.
6. Configure a supported Railway **readiness** check for `/health/full` only after the service is properly configured. It must report `status=up`, `db.connected=true`, `db.masterSyncViewReady=true`. A plain `/health` is liveness-only and is insufficient for financial/offline readiness. Use existing fixture-tested `scripts/check-api-readiness.cjs` against approved staging and then the right production host.
7. Verify with a dedicated staging environment before promotion: authenticated API request, tenant isolation, 409 on unsafe approvals, versioned price quote, tablet offline→reconnect→reconcile, and financial concurrency tests. Collect only structured statuses and request IDs, never secrets or PII.
8. Restore GitHub Actions runner allocation (#147), protect private `main`, and enforce gating between **executed** checks and production deployments (#313). **Current Railway source is commit-pinned to `f3e10536`; preserve that freeze.** Do not unpin, reconfigure a deployment trigger, or start another release based solely on a merged PR, a `SUCCESS` badge, an isolated mock test, or an empty commit-status response. GitHub branch protection / ruleset eligibility and runner billing/policy require the repository owner to verify in GitHub Settings; the connected integration cannot establish those settings.
9. Mark incident recovered only after runtime entrypoint, readiness, database target and operational monitoring are each verified. Record actual deployed SHA and service route.

## Existing code protections and remaining verification

The repository's API entrypoint explicitly checks **all four** required variable names before Prisma migration work. It does not log secret values or permit ephemeral JWT signing keys, and it retains the cross-project target check. Fixture-only shell and project-reference tests exercise these paths, but the official GitHub Actions runner has not executed them on the latest merge SHA.

**This is startup safety, not a replacement for legitimate Railway secrets or proof of a healthy deployment.** Only an authorized operator should restore the environment from the correct secured source, after identifying the authoritative database and coordinating historical credential rotation (#244). Do not disable preflight to turn a red deployment green. No service settings, credentials, code, schema, or production deployment were changed by the 2026-11-19 read-only verification.
