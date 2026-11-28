# Commission reversal ledger reconciliation — 2026-11-19

**Issue:** [#350](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/350)  
**State:** candidate, **not** deployed; zero customer-data writes, secret changes, schema migrations or wallet transfers.

## Evidence → root cause

The read-only commission reconciliation originally checked source `OPEX_COMMISSION` entries, source-ledger ownership and payment evidence, but **never inspected the compensating `OPEX_COMMISSION_REVERSAL` ledger**. `revokeCommission()` is allowed for an APPROVED (already credited) commission only when the driver wallet can be debited in the same transaction, and then creates:

```text
category = OPEX_COMMISSION_REVERSAL
reference = REV-<original commission reference>
type = INCOMING
status = COMPLETED
entityId = original driverId
amount = netAmount = original amount; taxAmount = 0; currency = DOP
```

A commission revoked while PENDING, on the other hand, **did not** credit the wallet and requires **no** compensating ledger. The distinction can be made from `approvedAt`; it remains recorded when a previously APPROVED commission is revoked.

Before the patch, an isolated execution of the exact main reconciliation method with a previously-approved REVOKED commission and a valid COMPLETED source ledger but **no** reversal produced `isClean=true`. This is a real read-only reconciliation false-negative, not proof of a financial incident in production.

## Smallest safe fix

1. Read `approvedAt` with commission metadata; require a COMPLETED original source ledger if it had been approved, or a PENDING source ledger if it was revoked before approval.
2. Query existing reversal entries by **exact** `REV-${reference}`, not by `createdAt` month. A credit from November may be reversed in December; the November report must still reconcile it. Use read-only, parameterized Prisma `findMany` with at most **500** reference values per batch, to limit input size at 10x.
3. If an already-credited commission is REVOKED, require the compensating entry with exact reference, driver, amount, net, zero tax, `INCOMING`, `COMPLETED` and `DOP`. Missing or incompatible entries become discrepancies.
4. If no credited revocation exists, an unexpected `REV-...` record is also a discrepancy.
5. Keep the existing API object `period`, `summary`, `discrepancies`, `isClean`. This is a report-only change, not automatic repair. Historic PAID commissions still require external bank evidence independently.

**Scope limitation:** this only checks reversals associated with source commissions in the requested month. It cannot discover completely orphaned reversal entries whose source commission is absent from that month, nor prove wallet balance consistency or a bank payment. A separate cross-period orphan ledger and wallet-derived balance audit is required before declaring global financial integrity.

## Verification

```bash
pnpm --filter api exec jest --runInBand src/modules/commission/commission-reconciliation-integrity.spec.ts
pnpm --filter api run build
```

- The dedicated suite now tests a credited revocation without compensation, matched reversal, never-approved revocation, spurious reversal, incorrect source-ledger state, seven mismatched reversal fields, a later-month reversal and 501 references split into 500+1.
- Ran the **actual candidate method** (TypeScript type syntax removed for isolated JavaScript execution) through **10/10 synthetic V8 scenarios**, including the originally false-clean case. **This is not official Jest, tsc, Docker or PostgreSQL.**
- Before release, use a known staging PostgreSQL with schema parity and a verified backup. Seed synthetic records for approved/revoked vs pending/revoked, compensation in a different month and invalid reversal. Test that the read-only API returns discrepancies without modifying any row. Confirm permission checks for ADMIN and eventual tenant ownership.
- Monitor query timing and memory at 10x; bounded predicates do not make the entire preexisting monthly reconciliation paginated. Avoid logging private commission references unnecessarily.
- Do **not** backfill a missing reversal automatically or fabricate bank evidence. Any legacy adjustment requires an explicitly authorized immutable ledger, reconciled balances and audit trail.

## Release blockers

Real GitHub Actions jobs still fail before any steps (#147), connected Supabase is not verified as the EasyPanel runtime DB and is missing Prisma-model tables (#217), historical credentials require verified rotation (#244). Railway remains pinned to a fixed SHA with failed deployments (#313/#314). The proposed change must remain unmerged until actual executable CI and staging financial read-only checks succeed.
