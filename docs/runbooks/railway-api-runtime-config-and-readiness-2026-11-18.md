# Railway API runtime configuration and readiness — 2026-11-18

**Incident:** [#314](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/314), related release-control gap [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313) and CI runner failure [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147).

## Observed failure and scope

The connected Railway project `discerning-commitment`, environment `production`, service `tad-dooh-platform`, builds `Dockerfile.api` from `main`.

At commit `9e75e83`, Railway built the container and reported deployment `CRASHED`. The runtime entrypoint reported four **missing variable names**: `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `DIRECT_URL`. It safely refused to start. An earlier commit (`96015d2`) was reported `SUCCESS` by Railway but its own entrypoint logs showed the same missing configuration, so a SUCCESS badge alone did not prove readiness. Railway service inventory returned no variable names.

**Do not infer that `tad.api.ibusiness.com.do` or the EasyPanel services are down.** This Railway service has a separate generated Railway domain and was not confirmed to be the authoritative public API. HTTP probes from the investigation environment were inconclusive.

## Recovery procedure — no secrets in repositories, comments or logs

1. **Identify the authoritative runtime.** Verify DNS, reverse proxy and EasyPanel routing out-of-band. If EasyPanel is the production API, classify Railway as a separate inactive/redundant service until ownership is agreed. Avoid enabling duplicate cron/scheduler or migration runners.
2. If the Railway service is **intended** to run production, an authorized operator must populate the secure Railway environment-variable store with the *correct existing values* for `JWT_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `DIRECT_URL` and any app-required Supabase auth fields. Do **not** use hard-coded defaults, copy secrets from unverified projects or print values. Do not put credentials in GitHub Issues, PRs, terminal history or chat.
3. Verify runtime and migration URLs identify the **same intended Supabase project** as the auth URL. Review the non-networking `apps/api/scripts/check-supabase-target.cjs` contract with fixture tests first. Avoid guessing between the connected healthy `us-west-2` project and any other Supabase project.
4. Before allowing deploy migration execution: use read-only `prisma migrate status` in a controlled staging context, confirm current schema against Prisma and drift issue #217, and take a verified backup. Do not use `db push`, `migrate reset`, destructive SQL or production schema shortcuts.
5. Run local fixture-only entrypoint verification: `node --test scripts/api-entrypoint-env.test.cjs apps/api/scripts/check-supabase-target.test.cjs`. No live DB or external tokens required.
6. Configure a supported Railway **readiness** check for `/health/full` only after the service is properly configured. It must report `status=up`, `db.connected=true`, `db.masterSyncViewReady=true`. A plain `/health` is liveness-only and is insufficient for financial/offline readiness. Use existing fixture-tested `scripts/check-api-readiness.cjs` against approved staging and then the right production host.
7. Verify with a dedicated staging environment before promotion: authenticated API request, tenant isolation, 409 on unsafe approvals, versioned price quote, tablet offline→reconnect→reconcile, and financial concurrency tests. Collect only structured statuses and request IDs, never secrets or PII.
8. Restore GitHub Actions runner allocation (#147), protect `main`, and enforce gating between checks and production deployments (#313). Railway currently follows `main` with check suites disabled; do not assume merged == verified.
9. Mark incident recovered only after runtime entrypoint, readiness, database target and operational monitoring are each verified. Record actual deployed SHA and service route.

## Patch in this branch

The entrypoint now explicitly checks **all four** required variable names before announcing or initiating Prisma migration work. It still never logs their values, never permits ephemeral JWT signing keys, and retains the strict cross-project target check. The local shell harness now stubs the otherwise missing `node` preflight command under its intentionally empty `PATH`; separate tests cover the real project-ref parser. Additional cases verify missing runtime DB, missing auth URL and preflight failure stop before migration.

**This is diagnosability and startup safety, not a replacement for real Railway secrets.** Do not merge, deploy or alter production variables without executable CI and approved staging checks. No production configuration was changed by this branch.
