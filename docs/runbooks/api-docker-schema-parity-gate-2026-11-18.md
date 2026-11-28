# Docker API schema-parity gate — 2026-11-18

**Status:** source-only candidate, not deployed, no production SQL or secrets touched.  
**Issue:** #324; related schema drift #217, manual migrator #322, Actions #147, release promotion #313, Railway runtime #314, credential containment #244.

## Root cause and immediate behavior

The production API Docker entrypoint already requires JWT_SECRET, DATABASE_URL, SUPABASE_URL and DIRECT_URL. It validates that the runtime and direct connections belong to the same intended Supabase project and runs `prisma migrate deploy`. **It did not validate the actual PostgreSQL schema after those migrations.** Prisma can return success when all rows in `_prisma_migrations` are finished even if tables, columns, or relation types have since been removed or drifted.

The connected us-west-2 Supabase project currently has 52 Prisma model definitions but only 29 of their mapped tables; 23 missing, despite 23 finished migration-history rows. Its status as the production EasyPanel API database is **not confirmed**. The repository SQL for two migrations responsible for 13 absent tables matches the historical SHA256 checksums in the inspected DB. There is no evidence yet establishing the exact historical cause of object loss.

## Smallest safe change

After the existing checked migration and **before** logging success or starting NestJS, execute:

```sh
DATABASE_URL="$DIRECT_URL" node ./scripts/check-prisma-drift.cjs
```

The existing checker uses Prisma DMMF and PostgreSQL `information_schema` only. It checks for missing model tables/columns, UUID/TEXT primary-key mismatches, and incompatible relation field types. The process exits nonzero on drift. `set -eu` prevents the app from starting on a false-green schema. No records, PII, database credentials, telemetry, finance ledgers or devices are queried. The generated Prisma client is part of the API image build.

**Caveat:** `migrate deploy` may have committed SQL before the read-only postcheck reports failure. The postcheck is not a rollback, safe schema repair or proof the migration was harmless. Only reviewed, backed-up staging rehearsals can authorize real schema changes.

## Required tests before any merge or deployment

```bash
node --test scripts/api-entrypoint-env.test.cjs apps/api/scripts/check-supabase-target.test.cjs apps/api/scripts/prisma-drift-core.test.cjs
pnpm --filter api run build
docker build --file Dockerfile.api --tag tad-api-parity-gate:staging .
```

- Regression suite uses a real POSIX shell, fixture-only variables and isolated stubs for the target check, versioned Prisma migration and post-migration drift check. Verifies no Node start on missing config, target mismatch, migration error or schema mismatch, and startup only after clean parity.
- Isolated no-network smoke in this investigation: **8/8 scenarios passed**. This is **not** the real monorepo CI, full Jest suite or staging database.
- Stage on a known verified test DB and create a **non-production controlled drift case**. Confirm the checker returns nonzero and NestJS never launches; restore the test DB from snapshot. Verify normal runtime and offline tablet sync/reconnect on a healthy schema.
- Check strict TypeScript and Docker image build on the same SHA with real GitHub Actions steps. CI currently fails with zero executable steps (#147).
- Do not deploy to the real database until its project identity, migration history, backups and missing-object recovery plan are documented. Do not use `db push`, `--accept-data-loss`, destructive DDL or replay all finished migrations blindly.

## Rollout and observability

- Keep this PR draft until staging verifies parity and rollout has an authorized change window. Do not repoint JWT/DB secrets simply to satisfy the checker.
- A failing schema gate is a **release blocker**, not an alert to increase timeouts or disable checks. Use sanitized logs and existing readiness `/health/ready` once API starts.
- Railway source is deliberately pinned to main SHA `f3e10536` pending working CI. It still lacks configured runtime vars, so the service is not operational. Do not unlock promotion as part of this PR.
- Do not assume this Railway service is the public API in EasyPanel. Check authoritative routing and offline device impact separately.
