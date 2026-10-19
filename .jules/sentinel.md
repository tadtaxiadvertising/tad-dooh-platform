## 2026-03-30 - Fix SQL Injection in Rate Limiting Queries
**Vulnerability:** Raw SQL template interpolation (`$executeRawUnsafe`) was used in rate limiting queries in `TelemetryService`, interpolating `deviceId` directly into SQL statements.
**Learning:** Raw SQL methods like `$executeRawUnsafe` can easily introduce SQL injection vulnerabilities if parameters are interpolated via template strings rather than passed as query parameters or parameterized template literals.
**Prevention:** Always use Prisma's parameterized tagged template literals (`$queryRaw` and `$executeRaw`) with Prisma.sql or standard template substitutions `${param}` which Prisma safely parameterizes.
