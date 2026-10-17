## 2026-10-17 - Prevent Exception Message Leakage in Controller Catch Blocks
**Vulnerability:** Controller endpoints re-throwing NestJS `InternalServerErrorException` with interpolated `err.message` leaked internal database errors, schema tables, and system execution paths to HTTP API consumers.
**Learning:** Concatenating `err.message` directly into `HttpException` constructors bypasses NestJS exception filter sanitization because NestJS considers the explicitly passed string message as user-intended response content.
**Prevention:** Always log full exception stack traces server-side via NestJS `Logger` and re-throw `InternalServerErrorException` with generic, sanitized messages for end-user HTTP responses.
