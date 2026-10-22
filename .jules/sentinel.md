## 2026-03-30 - Fix SQL Injection in Rate Limiting Queries
**Vulnerability:** Raw SQL template interpolation (`$executeRawUnsafe`) was used in rate limiting queries in `TelemetryService`, interpolating `deviceId` directly into SQL statements.
**Learning:** Raw SQL methods like `$executeRawUnsafe` can easily introduce SQL injection vulnerabilities if parameters are interpolated via template strings rather than passed as query parameters or parameterized template literals.
**Prevention:** Always use Prisma's parameterized tagged template literals (`$queryRaw` and `$executeRaw`) with Prisma.sql or standard template substitutions `${param}` which Prisma safely parameterizes.

## 2026-03-30 - Missing Role Restrictions on NestJS Controller Endpoints
**Vulnerability:** Controller endpoints missing the `@Roles(...)` decorator permit access to any authenticated user role when global `RolesGuard` is enabled without default-deny.
**Learning:** NestJS `RolesGuard` grants access by default when no `@Roles()` metadata is found on the endpoint or class, allowing authenticated non-admin users (e.g. DRIVER) to execute administrative actions.
**Prevention:** Explicitly annotate all administrative and privileged endpoints with `@Roles(UserRole.ADMIN)`.
