# CI Quality Gates Specification

1. **Format & Lint (ESLint 9)**: `pnpm lint`
2. **TypeScript Typecheck**: Workspace `tsc --noEmit`
3. **API Unit Tests**: `pnpm --filter api test`
4. **Prisma Schema Validation**: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ci_test_db" npx prisma validate --schema=apps/api/prisma/schema.prisma`
5. **Security Audit**: `pnpm audit --audit-level=high` & TruffleHog secret scan.
6. **Production Builds**: `pnpm build`
7. **Docker Container Builds**: `docker build -f Dockerfile.<app> .`
