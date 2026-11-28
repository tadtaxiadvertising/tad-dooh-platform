# Financial audit actor attribution — 2026-11-18

**Severity:** P1 / financial audit integrity and accountability.  
**Status:** isolated patch, not deployed, no database migration or production writes.

## Root cause and evidence

`CommissionController` restricts its mutation routes to ADMIN with `@Roles`, but takes `approvedBy`, `revokedBy`, `generatedBy` and `paidBy` from the untrusted HTTP JSON body and forwards them directly to the service. A legitimately authenticated admin (or compromised admin session) can therefore forge the operator identity stored in commission and settlement audit fields, harming dispute investigation and financial accountability. The backend must not treat user-submitted attribution as identity.

Affected paths: `PUT /commissions/:id/approve`, `PUT /commissions/:id/revoke`, `POST /commissions/settlement/generate`, `PUT /commissions/settlement/:id/approve`, `PUT /commissions/settlement/:id/pay`. The last payment route remains fail-closed (HTTP 409, pending bank evidence) after #309; attribution is still hardened for future use.

No evidence of existing forged audit events is established.

## Smallest safe change

- `requireAdminActor(req)` verifies authenticated `req.user.role === ADMIN` and a nonblank verified `req.user.id`, failing with 403 before service mutations if missing. These properties are populated by the prior authentication/RBAC guards, not the client JSON body.
- `approveCommission`, `approveSettlement` and `paySettlement` use that actor ID, never `body.*By`.
- `revokeCommission` only uses body `reason` (trimmed validated string) and attaches the authenticated actor. `generateSettlement` accepts month/year only and constructs its `generatedBy` from the principal; rejects invalid periods.
- Legacy clients sending body-supplied attribution are tolerated but **ignored** for identity. Actual permissions remain enforced server-side.
- Existing admin commission workflows, ledger CAS, bank fail-closed and offline Player remain untouched.

## Required QA and operational verification

```bash
pnpm --filter api exec jest --runInBand \
  src/modules/commission/commission-admin-actor.spec.ts \
  src/modules/commission/__tests__/commission.controller.spec.ts \
  src/modules/commission/commission-atomic-ledger.spec.ts \
  src/modules/commission/commission-settlement-approval.spec.ts
pnpm --filter api run build
```

Test forged `approvedBy/revokedBy/generatedBy/paidBy` with synthetic authenticated admins: the stored operator ID must always match the verified principal ID. Missing/invalid principals and DRIVER/ADVERTISER direct method calls must fail before any service invocation. Staging API must also assert global NestJS authentication and `@Roles` ordering.

Do not log JWTs, token material, financial PII or bank credentials. Track actor ID and operation ID only in protected audit channels. Validate health of the active deployment and known CI runner issue #147 before merge. No real payments or production balances are affected.

## Follow-ups

- #307: commission approval CAS/ledger already merged; still needs real PostgreSQL concurrency and rollback verification.
- #309: settlement payment certification route suspended pending provider-backed evidence.
- #299: complete immutable ledger, external bank settlement and durable outbox/reconciliation.
- Consider adding immutable financial audit events with actor/source/operation ID and tamper-evident retention before enabling real money movement at scale.
