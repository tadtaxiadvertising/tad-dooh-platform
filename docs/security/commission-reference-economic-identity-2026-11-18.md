# Commission reference → economic event identity — 2026-11-18

**Incident:** [#332](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/332)  
**Scope:** defensive change to `CommissionService.createIdempotent()`, no database schema or production changes.

## Evidence

Previously, a commission found by its unique `reference` was returned immediately as an idempotent replay, without confirming it belonged to the same `driverId`, `sourceType` or `amount`. Distinct economic events can therefore silently reuse a reference and receive the wrong existing commission. The current schema does enforce a unique reference, but the pre-insert check can race: two requests can both see “none” and the second receives `P2002` after the first inserts.

This affects the financial lineage that later credits a wallet and posts an OPEX_COMMISSION ledger entry. It is a **P1 potential financial integrity defect**, not proof of an actual incident in live balances.

## Smallest safe correction

- A replay succeeds only when `driverId`, `amount`, `sourceType`, `metadata.referredDriverId` and `metadata.campaignId` agree. Benign descriptive changes such as `metadata.note` do not change economic identity. A mismatch returns `409 Conflict` with a generic message, not the stored commission.
- After a `P2002` unique-index collision, wait for the failed transaction to exit, then re-read the winning commission by its **unique reference**. Return `created:false` only after the same identity check. If no winner exists, propagate the original `P2002`; propagate unrelated database errors unchanged.
- The commission INSERT and financial ledger INSERT remain inside the original single Prisma transaction. The winner recovery is read-only, outside that transaction. There is no extra wallet credit, commission creation or ledger write during replay.
- Reject mismatches regardless of caller privilege; IDOR is prevented without revealing another driver's record.

## Regression tests

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-reference-replay.spec.ts
pnpm --filter api exec jest --runInBand src/modules/commission/__tests__/commission.service.spec.ts
pnpm --filter api exec jest --runInBand src/modules/commission/commission-amount-validation.spec.ts
pnpm --filter api run build
```

A local isolated V8 harness evaluated the actual candidate method and guard (with TypeScript type annotations removed) against **10/10 synthetic scenarios**. This is **not** a real Jest, tsc, Docker or PostgreSQL concurrency verification. The dedicated Jest source also covers campaign identity, duplicate payout prevention and non-P2002 errors.

The staging regression must start two PostgreSQL transactions competing to insert the same unique commission reference:
1. Same economic event: exactly one commission and one `OPEX_COMMISSION` entry commit; both callers return the winning commission, one with `created:false`.
2. Different driver/amount/source/event identity: one successful creation, the loser receives 409 and never receives the winner's commission or credits a wallet.
3. Ledger unique conflict not attributable to a committed commission: original DB error propagates; the attempted commission rolls back.
4. Test retry after network failure, double webhook delivery and tenfold parallel load. Do not silently treat a malformed duplicate as success.

## Release conditions

The connected Supabase project has missing Prisma tables (#217) and has **not** been verified as EasyPanel's authoritative runtime database. Do not “fix” the environment by running `db push` or replaying historical migrations. GitHub Actions runner failures (#147), historical credential rotation (#244) and CI-ungated promotion controls (#313) are still open. Railway remains pinned to a known SHA and is not ready; no automatic deployment is allowed from this PR.

This change is **implemented, pending actual CI and staging verification**, not a verified production finance fix.
