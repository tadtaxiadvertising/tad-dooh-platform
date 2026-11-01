# P1 — Pairing JWT accepted as an API user session (2026-11-01)

## Verified source evidence on `main`
1. `apps/api/src/modules/auth/auth.service.ts` issues hardware QR pairing JWTs with `JwtService.sign({ sub: driverId, type: "pairing" }, { expiresIn: "5m" })`.
2. `apps/api/src/modules/auth/auth.module.ts` configures `JwtModule` with `SUPABASE_JWT_SECRET || JWT_SECRET`.
3. `apps/api/src/modules/auth/guards/supabase-auth.guard.ts` uses the same secret for local `jwt.verify`, previously without audience or token-purpose checks. It mapped `sub` to `request.user.id` and defaulted the role to `GUEST`.
4. `apps/api/src/app.module.ts` registers this guard globally; routes without `@Roles` rely on authentication alone.

**Consequence:** a valid five-minute QR pairing token can pass the local session check and populate `request.user` on protected routes that do not enforce role metadata. This is cross-purpose token acceptance, not evidence of a compromised secret or a confirmed production exploit.

## Minimal mitigation in this draft PR
- Reject `type: "pairing"` tokens before cache lookup, network fallback or development bypass, including when a malicious caller adds an `aud` claim. An unverified claim is used **only to deny**, never to authorize.
- Require standard Supabase user-session claims on locally verified JWTs: `aud: "authenticated"`, nonempty `sub` and `session_id`, and top-level `role: "authenticated"`. TAD RBAC remains in server-controlled `app_metadata`.
- Preserve network verification for valid Supabase tokens, existing global RBAC, public route semantics, and the separate pairing protocol.
- No changes to offline-first player, ledger, database schema, idempotency or production.

Supabase documentation confirms `aud`, `sub`, `role` and `session_id` as required Auth JWT claims: [JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields). Validate the actual deployed token profile in staging before merge.

## Test evidence and limits
New Jest spec `supabase-auth.guard.spec.ts` defines nine cases:
- Reject real pairing token on protected route.
- Reject pairing token even with a forged session audience.
- Ignore pairing identity on public route.
- Reject locally signed non-session JWT lacking audience.
- Accept a valid Supabase-shaped access JWT.
- Reject a token without a subject.
- Reject a token with audience but without a Supabase session ID.
- Reject a non-user role even with audience and session ID.
- Preserve Supabase network verification when a valid token is signed with a different key.

**Status:** test code added; Jest, TypeScript and staging E2E have **not yet produced passing results**. Static connector read-back is not a replacement for runtime tests. Earlier run [41179854949](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41179854949) failed with no executable steps. On 2026-11-01, this PR triggered [CI Quality Gates 41282584585](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41282584585) and [Docker Image CI 41282584618](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41282584618): checkout/setup steps completed and jobs entered execution. **Final conclusions are pending**; see [issue #147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147).

## Release gates
1. Restore GitHub Actions runner execution; run `pnpm --filter api exec jest src/modules/auth/guards/supabase-auth.guard.spec.ts --runInBand` and `pnpm --filter api exec tsc --noEmit`.
2. On staging, verify genuine Supabase access JWTs (password + OAuth, HS256 and any configured asymmetric signing) have the expected audience and continue working.
3. Verify pairing QR flow through its dedicated endpoint, and ensure a QR token cannot call a protected API route.
4. Check `@Public` endpoints still allow unauthenticated access without accepting pairing JWTs as a user identity.
5. Inspect route inventory for endpoints relying solely on authentication and review least privilege.
6. No merge/deploy until the above pass; review independently of PR #167 (SimulationController ADMIN RBAC) and #166 (onboarding compensation).

## Rollback
Revert the guard and test changes if legitimate Supabase sessions are rejected, but note that a straight revert reintroduces token-purpose confusion. Prefer a forward fix that preserves explicit purpose separation while accommodating verified legacy audience claims. No database rollback required.
