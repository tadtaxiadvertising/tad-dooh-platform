# TAD manual Prisma migration safety — 2026-11-18

**Status:** candidate change; no migrations, SQL writes, payouts or runtime secret reads performed.  
**Related:** #217 Supabase schema drift, #244 historical credential exposure, #147 CI runner provisioning, #313 ungated deployment.

## Source-level root cause

`apps/api/package.json` previously exposed:
- `start:migrate = npx prisma db push --skip-generate && node dist/main.js`
- `deploy:migrate = npx prisma db push --skip-generate`

These commands apply Prisma schema synchronization outside the checked-in SQL migration history. They bypass the project-reference guard already present in the production Docker entrypoint. A manual or alternate deployment could change a shared Supabase schema without approval, staging or a recorded migration.

Current `apps/api/prisma/schema.prisma` uses `env("DATABASE_URL")` for the datasource. The approved migration connection is `DIRECT_URL` and must reference the **same Supabase project** as both `DATABASE_URL` and `SUPABASE_URL`.

## Smallest safe change

Both manual npm scripts call a single `apps/api/scripts/migrate-safe.sh` wrapper:

1. Requires explicit `TAD_APPROVE_MANUAL_MIGRATION=YES`. An unattended invocation with no flag fails closed.
2. Checks `DATABASE_URL`, `SUPABASE_URL`, `DIRECT_URL` and the **independently owner-confirmed** `TAD_EXPECTED_SUPABASE_PROJECT_REF` without logging their values.
3. Runs `node ../../scripts/verify-supabase-runtime-target.cjs` from `apps/api` to require all three URL project references to match that independently chosen ref; unscoped pooler user names and mismatches fail closed, before any SQL writes.
4. Retains `node ./scripts/check-supabase-target.cjs` as a second consistency check between Auth, runtime and migration URLs.
5. Uses `DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma` only for the migration subprocess, keeping runtime `DATABASE_URL` unchanged.
6. After `migrate deploy` returns successfully, uses the existing read-only `check-prisma-drift.cjs` against `DIRECT_URL` to compare all Prisma-model tables, columns, identifier types, relations and GPS contract. If any drift remains, it returns nonzero and `start:migrate` does **not** start the application.
7. Propagates failures. No `db push`, `--accept-data-loss`, schema reset, automatic token generation or hidden retry.

**Important transactional limitation:** `migrate deploy` can already have committed SQL migrations before this *postcondition* discovers drift. A failed postcheck does **not** roll those migrations back and must not be described as a no-write outcome. Run only after snapshot, independent schema review and staging tests. The drift script reads `information_schema` metadata, not customer rows, and never prints connection strings.

The current Docker API entrypoint performs **read-only** target and Prisma-parity checks; it does **not** run `migrate deploy`. This guard concerns the separate, explicitly authorized manual npm migration entry points.

## Required operator preconditions

- **Never approve just because the migration script exits correctly.** Read-only verification on 2026-11-18 compared all 52 Prisma models with the connected `us-west-2` Supabase project's `public` schema: **29 mapped tables exist and 23 are missing**, including `commissions`, `commission_ledger`, `settlement_batches`, `portal_requests`, `users` and `payment_intents`, although all 23 repository Prisma migrations appear marked applied. This project is **not confirmed** as EasyPanel's actual production database. `migrate deploy` alone cannot reconstruct missing previously-applied objects.
- Review every pending SQL migration for destructive operations; plan additive **EXPAND → MIGRATE → CONTRACT** steps. Take a verified backup/snapshot and rehearse on staging with representative data.
- Ensure the previously exposed database credential has been rotated (#244) and both runtime/migration URLs updated in a secure secrets store. Do not paste URLs or passwords into issue comments or shell commands.
- Run `pnpm exec prisma migrate status --schema=./prisma/schema.prisma` from `apps/api` on the verified staging connection (using the correct controlled environment). Review drift before applying.
- Only with approved change window and supervised target identity, execute the exact same versioned migration against the intended environment.

Manual commands (only after those prerequisites, with the expected project ref **provided privately by the infrastructure owner**; never infer it from repository templates):
```bash
cd apps/api
: "${TAD_EXPECTED_SUPABASE_PROJECT_REF:?operator must pin the approved project ref}"
TAD_APPROVE_MANUAL_MIGRATION=YES npm run deploy:migrate
# or, only where application start after migrations is intentional:
TAD_APPROVE_MANUAL_MIGRATION=YES npm run start:migrate
```

## Tests

```bash
node --test scripts/api-safe-migrate.test.cjs
node --test scripts/verify-supabase-runtime-target.test.cjs
node --test scripts/api-entrypoint-env.test.cjs apps/api/scripts/check-supabase-target.test.cjs
pnpm --filter api run build
```

The first suite uses a POSIX shell and mocks `node`/`pnpm` with **synthetic** connection strings. It verifies explicit opt-in, absent variables, target rejection, correct direct URL, propagation of failed migrations, clean post-migration parity and a failing post-migration drift check. It never connects to a database. Tests are included in CI, which still must be repaired (#147) before merge or deployment.

### Out-of-scope risk

Legacy archived `npmfix2/apps/api/package.json` still contains an historical `--accept-data-loss` script, but that snapshot is outside the active `apps/api` workspace. Review whether it should be removed from the repository separately; never execute its scripts on production.
