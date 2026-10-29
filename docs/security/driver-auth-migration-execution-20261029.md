# Driver authUserId migration execution gate — 2026-10-29

**Status:** schema merged; database migration **not verified**. Do not enable writes to `Driver.authUserId` until deployed and checked.

## Evidence
- `apps/api/prisma/schema.prisma` includes nullable unique `Driver.authUserId @map("auth_user_id")`.
- Migration directory: `apps/api/prisma/migrations/`.
- `scripts/apply-migrations.js` has a fixed `MIGRATIONS` array; a new migration directory is not automatically applied by that script.
- That script sets `ssl: { rejectUnauthorized: false }`, disabling server certificate verification. Resolve CA trust before relying on this path for production.

## Read-only preflight
Verify backup and restore readiness, actual database column/index state, `_prisma_migrations` history, drift, and any concurrent migrations. Never print credentials. Check installed CLI versions and `--help`.

## Generate and review
Use the repository's Prisma CLI against local/staging to generate the additive migration. If using Supabase CLI, first create its migration file with `supabase migration new <descriptive-name>`. Expected SQL **for review only, not executed**:

```sql
ALTER TABLE "drivers" ADD COLUMN "auth_user_id" TEXT;
CREATE UNIQUE INDEX "drivers_auth_user_id_key" ON "drivers"("auth_user_id");
```

Confirm actual database type and index naming. PostgreSQL UNIQUE permits multiple NULL values. No destructive DDL, NOT NULL, or automatic backfill belongs here.

## Staging gates
1. Apply with one approved tracked migration mechanism; record migration ID/checksum.
2. Run `prisma migrate status`, `prisma validate`, client generation, TypeScript, Jest.
3. Check `information_schema.columns` and `pg_indexes` for exact column/index, old rows preserved.
4. Test duplicate non-NULL identity rejection, concurrent writes, old login/registration behavior, backup restoration.
5. Review rollback and approval before production.

## Rollout
Database expansion must precede application writes to `authUserId`. Monitor migration errors, authentication failures, driver signup success and orphan identities. Implement provisioning, verified ownership, and phone login in separate PRs. Never derive mappings from email local-parts.

**Unverified:** no staging CLI, migration execution, or production changes were performed in this task.
