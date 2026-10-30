# Bootstrap maintenance exposure — fail-closed gate (2026-10-30)

## Evidence and risk (P1)
`apps/api/src/modules/auth/auth.controller.ts` exposes two `@Public()` maintenance endpoints:
- `POST /auth/bootstrap/confirm-user`: can confirm an existing Prisma administrator's Supabase Auth identity and set server-owned `app_metadata.role = ADMIN`.
- `POST /auth/bootstrap/sync-users`: updates authorization metadata of existing identities based on Prisma records.

Both previously required only `BOOTSTRAP_SECRET` in a public request body. If that secret leaks, privileged Auth administration is exposed over a public route. There is no demonstrated network allowlist, operator identity, rate limit, or audit trail. This is not a claim that the secret is compromised.

## Minimal mitigation in this PR
Both service methods now reject before touching Prisma or Supabase unless `BOOTSTRAP_MAINTENANCE_ENABLED` is exactly `true`. The existing `BOOTSTRAP_SECRET` check remains mandatory. Default/undefined, `false`, and other values deny with HTTP 403. Ordinary login, OAuth, driver registration, offline player, ledger and Prisma schema are unchanged.

## Verification
- Added Jest cases for disabled/unset/mis-cased flag on both methods and retained enabled-path tests.
- Static source inspection completed. **Jest, TypeScript, staging and CI have not run successfully in this automation environment.**
- GitHub Actions issue [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147) documents independent jobs failing before executing steps on 2026-10-29. This is a separate release blocker; do not weaken CI.

## Release / operational gates
1. Confirm bootstrap endpoints are not required for normal production onboarding or login; obtain an operator recovery path.
2. Keep `BOOTSTRAP_MAINTENANCE_ENABLED` absent/false in every production environment. Do not enable it merely to unblock user signup.
3. To perform an approved, time-limited maintenance action: restrict network access, use a strong separately managed `BOOTSTRAP_SECRET`, enable flag temporarily, monitor/audit requests, disable immediately afterward, and rotate secret if exposure is suspected. **Do not print the secret.**
4. Permanent follow-up: remove public routes or replace with strongly authenticated, audited operator-only workflow plus rate limiting.
5. Run `pnpm --filter api test --runInBand`, TypeScript, lint, Prisma validation, and staging security tests before merging.
6. Verify a 403 response for both endpoints with correct secret while the flag is unset; verify existing admin maintenance behavior only in an isolated test environment.

## Rollback
Revert the feature-gate code commit(s) only if a verified recovery workflow requires it and a secure replacement is approved. No schema or data rollback is involved. Reverting re-exposes public bootstrap maintenance when the secret is configured, so prefer a controlled temporary flag and network restriction.

## Related blocker
PR [#146](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/146) is no longer open and its Auth provisioning logic is present on `main`. It creates unconfirmed identities using `admin.createUser(email_confirm: false)` but no confirmation delivery is visible in that service. Do not assume end-to-end signup/login is working until email delivery, identity ownership, and staging tests are verified.
