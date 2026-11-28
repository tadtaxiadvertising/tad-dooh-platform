# P1 — Commercial account status must be checked on the API, not only in Next

Date: 18 November 2026. Origin: incident #294. Release: isolated draft PR until verified.

## Evidence and root cause

Before this change, `SupabaseAuthGuard` verified a JWT and populated `request.user` with a role/tenant; `RolesGuard` checked RBAC; `TenantGuard` checked a route parameter. None of these guaranteed that an `ADVERTISER` had **current `Advertiser.status = ACTIVE`** in PostgreSQL. The Next middleware checked current status for browser navigation, but an authenticated client can request the protected REST API without visiting Next pages. This leaves direct advertiser API endpoints (portal, invoices, campaign/reporting APIs) callable by identities whose role metadata still says ADVERTISER but whose business account is pending/suspended.

There is no evidence of a real customer data breach. The defect is a **verified missing server-side authorization check**, distinct from the separately discovered `portal-requests` tenant IDOR concern.

## Minimal safe implementation

A new `AdvertiserAccountStatusGuard` is registered as an `APP_GUARD` **after** `SupabaseAuthGuard` and `RolesGuard`, before `ThrottlerGuard`.

- Public endpoints are unaffected (the guard checks `@Public`).
- ADMIN/DRIVER/device roles are unaffected. Missing identity is still rejected by the *earlier* authentication guard on protected routes; the status guard does not authenticate or grant any role.
- Every private `ADVERTISER` request uses the **existing** `AdvertisersService.verifyOAuthAdvertiserStatus`, which reads the current row by verified `entityId`, checks role and email, and rejects deleted/suspended/unknown statuses.
- Default authorized commercial status is **ACTIVE only**. The new `@AllowAdvertiserStatuses` decorator is applied to precisely two methods: `GET /advertisers/session/status` (ACTIVE, PENDING_REVIEW, PENDING_ONBOARDING) and `POST /onboarding/advertiser/oauth/profile` (PENDING_ONBOARDING, PENDING_REVIEW for idempotent retries). It is not a public/auth bypass, only a status exception.
- No HTTP-body `advertiserId` or JWT metadata status is trusted. No cross-request cache for revoked status, DB migrations or financial writes.

**10× effect:** One extra narrow PostgreSQL `findUnique` per protected advertiser request. Existing legacy password sessions are already DB-verified earlier in the global authentication chain, so a future request-scoped deduplication may reduce that redundancy; do not introduce a cross-request cache that allows suspended accounts to continue using stale permission. Monitor p95 and database QPS at 10×.

## Verification evidence

- Unit suite authored: `apps/api/src/modules/auth/guards/advertiser-account-status.guard.spec.ts`, including default-active, blocked PENDING states, exceptions, suspension, DB outage, public routes, ADMIN/DRIVER unaffected and forged active metadata.
- Existing `advertisers-oauth-status.spec.ts` covers the service's verified identity and DB lookup.
- Independent JS execution of the actual guard's `canActivate` body extracted from GitHub (TS annotations removed; reflector/status service mocked): **14/14 cases passed**, including successful ACTIVE request, fail-closed on backend errors, both exception lists, no queries on ADMIN/DRIVER/public.
- Structural source checks passed: guard APP_GUARD registration after roles; only the two exceptions annotated; no cache; QA runner includes the spec.

**NOT executed:** actual Nest Jest/DI, strict TS compiler, API Docker build for this branch, EasyPanel runtime, or direct endpoint E2E. This is *implemented pending verification*, not 'verified in production'.

## Required gate

```bash
pnpm --filter api exec jest --runInBand \
  src/modules/auth/guards/advertiser-account-status.guard.spec.ts \
  src/modules/auth/guards/supabase-auth.guard.spec.ts \
  src/modules/advertisers/advertisers-oauth-status.spec.ts \
  src/modules/onboarding/oauth-profile.spec.ts
pnpm --filter api run build
bash scripts/advertiser-offer-local-gate.sh
```

Staging tests: for real **test-only** OAuth and legacy JWT sessions, invoke **API endpoints directly**, not only through the browser:
- ACTIVE own advertiser → allowed, another advertiser → denied by ownership.
- PENDING_ONBOARDING → only status + OAuth profile completion; no dashboard, campaign/invoice.
- PENDING_REVIEW → status and idempotent profile retry only, no commercial data.
- SUSPENDED/deleted/expired session → denied everywhere, even if metadata says ACTIVE.
- ADMIN/DRIVER/tablet public flows do not regress; GitHub or Railway deployment success alone is not proof.

**Rollout:** deploy API first in a controlled environment, check Nest DI startup, JWT contracts and direct routes; advertiser remains unchanged by this PR. Roll back API to previous image if valid ACTIVE users lose access. Do not bypass status checks, disclose tokens or copy production secrets. Monitor latency, 401/403, 429 and DB errors.

## Separate P1 finding

`TenantGuard` currently extracts only `params.id`. `portal-requests/advertiser/:advertiserId` and `portal-requests/driver/:driverId` use this guard but have no `:id`; this is an ownership bypass independently of the advertiser status gate. Additionally `POST /portal-requests` is public and accepts claimed owner IDs. Fix and regression-test in a **separate** PR, including client compatibility. Do not close issue #294 until API/direct-route and EasyPanel checks are verified.
