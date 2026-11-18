# P1 — OAuth advertiser PENDING_ONBOARDING cannot finish its existing profile

Date: 18 November 2026. Affects TAD advertiser OAuth registration after PR #295.

## Evidence → root cause

- `AuthService.exchangeOAuth` creates an `Advertiser` row with `status: "PENDING_ONBOARDING"` when a verified Google OAuth user has no existing advertiser record. It sets `needsOnboarding = true`.
- `AuthCallback` previously followed `config.onboardingPath`, which for advertiser is `/advertiser/onboarding` — the *public new-account/password signup*. The latter attempts to provision another Supabase Auth identity and another advertiser with the same email; it cannot finish an already created OAuth profile.
- PR #295 correctly made PostgreSQL authoritative for OAuth account status, but refused `PENDING_ONBOARDING` in both API status lookup and Next middleware. Therefore a legitimate first-time Google OAuth advertiser cannot access the route to complete onboarding.
- The existing legacy `OnboardingService.completeOnboarding` can mark a record ACTIVE, but its HTTP route is intentionally disabled. It is **not used** here; profile completion must not bypass commercial approval.

## Smallest safe change

1. `AdvertisersService.verifyOAuthAdvertiserStatus` returns the **DB-verified status** `PENDING_ONBOARDING` in addition to ACTIVE/PENDING_REVIEW. Identity, role, ID and email ownership checks remain identical. It **does not** grant dashboard rights.
2. Advertiser middleware recognizes this trusted status, allowing exactly `/advertiser/oauth/complete-profile`; other private routes redirect there. ACTIVE and PENDING_REVIEW cannot use it; public signup remains public for new password registrations. No new bypass in `PUBLIC_PATHS`.
3. `AuthCallback` redirects new advertiser OAuth users to the protected completion route rather than the password signup. Other portals keep their paths.
4. The new form only accepts a company name, contact name and optional phone. Its Bearer token is **reverified** by the API; it does not accept client-supplied entity ID, status, role, referral, campaign, payment, tax or approval fields.
5. The API `POST /api/v1/onboarding/advertiser/oauth/profile` is protected by global AuthGuard, `@Roles(ADVERTISER)`, DTO validation and throttling. Service verifies the authenticated user's own advertiser ID/email and uses an atomic conditional `updateMany` to move **only `PENDING_ONBOARDING → PENDING_REVIEW`**, never ACTIVE.
6. Retries are idempotent: PENDING_REVIEW returns status without overwriting business info; concurrent duplicate requests return PENDING_REVIEW if the first request wins; competing status changes fail closed. Does not create Auth identities, campaigns, wallets, invoices or payouts.

## Test coverage and evidence

- `apps/api/src/modules/onboarding/oauth-profile.spec.ts`: Nest service/controller mocks for authenticated/role restrictions, ownership, valid transition, invalid fields, duplicate retries, concurrent status changes, suspension and absence of Auth provisioning.
- `apps/api/src/modules/advertisers/advertisers-oauth-status.spec.ts`: DB status accepts PENDING_ONBOARDING only for verified advertiser identity.
- `scripts/landing.test.cjs`: routing for pending OAuth to protected profile; rejects guests, routes ACTIVE and PENDING_REVIEW correctly; checks callback uses correct route and public signup remains independent.
- `tsconfig.landing.json` and `scripts/advertiser-offer-local-gate.sh` updated.

Performed in this chat: **13/13 isolated actual service-method cases PASS**, **12/12 isolated middleware routing decisions PASS**, JS test syntax PASS, route protection and callback-source assertions PASS. These are scoped logic checks with fake identity/DB, **not** a full Nest/Next integration test.

## Mandatory QA before merge/deploy

```bash
node --test scripts/landing.test.cjs
pnpm --filter api exec jest --runInBand \
  src/modules/advertisers/advertisers-oauth-status.spec.ts \
  src/modules/onboarding/oauth-profile.spec.ts \
  src/modules/onboarding/onboarding.controller.spec.ts
pnpm --filter api run build
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm --filter @tad/advertiser run build
```

Staging acceptance matrix: new test Google account must reach the protected completion page, submit profile once, arrive at PENDING_REVIEW and never reach the private dashboard until approved by an authorized actor. Repeat submission must not duplicate Auth user/advertiser, campaigns or wallets. Test existing ACTIVE, pending approval, SUSPENDED and invalid/expired OAuth sessions, legacy password login and API outage. No live customer status mutations for QA.

**Deploy API before advertiser** (status lookup + profile endpoint first), then frontend + callback, with advertiser image rollback first. Confirm no 401/429/503 bursts and monitor p95 at 10× load; do not cache business status without a revocation strategy.

## Security boundary not covered by this PR

A route-level Next middleware decision is **not** protection for direct API clients. Although the new completion endpoint checks identity, ownership and allowable state, other existing advertiser API endpoints guarded by `@Roles(ADVERTISER)` and `TenantGuard` may not enforce `Advertiser.status` on each operation. This is recorded in issue #294 as a separate P1 policy review: determine the exact allowed statuses for campaign, billing, profile and reporting operations, then add DB-backed server-side authorization with tests for suspended/pending OAuth tokens, explicit onboarding exceptions, IDOR and 10× read load. Do not claim all advertiser APIs are status-gated after this PR.

## Known separate work

- #294: OAuth DB status authority remains P1 until real build and production/staging verification. This PR completes first-time Google OAuth registration without reverting DB-based status authorization.
- #218: RD$2,500 base and 40% validated driver code on campaign pricing remain separate finance/contract concerns.
- #260: Railway residual service missing credentials is not evidence of EasyPanel health.
- No migrations, Supabase keys, API permissions on other roles, tablet offline changes, payments or financial history touched.

Status: **code on isolated branch, real tests and deployment pending**.
