# Advertiser onboarding: ambiguous transaction outcome (2026-10-31)

**Priority:** P1 identity integrity. **Scope:** backend-only, no schema change, no production or Auth mutations performed by this PR.

## Verified source evidence

After [#146](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/146) merged, `OnboardingService.onboardAdvertiser` creates a new Supabase Auth user, then runs a Prisma transaction creating advertiser/campaign/video records. On **any** thrown transaction error, the old catch block called `auth.admin.deleteUser(createdAuthUserId)` unconditionally.

A transaction can commit successfully and the caller can still receive an error (e.g., lost connection after COMMIT). Deleting the Auth user then could strand an existing advertiser record with no working identity. This is an ambiguous distributed-commit outcome; a caught exception does **not** prove a rollback.

## Minimal change

On transaction failure, re-query Prisma by normalized unique advertiser email and request only `id`. Delete **only the newly created Auth user** if the lookup **explicitly returns null**. If a persisted advertiser is found, the query fails, or the result is indeterminate, **retain** the Auth identity and emit a critical reconciliation log. Never log passwords or credentials. Return the existing generic registration error.

This is a **conservative mitigation**, not an atomic cross-system transaction. A concurrent signup, replica lag, or out-of-band account linkage may still require reconciliation; do not automatically delete any Auth identity on an ambiguous result. The verification lookup is a safety check, not proof of email ownership.

## Regression cases added

- Deterministic transaction rejection with confirmed missing advertiser => compensate newly created Auth identity.
- Rejection after persisted advertiser is observable => do **not** delete.
- Persistence verification throws => do **not** delete.
- Persistence verification yields an indeterminate result => do **not** delete.
- Compensation itself fails => preserve error and log reconciliation.
- Existing advertiser and failed Auth creation => no deletion.

## Validation / release gates

- [x] GitHub source inspection of `main` and branch; code-level change limited to onboarding service, its Jest spec, and this document.
- [ ] `cd apps/api && npm test -- --runInBand onboarding.service.spec.ts` (or repository package-manager equivalent): **not executed** in this tool environment; NestJS/Jest dependencies and repository checkout unavailable.
- [ ] `cd apps/api && npx tsc --noEmit -p tsconfig.json` and `npx prisma validate`.
- [ ] Staging integration: simulate an error **after DB commit** and verify Auth user retained; simulate verified rollback and verify compensation; test concurrent same-email requests and reconcile any orphans.
- [ ] End-to-end advertiser email verification and login; `admin.createUser(email_confirm:false)` does not establish that confirmation mail was delivered.
- [ ] GitHub Actions CI must actually run test steps; see [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147).

## Rollback / reconciliation

Code rollback: revert this PR's onboarding-service and test commits after review. That restores unconditional deletion and its original identity-loss risk, so prefer a forward fix if possible. No DB rollback is needed.

Operational reconciliation (authorized operator only): inspect Auth identity ID, advertiser email and Prisma transaction records in a secure environment; determine whether a row committed before deciding whether to link, disable or delete an orphan. Do not infer identity ownership from email alone, do not bulk-delete, and do not run manual production repair without approval and an audit trail.

**Non-goals:** offline player, ledger/idempotency, driver auth migration, frontend UX, production migration or deploying changes.
