# Atomic funded commission revocation — 2026-11-18

**Issue:** [#334](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/334)  
**Change status:** candidate on isolated branch; no database, wallet, payout, secret or device modifications in production.

## Root cause

`CommissionService.revokeCommission()` first claims an APPROVED or PAID commission using a status compare-and-set and writes an `OPEX_COMMISSION_REVERSAL` ledger entry. Until this change, it then performed a blind `wallet.update()` decrement. A driver wallet may have less available money than the credited commission because of withdrawals or concurrent debits. The resulting negative `availableBalance` violates available-to-spend semantics and makes accounting hard to reconcile.

For older commission data created before the amount validator, negative source values are another risk: decrementing a negative amount **credits** funds unintentionally.

## Smallest safe change

Inside the existing Prisma transaction:

1. Before any status change, validate the source commission amount for APPROVED and PAID: positive, finite, representable in integer cents, no sub-cent amounts. PENDING remains independently revocable without wallet or ledger mutations.
2. Keep the conditional `commission.updateMany({where:{id,status}})` claim and the same compensating ledger record as previously.
3. Replace `wallet.update` with `wallet.updateMany`, conditional on both `driverId` and `availableBalance >= commission.amount`.
4. Require exactly one wallet row to be debited. If none matches, throw a `ConflictException` / HTTP 409. Prisma must roll back the commission status update and reversal-ledger creation in the same transaction. Do **not** silently create a negative-wallet receivable or alter balances out of band.

No new schema, no destructive migration, no bank payout reactivation, no new automatic retry. A reversal requiring debt collection should be handled by separately authorized ledger reconciliation rather than a silent negative balance.

## Verification

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-atomic-ledger.spec.ts
pnpm --filter api run build
```

The current in-repo Jest suite was updated for the wallet CAS predicate and new no-funds/invalid-legacy-amount cases. An isolated V8 harness evaluated the exact candidate method with synthetic transactions: **12/12 scenarios behaved as expected** (approved/paid success, zero/insufficient balance, concurrent status claim, negative/zero/NaN/sub-cent legacy values, pending no-debit). This is not a Jest, TypeScript, Docker, bank-reconciliation or actual PostgreSQL transaction test.

**Required staging proof:** On disposable PostgreSQL with the correct Prisma schema, seed an approved commission plus matching completed source ledger and a wallet with exactly the available amount. Revoke it; verify a single reversal entry and balance zero. In another fixture, debit wallet concurrently before revocation's conditional update; require HTTP 409, unchanged commission APPROVED, **no** reversal ledger committed, and no negative wallet. Reconcile with the source ledger and financial transactions. Test PAID legacy cases and absence of the wallet. The mocked suite alone cannot verify rollback.

## Dependencies and release block

- GitHub Actions CI #147 still reports jobs without executable steps.
- Connected Supabase metadata is missing 23 Prisma-model tables, and the EasyPanel authoritative DB remains unconfirmed (#217).
- Historical secrets #244 require rotation; do not connect using compromised credentials or paste them into CI, issues or logs.
- Railway is frozen to an older SHA with no runtime vars (#313/#314); this PR does not alter it.
- Review #299 bank payout and ledger reconciliation before enabling a withdrawal/recovery workflow.

Until executable CI and PostgreSQL staging verification, this change is **implemented, pending validation**, not a verified financial production fix.
