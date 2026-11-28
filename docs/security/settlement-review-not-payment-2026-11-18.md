# Settlement review is NOT bank payment — containment (2026-11-18)

**Incident:** #309 (P0 potential integrity), independent of #307 wallet-credit race.  
**Status:** proposed isolated branch, not deployed; no database write or real payment made.

## Source evidence

- The old `approveSettlementBatch` used a transaction that set every member commission to `PAID`, assigned `paidAt=now()`, then changed the batch from `DRAFT` to `APPROVED`. No external transfer confirmation exists at this stage.
- The old `paySettlementBatch` inserted `FinancialTransaction` rows as `COMPLETED` then set batch `PAID` with `paidAt=now()`, but had no banking provider integration or evidence of actual disbursement.
- It also used the same `referenceNum` for every beneficiary in a batch, despite `FinancialTransaction.reference @unique`, so a multi-recipient payout could fail.
- Approval and payout used stale read + unconditional update and allowed concurrency ambiguity.

This confirms **financial state-integrity risk in source**, not that any money was actually transferred.

## Containment

1. `approveSettlementBatch`: CAS `DRAFT→APPROVED` using `updateMany({where:{id,status:'DRAFT'}})` and require exactly one changed row, transactionally; retrieve the updated batch. **No `Commission.status=PAID`, `paidAt`, wallet or ledger operation.**
2. `paySettlementBatch`: fail closed with HTTP 409 **before any write**; preserve controller signature and return a clear requirement for per-beneficiary bank confirmation and reconciliation.
3. Keep existing `generateMonthlySettlement` mechanics unchanged to minimize blast radius; separate audit needed for period uniqueness, empty auto-approved batches, stale commission inclusion, and per-recipient totals.

**Intentional disruption:** no batch can be falsely marked paid through the legacy endpoint. Operators must reconcile provider settlements outside this route until a validated replacement is deployed. Do not attempt a direct SQL status update or route around the gate. This intentionally suspends this accounting certification path; it does not cancel or reverse any real bank transfer.

## Required tests and release controls

- Run `pnpm --filter api exec jest --runInBand src/modules/commission/commission-settlement-approval.spec.ts` and `pnpm --filter api run build`.
- Verify with staging PostgreSQL two concurrent DRAFT approvals: one success / one HTTP 409; no change to linked `commission.status`, `paidAt`, wallets or `FinancialTransaction`.
- Attempt `paySettlementBatch` both with and without `referenceNum` and verify HTTP 409 **and zero database mutations**.
- Read-only reconcile existing batch counts (`PAID`/ `APPROVED`), commissions marked PAID before bank settlement, and payout references; do not list PII, bank data, access tokens or payment details.
- For true bank payments: collect external provider proof per beneficiary, exact amount/currency, event timestamp, unique settlement ID and idempotency key; use immutable ledger and durable reconciliation to mark PAID once confirmed.
- Follow EXPAND–MIGRATE–CONTRACT for any schema changes; keep devices/offline untouched. Verify actual runtime DB identity (see #217) and CI runner execution (see #147).

## Follow-up architecture

The permanent settlement service must separate `DRAFT→APPROVED→PROCESSING→PAID` with provider-confirmed evidence, idempotency by beneficiary, transactionally consistent batch and individual commission records, and compensation/reconciliation for partial payouts. Avoid treating payment-reference text supplied by an admin as independent proof.

No current fix for `createIdempotent` reference races, immutable wallet-derived balances, or batch-level 10× retries is claimed. See #299 and #307 for related ledger work.
