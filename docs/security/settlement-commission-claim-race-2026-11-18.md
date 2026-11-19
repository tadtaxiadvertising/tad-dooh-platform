# Atomic settlement membership — 2026-11-18

**Incident:** [#328](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/328)  
**Status:** change prepared in isolated branch; no production DB, wallet, payouts, offline tablet state or credentials changed.

## Evidence → hypothesis → test → root cause

`generateMonthlySettlement()` selected `APPROVED` commissions with `settlementBatchId IS NULL`, then created a batch using that snapshot, but subsequently linked **only by ID** with an unchecked `updateMany`. If a commission was revoked or linked after the read, the new batch could advertise total membership and amounts that were no longer eligible. Prisma's interactive transaction is not a guarantee that both operations observe the same concurrent row versions under PostgreSQL READ COMMITTED.

The smallest safe fix is a **compare-and-set membership claim**:

```ts
const claimed = await tx.commission.updateMany({
  where: {
    id: { in: commissions.map((c) => c.id) },
    status: CommissionStatus.APPROVED,
    settlementBatchId: null,
  },
  data: { settlementBatchId: batch.id },
});
if (claimed.count !== commissions.length) {
  throw new ConflictException(
    `Settlement ${periodKey} changed during generation; retry after reconciliation`,
  );
}
```

This runs inside the same `this.prisma.$transaction` as the DRAFT batch creation and produces a nonzero result on a lost race. PostgreSQL must roll back batch creation and any partially linked rows on an exception. **That rollback still needs real PostgreSQL integration verification**; mocks or isolated JS cannot prove it.

The fix does not change the original amount calculation, monthly period, withholding rate, empty-period handling, or manual approval semantics. It does **not** enable the suspended bank payout endpoint.

## Tests

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-claim.spec.ts
pnpm --filter api run build
```

A dedicated Jest regression suite covers successful conditional claim, count 0 and count > expected, revoked row, existing period and empty batch. Four modelled scenarios were run against the actual candidate method's JavaScript logic extracted from source in an isolated V8 harness, with synthetic values only: **4/4 passed**. This is not an official Jest invocation or DB concurrency test.

Staging integration must exercise a deliberate two-connection race:

1. Start generator A after it reads the approved commissions; on connection B, revoke or claim one commission, commit B.
2. Let A run its conditional membership update. Require `ConflictException` and a transaction rollback: no newly created batch for that period and no partial links.
3. With no concurrent mutation, require every selected commission is linked exactly once and snapshot totals/withholdings match membership.
4. Test same-period concurrent generators. The existing unique `period` constraint may make the loser fail with Prisma `P2002`, which is a separate idempotent-retry concern. **Do not** hide a different transaction failure or silently retry partial updates.
5. Verify bank payment remains fail-closed (existing #309/#299), and confirm no wallet balance or source financialTransaction mutates during batch generation.

Current release blockers: GitHub Actions zero-step failures (#147), Supabase schema drift (#217) and incident credential rotation (#244). Do not deploy this change against an unconfirmed runtime DB. Never run `db push` or destructive migrations in production.
