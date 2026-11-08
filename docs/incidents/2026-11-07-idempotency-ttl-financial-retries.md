# Financial idempotency after the 24-hour review horizon

**Date:** 2026-11-07  
**Status:** Proposed, not yet deployed; code and tests in draft PR.  
**Severity:** P1 data-integrity risk (not evidence of a duplicated production payout).  
**Incident owner:** API/Finance engineering.  

## Evidence → hypothesis → root cause

1. The current API `IdempotencyInterceptor` stores a scoped SHA-256 key for each mutating operation, with `expiresAt` set to 24 hours after creation.
2. If the record exists and is completed but has passed `expiresAt`, the interceptor deletes it and re-executes the downstream handler.
3. `BiScheduler.handleIdempotencyCleanup` also deletes completed rows after 24 hours, regardless of the financial criticality of the route.
4. `WalletService.withdraw()` can deduct `available_balance` and create a new withdrawal transaction. It does not receive the HTTP idempotency key as a persistent ledger reference. The transaction is atomic for a *single request* but does not itself prove cross-request deduplication.
5. A client with an offline queue can retry later than 24 hours. At that point the same key may be accepted as a new request, making a second deduction possible if sufficient funds remain.

**Root cause:** conflating the expiry of an operational response cache with permission to repeat a financial side effect. This is a **potential** duplicate-effect risk, not a claim of observed financial duplication.

## Proposed smallest safe change

- Always replay the existing completed result for the same user, route, method, header and payload fingerprint, regardless of the `expiresAt` horizon.
- Preserve unknown-outcome locks. If a completed record has an invalid or missing response, reject the replay and require reconciliation rather than invoking the handler.
- Stop automatically deleting *any* completed HTTP idempotency record until a durable dedupe tombstone mechanism is implemented and verified.
- Keep the 04:00 SRE check: count old locked rows and check (index-backed `findFirst`) whether completed expired rows await archival. Report alert codes only; never print business payloads or raw keys.
- No changes to existing balances, commissions, payout ledgers, Stripe/Azul references, or database schema.

## Trade-offs / 10x

Preserving full responses indefinitely is **not** the final archival solution. It deliberately favors financial integrity and safe offline retries over short-term storage savings. It may increase PostgreSQL table/index size at 10x financial traffic.

Track issue #223: design a permanent, compact unique-key tombstone whose insertion is transactionally coupled to response archival. Do not delete original rows before a verified migration, restore test, and finance/legal retention approval.

## Deployment gates

1. Verify application project identity and database PITR/backup. Do not print connection strings.
2. Run API Jest regression for expired completed replay, expired invalid result, duplicate concurrent submission, downstream failure, and Cron retention.
3. Generate Prisma client and run TypeScript strict check; confirm there are no accidental schema migrations in this PR.
4. Staging test: submit a successful withdrawal with a stable `Idempotency-Key`; simulate elapsed horizon using an isolated fixture; retry the same key and assert exactly one ledger mutation and the original HTTP result.
5. Check permission boundaries and that a different user or changed amount cannot reuse the same record.
6. Monitor table size and stale locks (the Cron should never silently release or delete their evidence).
7. **Only after CI/staging verification**, merge and deploy. Avoid destructive production migrations. Reconcile any already expired/deleted keys against immutable business records before claiming historical exactly-once guarantees.

Related: #217 (schema drift), #221 (offline rejected action persistence), #223 (archive/tombstones), #147 (CI runners).

## Read-only queries

```sql
SELECT count(*) FILTER (WHERE "isLocked" = true) AS unresolved,
       count(*) FILTER (WHERE "isLocked" = false AND expires_at < now()) AS review_expired
FROM public.idempotency_keys;

SELECT pg_size_pretty(pg_total_relation_size('public.idempotency_keys')) AS disk_size;
```
