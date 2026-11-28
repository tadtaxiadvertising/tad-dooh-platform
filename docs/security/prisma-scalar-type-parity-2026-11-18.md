# Prisma scalar type parity — 2026-11-18

**Incident:** [#326](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/326)  
**Status:** isolated candidate, not deployed. No database writes, live migrations, ledger or secret changes.

## Evidence and impact

The production Docker entrypoint (merged PR #325) and manual migration wrapper (merged PR #323) both run `apps/api/scripts/check-prisma-drift.cjs` after Prisma's versioned migrations. The checker compares Prisma DMMF to PostgreSQL `information_schema`, but the original logic only checked table/column presence, UUID/TEXT String primary keys, and whether relationship columns agree with each other. A wallet `Float` column could be changed to `varchar` while still having the expected name and no FK mismatch, leaving the gate falsely green.

On the connected Supabase us-west-2 project, a **read-only** query compared metadata for 143 scalar fields with unambiguous Prisma→PostgreSQL type mappings. **67 corresponding columns existed and all 67 matched**. No existing financial type corruption was established. The project still has 23 missing Prisma-model tables (#217), so it fails broader parity and is not proven to be the authoritative production DB.

## Safe implementation

Extend the **pure, read-only comparator** with `scalarTypeMismatches` and `scalarTypeMismatchCount`. The CLI now returns exit code 1 when this count is positive, blocking the already-present migration postconditions before NestJS can start.

Validated mappings:
- Prisma `Int → int4`, `BigInt → int8`, `Float → float8`, `Decimal → numeric`, `Boolean → bool`, `Json → jsonb`
- Explicit native mappings such as `@db.SmallInt → int2`, `@db.Real → float4`, `@db.Uuid → uuid`, `@db.Json → json`

To prevent false positives, skip arrays, unsupported native types, implicit String types except existing String primary-key checks, and DateTime variations. A future migration may expand type coverage only with real PostgreSQL metadata and fixture tests. No new SQL or dependency is introduced.

## Verification

```bash
node --test apps/api/scripts/prisma-drift-core.test.cjs
node --test scripts/api-entrypoint-env.test.cjs scripts/api-safe-migrate.test.cjs
pnpm --filter api run build
```

The first suite was exercised against the exact repository source in an isolated V8 test harness: **9/9 test callbacks passed** (4 existing, 5 new). This is not a `node --test` subprocess or full monorepo Jest/TypeScript build; require real CI once runner issue #147 is repaired.

Before deploy:
1. Confirm authoritative EasyPanel PostgreSQL project, not just the connected Supabase management project.
2. On a staged DB, verify each expected type, the zero-drift case, and intentional incompatible `Float/Int/UUID` column cases; restore database from snapshot.
3. Run Docker startup against staged DB to verify exit code prevents NestJS start on drift. Record only sanitised status/counts.
4. **Do not automatically fix the schema.** A failed post-migration check does not undo SQL committed by `migrate deploy`. Finance, offline player state, and existing schema drift recovery remain separate.
5. Preserve CI-gated promotion. Railway service is pinned to a commit and has no runtime variables; do not unpin or inject unreviewed credentials.

Long-term, TAD wallets and financial transactions still use `Float` money fields, which is separate from the schema parity problem; immutable ledger/reconciliation and exact currency arithmetic are required before enabling bank payouts (#299).
