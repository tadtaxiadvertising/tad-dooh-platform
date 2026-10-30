# Auth lifecycle: verified code paths and rollout gates

Date: 2026-10-29. Static code evidence only.

## Three distinct account creation paths

| Path | Source | Identity / persistence | State |
| --- | --- | --- | --- |
| Advertiser password onboarding | `onboarding.service.ts:onboardAdvertiser` | Prisma advertiser + campaign, bcrypt password; no direct Supabase Auth create in this method | `PENDING_REVIEW`, campaign `PENDING_PAYMENT` |
| Advertiser Google OAuth | `auth.service.ts:exchangeOAuth` | Supabase OAuth identity; finds or creates Prisma advertiser | New record `PENDING_ONBOARDING` |
| Bootstrap auth sync | `auth.service.ts:syncUsersToSupabaseAuth` | Supabase Auth `auth.admin.createUser` for existing Prisma accounts, using configured bootstrap password | Maintenance/bootstrap mechanism; not part of normal onboarding |

`auth.service.ts:login` calls `signInWithPassword` on Supabase Auth. The password onboarding path does not visibly provision that identity; bootstrap sync is separate and may create an identity with a different password. Check external triggers/jobs before declaring an end-to-end failure.

## Additional risk

`apps/api/src/modules/auth/auth.controller.ts` exposes `POST /auth/bootstrap/sync-users` with `@Public()` and a body secret. Verify the secret comparison, rate limiting, deployment exposure, rotation and retirement policy. Never print or log the secret. This is a separate security review, not permission to invoke the endpoint.

## Required decisions before fixing PR #137

1. Is self-service advertiser onboarding intended to create a usable Supabase Auth identity immediately, or wait for admin review?
2. Does `ACTIVE` mean approved account, paid campaign, or merely completed browser wizard? These states must not be conflated.
3. Which actor can approve advertiser activation? Define RBAC, ownership and transition guards.
4. What is the migration plan for already-created Prisma advertisers lacking Supabase Auth identity?
5. What is the intended behavior for Google OAuth `PENDING_ONBOARDING` users?

## Acceptance criteria

- Registration never stores plaintext passwords or leaks account existence beyond accepted product policy.
- Login works for approved new accounts without a global shared bootstrap password.
- Payment-gated campaigns remain `PENDING_PAYMENT` until verified payment.
- Unauthenticated activation is denied; cross-account activation is denied; unauthorized state transitions are denied.
- Duplicate submissions and retries are idempotent.
- Regression tests cover password and OAuth onboarding independently.
- Runtime checks and security review pass before merge/deploy.

## Status

Documented only; no tests executed and no production changes.
