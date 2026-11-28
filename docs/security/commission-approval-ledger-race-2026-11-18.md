# Commission approval concurrency and ledger integrity — 2026-11-18

**Status:** code candidate in isolated branch. No production mutation, no wallet correction or payouts sent.  
**Severity:** P0 potential — financial double-credit and balance drift.

## Evidence / root cause

The existing `CommissionService.approveCommission()` used `$transaction()`, but inside the transaction read `PENDING` via `findUnique()` before using **unconditional** `commission.update()` followed by `wallet.upsert({availableBalance: {increment: amount}})`. Under PostgreSQL READ COMMITTED two concurrent approvals may both read PENDING, both eventually UPDATE the same row, and each increment the driver's wallet. The `IdempotencyInterceptor` on the HTTP route does not eliminate concurrency with differing idempotency keys or other internal callers.

The prior approval also ran `financialTransaction.updateMany({reference})` without verifying that the matching ledger existed, was PENDING, represented the same driver and amount, or actually transitioned. Thus a wallet credit could occur without a matching financial entry.

The previous `revokeCommission()` reverted wallet balance only for `PAID`; however **the credit occurs at APPROVED**. A revoked approved-but-not-paid commission therefore left its previous wallet credit behind. Its status update also lacked compare-and-set, allowing racing decisions. `markCommissionPaid()` likewise used an unconditional update following a stale status check.

These are code paths, **not confirmed live duplicate credits**.

## Containment implementation

1. `approveCommission()`: within **one Prisma transaction**, CAS `PENDING -> APPROVED` using `updateMany({where: {id,status:'PENDING'}})` and require `count === 1`.
2. Conditionally advance exactly one matching source `FinancialTransaction` from `PENDING -> COMPLETED`, with matching `reference`, `driverId`, `amount`, `type=OUTGOING`, `category=OPEX_COMMISSION`, and `count === 1`, before crediting wallet. Any mismatch throws and rolls back the entire Prisma transaction.
3. Credit the wallet exactly once *after* both CAS operations. If the commission or ledger has conflicting state, respond HTTP 409; do not invent a replacement ledger or silently pay.
4. `revokeCommission()`: CAS the observed state to `REVOKED` and only then record the reversal; debit the wallet for both APPROVED and PAID, because the initial credit was made at APPROVED. Concurrent replays conflict instead of making multiple adjustments.
5. `markCommissionPaid()`: CAS `APPROVED -> PAID` so it cannot overwrite a competing revocation.

No schema changes or data repair. The existing `FinancialTransaction.reference @unique` is reused. Offline Player code and sync are untouched.

## Required verification before merge / deployment

- `pnpm --filter api exec jest --runInBand src/modules/commission/commission-atomic-ledger.spec.ts src/modules/commission/__tests__/commission.service.spec.ts`
- `pnpm --filter api run build` and existing finance/referral tests.
- Staging PostgreSQL concurrency with two real transactions attempting approval simultaneously: exactly one commission and source-ledger transition, exactly one wallet credit. Replay with different HTTP Idempotency-Key values.
- Inject failure after commission CAS, after ledger CAS and during wallet upsert; confirm **no partial commits**. Test missing source ledger, mismatch, pre-completed ledger and cross-driver reference.
- Test APPROVED and PAID revocation, simultaneous revoke/approve, and active unsettled balances. Verify wallet non-negative/debt-handling policy with finance before processing existing disputed balances; do not manually subtract balances.
- Review existing `commissions`, `financial_transactions`, `wallets` counts and aggregates via **read-only SQL only**, without IDs/PII in reports. Actual provider payout reconciliation is required before remediation.
- CI runner issue #147 is a release blocker until executable tests run; do not bypass quality gates.

## Follow-on financial lifecycle issues (not solved)

- `approveSettlementBatch()` currently marks all commissions `PAID` when a batch is only `APPROVED` — a settlement integrity flaw.
- `paySettlementBatch()` writes `financialTransaction.status=COMPLETED` without external bank confirmation; a client-provided `referenceNum` reused across multiple referents violates the unique financial reference. Needs verified bank-provider settlement, immutable per-recipient ledger, idempotent batch and amount reconciliation.
- The commission wallet remains a mutable aggregate; long-term architecture requires an immutable, per-event balance ledger with balance derived/reconciled, and a reviewed EXPAND–MIGRATE–CONTRACT upgrade.
- Do not treat this branch as proof of financial reconciliation or close #299.

## 10× and observability

CAS is a constant-row transactional gate on the commission PK and unique ledger reference, suitable for concurrent retries. Monitor HTTP 409 counts and mismatched ledgers, with structured event identifiers only and no secrets, PII or payment provider credentials. Database runtime-target verification (#217) is required before rollout.
