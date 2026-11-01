## 2026-03-30 - Fix SQL Injection in Rate Limiting Queries
**Vulnerability:** Raw SQL template interpolation (`$executeRawUnsafe`) was used in rate limiting queries in `TelemetryService`, interpolating `deviceId` directly into SQL statements.
**Learning:** Raw SQL methods like `$executeRawUnsafe` can easily introduce SQL injection vulnerabilities if parameters are interpolated via template strings rather than passed as query parameters or parameterized template literals.
**Prevention:** Always use Prisma's parameterized tagged template literals (`$queryRaw` and `$executeRaw`) with Prisma.sql or standard template substitutions `${param}` which Prisma safely parameterizes.

## 2026-03-31 - Protect Simulation Endpoints from Unauthorized Access and Abuse
**Vulnerability:** `SimulationController` was annotated with `@Public()` and `@SkipThrottle()`, allowing unauthenticated public requests to start resource-heavy simulations (`/scenario`), halt running simulations (`/stop`), and execute batch deletion of database records (`/purge`).
**Learning:** Administrative and load-simulation controllers originally built for local testing often retain permissive public decorators when deployed, creating denial of service and data tampering risks in shared environments.
**Prevention:** Never mark simulation or state-mutating management controllers with `@Public()`. Ensure all administrative endpoints explicitly enforce `@Roles(UserRole.ADMIN)` so `RolesGuard` and `SupabaseAuthGuard` reject unauthenticated or non-admin callers.
