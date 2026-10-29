# Driver authentication schema gap — 2026-10-29

Status: **verified source-code audit; implementation pending**.

## Evidence
- `apps/api/prisma/schema.prisma`: `Driver.phone` is unique; `Driver` has **no** Supabase Auth user ID column or relation. `User` is a separate email-based admin model.
- `apps/api/src/modules/auth/dto/login.dto.ts`: `email` is required and decorated `@IsEmail()`.
- `apps/api/src/modules/auth/auth.service.ts`: driver registration persists a Driver with phone/password but does not provision Supabase Auth; login authenticates with `signInWithPassword({ email, password })` then guesses driver by `email.split("@")[0]` or full email.
- `JwtStrategy` validates bearer tokens via Supabase `auth.getUser` and trusts server-owned app_metadata for role/entityId.

## Impact
Newly registered phone-only drivers have no supported login path. Matching a Driver to the local part of an email is not a proof of phone ownership and risks cross-identity authorization. Do not patch by accepting arbitrary phone strings as email aliases.

## Recommended expand → migrate → contract
1. **Expand**: introduce nullable unique `Driver.authUserId` (mapped to `auth_user_id`) only after confirming production column naming, indexes and existing data; no destructive migration.
2. **Migration/backfill**: inventory legacy drivers and Auth identities; reconcile one-to-one mappings with explicit ownership verification. Never infer identity from email prefix.
3. **Register**: canonical E.164 phone and rate limits; provision Auth identity with explicit verification policy; transactionally create Driver with authUserId; compensate only identities created by that attempt, log cleanup failures.
4. **Login**: introduce a separate validated phone/password flow, authenticate via Supabase, lookup Driver by exact authUserId and reject mismatches; set app_metadata only after ownership verification and refresh session claims.
5. **Contract**: remove legacy phone-by-email guessing only after compatibility tests and rollout monitoring.

## Release gates
- Check actual driver portal request/response consumers and country/phone assumptions.
- Test duplicate, concurrent, failed and retried signup, phone verification, Auth/DB partial failure, wrong identity mapping, legacy accounts, role separation and pairing.
- Execute Jest/strict TS/Prisma validate/migration dry run/staging E2E; review rollback and operational reconciliation.
- Do not run production migrations or mutate Auth identities as part of this document.
