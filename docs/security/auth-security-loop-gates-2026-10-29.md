# Security loop: authentication findings and release gates

Date: 2026-10-29. Static review; no runtime test results.

## Findings

### P1: Bootstrap maintenance endpoints publicly routable
- Evidence: `auth.controller.ts` marks `POST auth/bootstrap/confirm-user` and `POST auth/bootstrap/sync-users` with `@Public()`.
- Mitigation present: `auth.service.ts` checks `BOOTSTRAP_SECRET` and denies when absent or mismatched.
- Impact: if the secret is exposed, callers may mutate Supabase Auth users; `confirmUserByEmail` sets app metadata `role: ADMIN`. Rate limiting and operational exposure not yet verified.
- Proposed permanent action: retire public bootstrap routes after migration; if maintenance is required, use restricted operator authorization and auditable workflows. Do not remove recovery access before confirming an alternative.
- Tests: invalid/missing secret denies; unauthorized roles deny; no role escalation; all calls audited. **Not executed.**

### P2: Session cookie domain deployment dependency
- Evidence: `auth.controller.ts` uses `process.env.COOKIE_DOMAIN || "tad.do"`; active portal deployment uses `ibusiness.com.do` subdomains.
- Impact: browsers may reject a cookie with an unrelated Domain attribute; login persistence may fail.
- Recommendation: verify deployment `COOKIE_DOMAIN` and cookie scope, then choose a host-only default or explicitly configured shared parent domain according to actual cross-subdomain requirements. Do not change without an integration test.
- Test: login through each actual portal hostname, inspect Set-Cookie, confirm cookie persistence and authorization.

### P2: Cookie maxAge unit mismatch — corrected in this branch
- Evidence: Express cookie `maxAge` expects milliseconds, original code supplied `3600 * 24 * 7`.
- Fix: `1000 * 60 * 60 * 24 * 7`, plus Jest regression test.
- Verification: pending.

### P1: Advertiser password onboarding lacks visible direct Supabase Auth provisioning
- Evidence: `onboarding.service.ts` writes Prisma records and bcrypt hash; `auth.service.ts:login` authenticates via Supabase Auth.
- Caveat: other external triggers may exist; bootstrap sync and OAuth flows are separate.
- Recommendation: decide account lifecycle before implementing identity creation; do not create accounts with shared bootstrap passwords.

## Stop conditions before merge

1. Execute Jest and TypeScript in API and advertiser workspaces.
2. Confirm integration with parallel UX branch and no incompatible frontend changes.
3. Verify auth lifecycle against a non-production Supabase environment.
4. Review the fail-closed advertiser activation endpoint's business impact.
5. Resolve the public bootstrap maintenance exposure with an approved recovery path.
6. Verify session cookie domain on each deployed hostname.
7. Keep production and main unchanged until all gates pass.
