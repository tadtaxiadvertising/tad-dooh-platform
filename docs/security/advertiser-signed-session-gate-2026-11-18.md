# Security QA — Advertiser middleware cannot trust unsigned JWT claims

Date: 2026-11-18  
Severity: **P1** (frontend auth boundary bypass under issuer outage; no verified data disclosure).  
Scope: `apps/advertiser/middleware.ts`, a read-only signed session check in the existing API, and regression tests.

## Evidence → root cause

The old middleware called `decodeTokenRole(token)`, directly parsed the base64 JWT payload, and initialized `let role = quickRole`. On a Supabase outage, `catch { role = quickRole }` effectively authorized an **unverified** `app_metadata.role = ADVERTISER` claim for private frontend routes. The root and login redirects trusted the same claim. A browser may forge a JWT-shaped cookie; its role is not evidence of authentication.

The API itself uses independent guards. We have **not** demonstrated data access beyond the frontend route; hence this is a P1 security-boundary defect rather than a confirmed data breach.

Complication: two legitimate session issuers exist:
1. OAuth via `@supabase/ssr` / `supabase.auth.getUser()`, which verifies the Supabase identity.
2. Legacy password login via `AdvertisersService.login`, which issues a separate HS256 signed JWT with `sub = Advertiser.id`, `app_metadata.role = ADVERTISER` and `app_metadata.entityId`.

Simply removing the local decode and requiring a Supabase canonical cookie would break legitimate legacy sessions. Offline driver/tablet authentication is out of scope; this change only affects the advertiser portal.

## Minimal safe design

**Backend (deployed first):** add `GET /api/v1/advertisers/session` with `@Public` (anonymous callers may present a token) and `@Throttle`. This endpoint accepts only an Authorization Bearer JWT, verifies its **HS256 signature and expiration** against the same configured key used by the legacy login, checks role and entity ID, and retrieves the advertiser's **current email/status** from PostgreSQL. It returns only `{ role, advertiserId, status }` for `ACTIVE` or `PENDING_REVIEW`. It returns 401 for invalid, forged, expired, deleted or suspended sessions. No token or secret is logged.

**Advertiser Next middleware (deployed second):**
- OAuth: canonical Supabase cookie → `getUser()`; allow only a verified `ADVERTISER` role, and never use local JWT claims as fallback.
- Legacy login: `sb-access-token` → trusted API's session endpoint via server-configured backend URL. Network failure, invalid token, 401, malformed payload, or missing service = deny private route.
- `PENDING_REVIEW` still goes to onboarding; suspended/unknown statuses deny access.
- Landing, legal pages, login, callback, signup and static/PWA assets remain public.
- No `JWT_SECRET` is copied to the advertiser frontend or bundled into JavaScript. No DB schema changes, migrations or financial writes.

## Verification

Added tests to `scripts/landing.test.cjs` for anonymous, malformed, forged, signed legacy, pending-review, verified Supabase OAuth, network outage and exact public paths.

Added `apps/api/src/modules/advertisers/advertisers-session.spec.ts` for JWT signature, expiration, role, entity ownership, DB lookup, absent account, mismatched email, pending-review/suspension and bearer header. The local pricing release gate now includes the Jest spec. Advertiser strict TypeScript compilation now includes `middleware.ts`.

Independent checks completed in this session:
- **15/15 source-bound security invariants passed** on the changed GitHub source.
- **8/8 isolated runtime scenarios passed** exercising the actual middle-tier verifier method with TypeScript annotations removed and a mocked, deterministic HTTP client/URL facade. This is not a NestJS runtime, actual JWT cryptography, or a full Next middleware execution.

**Not executed:** the workspace's actual Jest/Node tests, TypeScript compiler for both apps, Next/Nest builds or end-to-end browser login. No production API or cookies were touched.

Execute from a checkout with Node.js 22, pinned pnpm and installed dependencies:

```bash
node --test scripts/landing.test.cjs
pnpm --filter api exec jest --runInBand \
  src/modules/advertisers/advertisers-session.spec.ts \
  src/modules/advertisers/advertisers-referral.spec.ts
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm --filter api run build
pnpm --filter @tad/advertiser run build
```

## Release and rollback

1. Run full tests in an authorized **non-production** checkout (with isolated DB mocks only).
2. Deploy **API first**. Verify signed-session endpoint using a test-only account and redact tokens; verify invalid Bearer returns 401. Do not paste JWTs in public issues.
3. Deploy **advertiser second**. Browser smoke: legacy login, OAuth login, fresh guest access, pending-review redirect, suspended-account denial, expired/tampered cookies and simulated Supabase/API outage.
4. Confirm the API and advertiser both serve the new revisions before accepting release. A frontend-only deployment could block legacy users because the backend endpoint would not yet exist.
5. Roll back **advertiser first** if valid login fails; keep the new API endpoint (read-only) until no clients use it. Never revert the API first while middleware depends on it.

## 10× and residual risks

- The secure backend verification adds a network round-trip and a small advertiser-row lookup per protected legacy navigation. Measure p95 latency, 401/503 counts and DB load at 10× traffic before optimizing; never cache unsigned roles.
- Existing password-login JWT lacks an explicit issuer/audience. This release validates the current historical format without breaking it; a future **versioned** issuer/audience migration should be planned separately.
- OAuth account status may depend on Supabase's metadata synchronization; ensure suspension/revocation is tested end-to-end and do not infer success from a 200 HTML shell.
- Rate limiting is globally applied via the existing `ThrottlerGuard`.

**Status: implemented on isolated branch, awaiting full verification. Do not call production secure until tests and deployment order are proven.**
