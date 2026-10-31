## 2026-10-31 - Enforce Admin RBAC on Simulation and Fleet Controls
**Vulnerability:** `SimulationController` had a class-level `@Public()` decorator without role restrictions, exposing sensitive state, fleet scenario generation, simulation shutdown, and test data purge operations to unauthenticated callers.
**Learning:** Development and staging utilities like simulators can easily be marked `@Public()` for convenience during manual testing, inadvertently allowing arbitrary external users to trigger load or purge DB records in production.
**Prevention:** Administrative, maintenance, and test engine endpoints must require `@Roles(UserRole.ADMIN)` and must never be decorated with `@Public()`.

## 2026-03-30 - Fix SQL Injection in Rate Limiting Queries
**Vulnerability:** Raw SQL template interpolation (`$executeRawUnsafe`) was used in rate limiting queries in `TelemetryService`, interpolating `deviceId` directly into SQL statements.
**Learning:** Raw SQL methods like `$executeRawUnsafe` can easily introduce SQL injection vulnerabilities if parameters are interpolated via template strings rather than passed as query parameters or parameterized template literals.
**Prevention:** Always use Prisma's parameterized tagged template literals (`$queryRaw` and `$executeRaw`) with Prisma.sql or standard template substitutions `${param}` which Prisma safely parameterizes.
