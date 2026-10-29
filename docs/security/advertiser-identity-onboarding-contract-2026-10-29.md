# Identity contract blocker — advertiser onboarding

Date: 2026-10-29. Static source inspection only; no runtime test.

## Evidence

- `apps/api/src/modules/onboarding/onboarding.service.ts`: `onboardAdvertiser` creates a Prisma `advertiser` with bcrypt password and status `PENDING_REVIEW`, and a campaign `PENDING_PAYMENT`. No Supabase Auth user is created in this method.
- `apps/api/src/modules/auth/auth.service.ts`: `login` authenticates using `anonClient.auth.signInWithPassword` (Supabase Auth), then looks up the Prisma advertiser by email, injects `app_metadata.role = ADVERTISER` and `entityId` on the Supabase user.
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`: validates Supabase access token and derives `req.user = {id,email,role,entityId}`.
- `apps/advertiser/pages/advertiser/onboarding.tsx`: on successful signup stores `advertiserId` locally, then calls unauthenticated `POST /onboarding/advertiser/:id/complete` to mark ACTIVE and redirects to login.

## Root-cause hypothesis

The onboarding write path and login identity provider may be disconnected: creating a Prisma advertiser does not, in the inspected service, provision a Supabase Auth identity. The login path requires such an identity. Check for database triggers, async provisioning jobs, or external hooks before concluding the user cannot sign in.

## Security invariant

A caller-supplied advertiser ID alone must never authorize status transitions. The current fail-closed controller mitigation prevents this operation but blocks normal completion; it is not the final product flow.

## Proposed implementation sequence

1. Confirm whether Supabase Auth provisioning occurs elsewhere; inspect migrations/triggers/jobs and existing real account lifecycle without exposing PII.
2. Define authoritative lifecycle: registered → pending review/payment → approved/active, according to product rules. Do not equate completion of a browser wizard with payment or administrative approval.
3. Provision and link Supabase Auth identities safely and idempotently, or adapt login contract only after verifying the current authentication design. Avoid storing or logging plaintext passwords.
4. Make status transitions server-authorized, checking role, ownership, and prerequisites. Use atomic state transition with idempotent retry semantics.
5. Update frontend to display pending review/payment accurately; avoid silently swallowing completion errors.
6. Add integration tests for first-time registration/login, failed provisioning, duplicate email, cross-account activation, pending payment, and replay.
7. Roll out behind feature flag or controlled cohort if the live flow is already in use.

## Stop conditions

Do not merge the temporary deny-all mitigation as the final fix. Do not touch payment, campaigns, database schema, or production configuration without verified contracts and a migration/rollback plan.

## Verification

Static inspection confirmed. No local typecheck, Jest, e2e or production checks performed.
