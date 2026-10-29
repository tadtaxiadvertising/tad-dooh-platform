# Driver identity provisioning contract — 2026-10-29

Status: **design only / not implemented**. No production Auth or database mutation is authorized by this document.

## Evidence on main
- `POST /auth/driver/register` accepts `name, phone, password` and writes a Prisma Driver, but creates no Supabase Auth identity.
- `POST /auth/login` uses `LoginDto.email` (`@IsEmail`) and `auth.signInWithPassword({ email, password })`; the driver lookup compares the Supabase email/local-part to Prisma phone. This is not a trustworthy identity link.
- `JwtStrategy.validate` requires `supabase.auth.getUser(token)` and reads server-controlled `app_metadata.role/entityId`.
- Existing users and device pairing must not be disrupted.

## Decision gates before implementation
1. Choose a **canonical phone format** (E.164 with country code) and define migration for legacy phone strings; assess uniqueness and collisions. Do not infer ownership from email local-parts.
2. Confirm Supabase Auth phone/password settings, phone verification requirements, SMS delivery/cost, and existing user records. See [Supabase phone/password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).
3. Define a stable, server-owned mapping between `auth.users.id` and Prisma Driver.id (schema audit first); never trust client-supplied entityId or user_metadata.
4. Register identity and Driver as a recoverable, idempotent workflow: preflight duplicates, create Auth user, write Driver in DB transaction, compensate only the newly created Auth user if DB fails; emit structured orphan-reconciliation signal on cleanup failure. Handle concurrent requests and retries.
5. Define activation and verification policy for phone ownership. Do not mark an unverified phone as trusted or grant pairing rights automatically.
6. Implement separate driver sign-in contract (`phone` + `password`) or a deliberate migration to email login. Bind the Supabase identity to the exact Driver record before setting `app_metadata`; refresh the session after claims update.
7. Review driver portal consumers of `register`, `login`, cookies, and pairing tokens before changing response shapes. Preserve legacy login paths until migration is verified.

## Required regression and release gates
- Valid signup + sign-in, duplicate and concurrent signup, invalid phone, invalid password, mismatched phone ownership.
- Auth create failure => no Driver; DB failure => Auth compensation; cleanup failure => observable reconciliation.
- Cross-driver authorization/IDOR, claims refresh, missing or stale claims, phone verification and rate limiting.
- Existing ADMIN/ADVERTISER email login unchanged; DRIVER pairing works only for verified, authorized driver identity.
- Jest, TypeScript strict, staging E2E and rollback plan; no destructive production migrations.

## Known risk
The current driver registration may report success even though the driver cannot authenticate through the current email-only API. Do **not** claim the end-to-end driver journey works until tested.
