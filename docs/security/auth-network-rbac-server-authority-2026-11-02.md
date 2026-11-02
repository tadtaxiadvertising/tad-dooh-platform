# P1: server-authoritative RBAC in Supabase network fallback (2026-11-02)

## Evidence from `main`
- `apps/api/src/modules/auth/guards/supabase-auth.guard.ts` first verifies local JWT signatures when possible, then falls back to `supabase.auth.getUser(token)` when local verification is unavailable or fails.
- In the network-verified path, the guard previously selected `role` and `entityId` from `data.user.app_metadata` **or from decoded claims of the presented JWT**. A JWT can retain older claims after a server-side role/entity revocation. Missing current server metadata must never be replaced by older JWT claims.
- `RolesGuard` consumes `request.user.role`; this is an authorization boundary, not a display preference.

## Minimal change
Only the network-verified path now derives application RBAC from the `getUser` response's `app_metadata`. Missing role fails closed to `GUEST`; missing entity ID becomes `null`. The existing local verification, pairing token rejection, public route semantics, 10-second session cache, and offline-first device flows are unchanged.

## Regression tests added
1. A valid server response demoting a user to `ADVERTISER` overrides an older JWT claim of `ADMIN`.
2. An empty server `app_metadata` cannot resurrect an `ADMIN` role/entity ID from older JWT claims.

## Verification gates
- Run `pnpm --filter api test --runInBand src/modules/auth/guards/supabase-auth.guard.spec.ts`.
- Run `pnpm exec tsc --noEmit --project apps/api/tsconfig.json` and repository lint/format checks.
- Staging: verify email login and OAuth, current ADMIN/ADVERTISER/DRIVER roles, demotion, role removal, and session refresh. Confirm that `GUEST` is denied by protected RBAC endpoints.
- Inspect CI Quality Gates, including unrelated audit and Playwright blockers; do not treat a passing unit test as full release approval.

## Residual risks and separate work
- Locally verified, still-unexpired signed JWTs retain their signed app_metadata until expiry; this patch does not implement immediate global revocation. The 10-second session cache can also briefly retain authorization. Strong revocation requires separate design and staging tests.
- PR #166 addresses a distinct onboarding Auth/Prisma transaction compensation risk. Do not duplicate it.
- Issue #171 tracks critical Next.js dependency vulnerability (GHSA-2464-fhr4-w9xw); upgrade to patched Next.js with a regenerated lockfile before release. This PR does not fix the dependency.
- The PR #146 onboarding path still needs email-confirmation delivery and end-to-end staging verification.

## Rollback
Revert this PR's guard and test changes; no database migrations, secrets, production deployments, ledger changes, or offline device logic are involved. Reverting restores the older JWT fallback risk, so prefer forward-fixing if a compatibility issue appears.

**Execution status:** code and tests committed; no Jest/TypeScript run was performed in this connector-only environment. No production mutation or merge.
