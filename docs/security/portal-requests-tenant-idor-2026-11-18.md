# P1 — Portal Requests: tenant IDOR and untrusted public owner

Date: 18 November 2026. The finding is based on the executable source in `main` and is not a confirmed production breach.

## Evidence → root cause

`TenantGuard.canActivate` previously checked only `request.params.id` and returned `true` when absent. But `PortalRequestsController` applies `@UseGuards(TenantGuard)` to `GET /portal-requests/advertiser/:advertiserId` and `GET /portal-requests/driver/:driverId`. Thus valid authenticated ADVERTISER or DRIVER accounts could select a *different* tenant ID in those route parameters without the ownership guard preventing it.

Additionally `POST /portal-requests` was `@Public` and `PortalRequestsService.create` trusted `body.advertiserId`, `body.driverId` and optional `body.campaignId`. Anonymous clients could create PENDING requests attributed to accounts they did not control. This is a data-integrity/authorization defect; no money is transferred by this endpoint, but request approval may have downstream side effects.

## Minimal safe changes

1. Extend `TenantGuard` to check **every present** `:id`, `:advertiserId`, `:driverId`. For named role IDs, require the matching role and exact `user.entityId` and deny blanks. ADMIN retains its explicit override. Existing `:id` semantics and parameterless KYC controllers remain unchanged (controller must check body ownership).
2. Remove `@Public` from `POST /portal-requests`. Require `ADMIN`, `ADVERTISER` or `DRIVER`, throttled 10/min. This is a deliberate security contract change: anonymous callers must no longer create records using someone else's identifiers.
3. For ADVERTISER and DRIVER requests, server sets the owner ID **from the verified session**, rejecting inconsistent IDs, cross-role owner fields and missing entity. Only ADMIN can specify a different tenant (existing privileged workflow).
4. An advertiser may reference an existing campaign only after `PortalRequestsService.advertiserOwnsCampaign` confirms that `Campaign.advertiserId` equals the verified advertiser entity. Drivers cannot attach arbitrary campaign IDs.
5. Both raw-fetch client POSTs (advertiser campaign creation and requests list) now send `Authorization: Bearer <session token>`; the shared `PortalRequestCenter` uses the existing authenticated Axios interceptor.
6. New Nest regression suites cover tenant routing, controller owner attribution, wrong-role/cross-account requests, privileged admin behavior and DB-owned campaign IDs. The local QA gate includes all suites.

## Evidence run

**21/21 deterministic isolated executions** of actual code extracted from GitHub: 11 TenantGuard decisions and 10 controller creation decisions (with service/mock infrastructure), plus structural checks for `@Roles`, no `@Public`, both frontend Bearer headers and gate inclusion. These are not Jest or full Nest runtime tests.

**Not executed:** workspace Jest, TypeScript and Next/Nest Docker builds, actual login/session, direct HTTP tests on EasyPanel or changes to production data.

## Mandatory QA

```bash
pnpm --filter api exec jest --runInBand \
  src/modules/auth/guards/tenant.guard.spec.ts \
  src/modules/portal-requests/portal-requests.controller.spec.ts \
  src/modules/portal-requests/portal-requests-ownership.spec.ts \
  src/modules/auth/guards/advertiser-account-status.guard.spec.ts
pnpm --filter api run build
pnpm --filter @tad/advertiser run build
bash scripts/advertiser-offer-local-gate.sh
```

Staging smoke with test users:
- ADVERTISER A GET own requests 200; GET ADVERTISER B 401/403; POST with B ID 403; no-auth POST 401; POST with campaign belonging to B 403.
- DRIVER A GET own requests 200; GET DRIVER B 401/403; POST with advertiserId or another driverId 403.
- ADMIN can still GET and create requests on authorized tenants, and approval flows have not changed.
- Confirm campaign form, advertiser requests form and shared PortalRequestCenter POST work with authenticated sessions. No customer data should be altered for testing.

**Deployment:** API first, frontend advertiser second. Roll back frontend before API if compatibility fails. Do not replace the AuthGuard with public bypass. Monitor 401/403, 429, p95 and request creation rate at 10×.

## Separate risks to review

- Request approval handler has potentially sensitive campaign/media side effects and should undergo an independent validation-before-mutation and idempotency review; this PR does NOT change it.
- `TenantGuard` on KYC routes with no `:id` still relies on KYC controller's own explicit `body.driverId` ownership check; do not assume this guard is a universal resource ownership policy.
- Pricing/commission issue #218, Railway config issue #260 and account-status rollout #294 remain independent.

**Status:** implemented in an isolated branch; full QA and production confirmation pending.
