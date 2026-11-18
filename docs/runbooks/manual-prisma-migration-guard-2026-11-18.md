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
2. Checks `DATABASE_URL`, `SUPABASE_URL` and `DIRECT_URL` presence without logging values.
3. Runs existing `node ./scripts/check-supabase-target.cjs` to verify matching Supabase project identifiers and reject unverified or wrong-project hosts.
4. Uses `DATABASE_URL="$DIRECT_URL" pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma` only for the migration subprocess, keeping runtime `DATABASE_URL` unchanged.
5. After `migrate deploy` returns successfully, uses the existing read-only `check-prisma-drift.cjs` against `DIRECT_URL` to compare all Prisma-model tables, columns, identifier types and relation types with PostgreSQL metadata. If the schema still differs, it returns nonzero and `start:migrate` does **not** start the application.
6. Propagates migration/verification failures. No `db push`, `--accept-data-loss`, schema reset, automatic token generation or hidden retry.

**Important transactional limitation:** `migrate deploy` can already have committed SQL migrations before this *postcondition* discovers drift. A failed postcheck does **not** roll those migrations back and must not be described as a no-write outcome. Run only after snapshot, independent schema review and staging tests. The drift script reads `information_schema` metadata, not customer rows, and never prints connection strings.

The normal official Docker entrypoint remains unchanged and uses its own existing target check and `migrate deploy`. This patch concerns manual/legacy npm entry points only.

## Required operator preconditions

- **Never approve just because the migration script exits correctly.** First confirm authoritative runtime DB identity: the connected `us-west-2` Supabase project had missing `commissions`, `settlement_batches` and `portal_requests` despite 23 Prisma history rows; it is **not confirmed** to be EasyPanel's real production target.
- Review every pending SQL migration for destructive operations; plan additive **EXPAND → MIGRATE → CONTRACT** steps. Take a verified backup/snapshot and rehearse on staging with representative data.
- Ensure the previously exposed database credential has been rotated (#244) and both runtime/migration URLs updated in a secure secrets store. Do not paste URLs or passwords into issue comments or shell commands.
- Run `pnpm exec prisma migrate status --schema=./prisma/schema.prisma` from `apps/api` on the verified staging connection (using the correct controlled environment). Review drift before applying.
- Only with approved change window and supervised target identity, execute the exact same versioned migration against the intended environment.

Manual commands (only after those prerequisites):
```bash
cd apps/api
TAD_APPROVE_MANUAL_MIGRATION=YES npm run deploy:migrate
# or, only where application start after migrations is intentional:
TAD_APPROVE_MANUAL_MIGRATION=YES npm run start:migrate
```

## Tests

```bash
node --test scripts/api-safe-migrate.test.cjs
node --test scripts/api-entrypoint-env.test.cjs apps/api/scripts/check-supabase-target.test.cjs
pnpm --filter api run build
```

The first suite uses a POSIX shell and mocks `node`/`pnpm` with **synthetic** connection strings. It verifies explicit opt-in, absent variables, target rejection, correct direct URL, propagation of failed migrations, clean post-migration parity and a failing post-migration drift check. It never connects to a database. Tests are included in CI, which still must be repaired (#147) before merge or deployment.

### Out-of-scope risk

Legacy archived `npmfix2/apps/api/package.json` still contains an historical `--accept-data-loss` script, but that snapshot is outside the active `apps/api` workspace. Review whether it should be removed from the repository separately; never execute its scripts on production.
