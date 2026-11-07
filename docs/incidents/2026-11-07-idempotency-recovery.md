# Incident: missing idempotency store and unsafe unknown-outcome retries

**Status:** Draft implementation; **not deployed**.  
**Date:** 2026-11-07.  
**Priority:** P1 (API availability / financial integrity).  
**Projects:** TAD API / Supabase connected us-west-2 project (deployment target verification still required).

## Evidence

- The inspected Supabase project has **no** `public.idempotency_keys`, `payment_intents`, `commissions` or `commission_ledger`. The Prisma schema and API reference all four models.
- `IdempotencyInterceptor` is active on withdrawal, bank details, commission, payment intent, payroll, driver subscription, QR and conversation endpoints; querying a non-existent idempotency table makes those operations fail.
- The pre-repair interceptor used `tap(async (...) => ...)`: RxJS did not await completion of the database update before emitting an HTTP response.
- The pre-repair interceptor used `catchError(async ...)`, returning a Promise that emits an Observable instead of reliably forwarding an error. It deleted idempotency records on all errors even if a downstream payment could have committed.
- The scheduled cleanup previously changed all in-progress records older than one hour to `isLocked=false`; it could then replay an initial `{ }` placeholder to clients without knowing whether the operation had completed.
- The original unscoped client-provided `key` was globally unique. A caller could collide with another endpoint or actor and potentially replay a response outside the original request scope.

## Proposed fix

1. Create a **new additive Prisma migration** for `idempotency_keys`, with matching TEXT/CUID model mappings, unique key and cleanup indexes; RLS enabled and `anon`/`authenticated` access revoked. No existing finance data changes.
2. Scope the persisted key to authenticated user subject, method, route path, and client idempotency header, hashing with SHA-256. Do not store raw client-supplied keys.
3. Persist a request payload fingerprint (`request_hash`) and reject mismatched retries.
4. Await DB persistence with RxJS `concatMap` before delivering successful HTTP responses.
5. Preserve a locked record after an error of uncertain side-effect status (fail closed). Do not delete, unlock, or retry as though the handler rolled back.
6. Catch unique-key races as conflicts rather than unhandled database errors.
7. Cron only deletes **completed** expired records; aged in-progress records generate an explicit reconciliation warning.

## Trade-offs and known limits

- This is an HTTP-level 24h deduplication contract, **not a substitute for permanent payment-provider idempotency keys, immutable ledgers, unique payment references, and transactional state machines**.
- If a handler fails before any mutation, the lock will still be retained. This deliberately favors safety over immediate retry availability; support must reconcile the real business transaction before any manual repair. Never auto-unlock unknown-outcome records based solely on age.
- Unknown-outcome rows can accumulate and require operational review at 10x volume. Monitor `isLocked=true` older than one hour; alert on nonzero backlog and establish reconciliation ownership before scale-up.
- Existing external-project tables, if any, must be inspected. This migration intentionally fails rather than silently modifying an unknown pre-existing table.
- Supabase's connected project may not be identical to EasyPanel's running runtime until the production project reference is checked without exposing credentials.
- This PR should remain draft until end-to-end CI and staging integration tests are executed. A successful `prisma migrate deploy` alone does not prove idempotency correctness.

## Release safety gates

1. Confirm restorable PostgreSQL backup/PITR and active app's database project reference.
2. Validate schema and migrations on staging with real Prisma generate and `prisma migrate deploy`; no destructive statements.
3. Run Jest focused tests for the interceptor (replay, changed payload, race, error propagation, held lock, result persistence) and the scheduled cleanup handler.
4. Exercise one financial mutation twice concurrently with the same Idempotency-Key: exactly one business side effect; second returns conflict until completion, then cached result.
5. Simulate a handler error **after** a business commit: retry must remain blocked until reconciliation, and no second ledger entry should be created.
6. Simulate offline queue reconnect and repeated command delivery on the player/driver; verify no duplicate payout or commission.
7. Verify Supabase RLS and least-privilege grants: role `anon`/`authenticated` cannot read the key table directly.
8. Validate API readiness, error logs, and rate of stale locks after rollout. Rollback should revert the application version without deleting the table or its history.

## Read-only production checks

```sql
SELECT to_regclass('public.idempotency_keys') AS idempotency_table;
SELECT migration_name, finished_at, rolled_back_at
FROM public._prisma_migrations
WHERE migration_name LIKE '20261107_secure_idempotency_keys%';
-- Only after the table is created:
SELECT count(*) AS unknown_outcomes
FROM public.idempotency_keys
WHERE "isLocked" = true
  AND created_at < (now() - interval '1 hour');
```

**Do not** rewrite historical migration rows, run `prisma db push`, manually unlock pending financial keys, or remove the old CRON guard to make tests pass. Related issues: #217 (30 other tables absent), #147 (CI runners), #218 (commercial value contract).
