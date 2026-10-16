# Findings and Remediation Record

## TAD-QA-001: P0 Credential Exposure Assessment
- **Severity**: Critical (P0)
- **Status**: Contained / Documented
- **Affected Workspace**: `apps/api`, `apps/admin`, `apps/driver`, `apps/advertiser`
- **Root Cause**: Audit reported environment files in workspaces.
- **Evidence**: `git ls-files` confirmed `.env` files are ignored in `.gitignore`. No active secret values are committed in `HEAD`. Added `.env.example` templates across all frontend applications.

## TAD-QA-002: ESLint 9 & TypeScript Toolchain Failures
- **Severity**: High (P1)
- **Status**: VERIFIED PASS
- **Affected Workspace**: Monorepo (`apps/*`, `packages/*`)
- **Root Cause**: Incompatibility with ESLint 9/10 flat config expectations, missing `@types/react`, `google-auth-library`, `clsx`, `@playwright/test` dependencies.
- **Remediation**: Standardized `eslint.config.mjs` across workspaces using `@typescript-eslint`. Installed missing dependencies in `apps/api`, `apps/advertiser`, `packages/ui`.
- **Verification**: `pnpm lint` passed with 0 errors across all workspaces. `tsc --noEmit` passed across all core modules and API.

## TAD-QA-003: API Unit Test Failures
- **Severity**: High (P1)
- **Status**: VERIFIED PASS
- **Affected Workspace**: `apps/api`
- **Suites**: `verified-metrics`, `qr-scan`, `conversation`, `commission`
- **Root Cause**:
  1. `tsconfig.json` missing `"jest"` in `"types"`.
  2. Mismatch in `QrScanService.recordScan` return contract (`{ scan, isDuplicate, converted }`).
  3. Missing `findUnique` and `update` mock handling in `ConversationService` and `QrScanService`.
  4. Mismatch in `CommissionService.generateMonthlySettlement` input object (`{ month, year, generatedBy }`).
  5. Missing `device_id` fallback in `VerifiedMetricsService.detectAnomalies`.
- **Remediation**: Corrected TypeScript types, mocks, and service logic fallbacks in `apps/api/src/modules/`.
- **Verification**: All 9 API test suites passed (26/26 tests passed).

## TAD-QA-004: Prisma Schema CI Validation Error
- **Severity**: Medium (P2)
- **Status**: VERIFIED PASS
- **Affected Workspace**: `apps/api` / `.github/workflows/ci.yml`
- **Root Cause**: `prisma validate` required `DATABASE_URL` environment variable.
- **Remediation**: Added harmless test `DATABASE_URL` to CI workflow step.
- **Verification**: `npx prisma validate --schema=apps/api/prisma/schema.prisma` returned valid schema confirmation.

## TAD-QA-005 / TAD-QA-011: Production Build Performance and Failure
- **Severity**: High (P1)
- **Status**: VERIFIED PASS
- **Affected Workspace**: Monorepo (`apps/api`, `apps/admin`, `apps/driver`, `apps/advertiser`, `apps/player`)
- **Root Cause**: Missing build environment variables during Next.js SSG page data collection, missing `dom` library in `@tad/impact-calculator`, and missing `google-auth-library` in `apps/api`.
- **Remediation**: Provided required Next.js build parameters, fixed `tsconfig.json` in `@tad/impact-calculator`, added `google-auth-library` dependency.
- **Verification**: `pnpm build` succeeded across all monorepo workspaces with exit code 0.

## TAD-QA-008: Docker Engine Environment Limitation
- **Severity**: Low (P3)
- **Status**: BLOCKED (Environment Sandbox Constraint)
- **Affected Workspace**: Root Dockerfiles (`Dockerfile.api`, `Dockerfile.admin`, `Dockerfile.driver`, `Dockerfile.player`)
- **Root Cause**: Sandbox container environment kernel profile disallows mounting overlay filesystems (`fstype: overlay err: invalid argument`).
- **Remediation**: Validated Dockerfile syntax and multi-stage configurations. Docker build execution reported as BLOCKED.
