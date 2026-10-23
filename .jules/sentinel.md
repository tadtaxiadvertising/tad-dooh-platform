## 2026-10-23 - Prevent Database Schema Disclosure in Prisma Exception Filter
**Vulnerability:** `PrismaClientValidationError` exceptions returned raw `exception.message` directly in HTTP responses, exposing internal database schema structures, model definitions, and field names to API clients.
**Learning:** Returning unhandled or un-sanitized exception messages from ORM/database drivers can leak sensitive internal database schemas and AST query structures.
**Prevention:** In global/custom NestJS exception filters, always log raw ORM exception details internally via NestJS Logger and return sanitized, generic error messages to clients.

## 2026-03-30 - Fix SQL Injection in Rate Limiting Queries
**Vulnerability:** Raw SQL template interpolation (`$executeRawUnsafe`) was used in rate limiting queries in `TelemetryService`, interpolating `deviceId` directly into SQL statements.
**Learning:** Raw SQL methods like `$executeRawUnsafe` can easily introduce SQL injection vulnerabilities if parameters are interpolated via template strings rather than passed as query parameters or parameterized template literals.
**Prevention:** Always use Prisma's parameterized tagged template literals (`$queryRaw` and `$executeRaw`) with Prisma.sql or standard template substitutions `${param}` which Prisma safely parameterizes.
