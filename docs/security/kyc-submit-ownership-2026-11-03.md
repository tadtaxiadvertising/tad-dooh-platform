# KYC submission authorization: driver ownership and RBAC (2026-11-03)

## Reproducible root cause
- `POST /kyc/submit` in `main@e808358207140ed0f4d772fee6e73f24a1e3f58b` was decorated `@Public()` although the controller has `@Roles(ADMIN, DRIVER)`.
- `SupabaseAuthGuard` treats `@Public()` as optional authentication and `RolesGuard` skips RBAC on public handlers.
- `TenantGuard` compares only the route param `:id`, but this endpoint carries `driverId` in the **request body**. Any valid session, including advertiser, could pass TenantGuard without an `:id` param and submit a KYC document for a different driver.
- `KYCService.submit` updates driver `identidadVehicular` and `kyc_status` on the supplied driver ID. This is an IDOR/data-integrity risk; no exploitation has been confirmed.

## Minimum safe fix
- Remove `@Public()`; the global auth and roles guards must enforce an authenticated ADMIN or DRIVER.
- Validate `driverId` and explicitly check `req.user.entityId === body.driverId` for DRIVER. ADMIN remains authorized for operational submissions. Fail closed for all other roles or missing session/entity.
- No change to KYC storage, service, schema, onboarding, payouts, or offline capabilities.

## Tests and release constraints
- Jest verifies no public metadata, inherited RBAC, advertiser/no-session denial, cross-driver denial, missing-entity denial, own-driver success, admin success, and missing-body-ID denial without database access.
- Focused CI executes tests and strict API TypeScript. Global CI and role-based integration must be reviewed before merge.
- Because older clients may call KYC anonymously during onboarding, confirm caller authentication and entity binding in an isolated staging environment. Do not restore `@Public()` to work around a client issue.
- Existing historical PR #113 proposed a related fix using untyped requests; this PR supersedes it with typed and deny-by-default checks.
