# 02 — Test Strategy

## Testing Layers & Coverage Goals

| Layer | Tools | Target Coverage | Status |
|-------|-------|-----------------|--------|
| Static Analysis | ESLint v9, Prettier, TypeScript strict | 100% files | **BROKEN** |
| Unit Tests | Jest + ts-jest | ≥80% statements (API) | **PARTIAL** (5/9 pass) |
| Integration Tests | Jest + Testcontainers / Supabase local | Critical paths | **NOT RUN** (no DB) |
| API Contract | Playwright (API mode) | All public endpoints | **NOT RUN** |
| E2E Flows | Playwright (Chromium/Firefox/WebKit) | Core user journeys | **BLOCKED** (prod deps) |
| Offline/Resilience | Playwright offline project + SW tests | Tablet player scenarios | **NOT RUN** |
| Security | npm audit, TruffleHog, Snyk/OWASP | No high/critical | **PARTIAL** (CI only) |
| Performance | k6 / tad-simulator | 10× baseline | **NOT RUN** |
| Visual Regression | Playwright snapshots | Key screens | **NOT RUN** |

## Test Strategy Decisions

### 1. Package Manager: pnpm (lockfile present)
- **Decision:** Use `pnpm install --frozen-lockfile` exclusively
- **Rationale:** Lockfile ensures reproducible installs; mixing npm/yarn/bun corrupts node_modules
- **Risk:** None — lockfile is current and valid

### 2. TypeScript Checking
- **Decision:** Run `tsc --noEmit` per workspace (not root)
- **Rationale:** Root `tsconfig.base.json` is not a project config; monorepo has 17+ tsconfigs
- **Risk:** Cross-workspace type errors may be missed; mitigated by CI per-workspace checks

### 3. Unit Tests (API)
- **Decision:** Run `pnpm test` in `apps/api` only; skip frontend unit tests (none configured)
- **Rationale:** Only API has Jest configured; frontends rely on Playwright E2E
- **Risk:** Frontend logic not unit-tested; accept for now, track as gap

### 4. Integration Tests
- **Decision:** Require Testcontainers PostgreSQL or Supabase local dev; skip if unavailable
- **Rationale:** Real DB needed for Prisma queries, transactions, RLS testing
- **Risk:** **HIGH** — no integration test coverage without DB

### 5. E2E Tests (Playwright)
- **Decision:** Two modes:
  - **CI/Staging:** Against deployed preview environments (isolated)
  - **Local Audit:** **SKIP** — current tests use production URLs + real credentials
- **Rationale:** Tests in `tests/e2e/v12/` require `TAD_ADMIN_PASSWORD`, `TAD_DRIVER_PHONE` etc. pointing to production
- **Risk:** **CRITICAL** — no safe way to run E2E locally; production data pollution risk

### 6. Offline/Resilience Tests
- **Decision:** Use Playwright `offline-resilience` project (defined in `playwright.config.ts`)
- **Rationale:** Tests GPS batch sync, offline queue, Service Worker behavior
- **Risk:** Requires running frontend + API + Supabase Realtime locally

### 7. Security Testing
- **Decision:** Run `pnpm audit --audit-level=high` + TruffleHog scan locally
- **Rationale:** CI already runs these weekly; local verification catches new issues
- **Risk:** TruffleHog not installed locally; use `npx trufflehog` if available

### 8. @qavajs/tx Integration
- **Decision:** **DEFER** — evaluate after baseline stabilizes
- **Rationale:**
  - `@qavajs/tx` is a browser test abstraction layer (Playwright wrapper)
  - Current stack uses raw Playwright + custom helpers (`lib/admin-helpers`, `lib/driver-helpers`)
  - Migration would require rewriting 50+ test files and helper libraries
  - No immediate ROI; existing Playwright setup is functional (when env available)
- **Alternative:** Keep Playwright; enhance with page objects and fixtures instead

## Risk Assessment per Command

| Command | Risk | Mitigation |
|---------|------|------------|
| `pnpm install --frozen-lockfile` | LOW | Reproducible; no network mutations |
| `pnpm lint` | LOW | Read-only; exits non-zero on errors |
| `tsc --noEmit` | LOW | Read-only; may timeout on large monorepo |
| `pnpm test` (API) | MEDIUM | Spawns Jest workers; may OOM on 512MB; use `--maxWorkers=2` |
| `pnpm build` | HIGH | Full monorepo build; memory intensive; timeout likely |
| `npx prisma validate` | LOW | Read-only; needs `DATABASE_URL` |
| `npx playwright test` | HIGH | Launches browsers + web servers; needs ports, DB, credentials |
| `docker build` | MEDIUM | Requires daemon; builds 5 images; 10-15 min each |
| `pnpm audit` | LOW | Read-only; network call to npm registry |
| `npx trufflehog git file://.` | LOW | Read-only; scans git history |

## Execution Order (Adapted for Local Audit)

1. **Static Discovery** — `git status`, `ls`, `cat package.json`, inspect configs ✅
2. **Dependencies** — `pnpm install --frozen-lockfile` ✅
3. **Lint** — `pnpm lint` → **FAIL** (ESLint v9 migration) ❌
4. **TypeCheck** — `tsc --noEmit` per workspace → **SKIPPED** (timeout risk) ⏭️
5. **Unit Tests** — `cd apps/api && pnpm test` → **PARTIAL** (4/9 fail) ⚠️
6. **Prisma Validate** — `npx prisma validate` → **BLOCKED** (no DATABASE_URL) 🚫
7. **Build (API only)** — `cd apps/api && pnpm build` → **NOT RUN** (timeout risk) ⏭️
8. **Security Scan** — `pnpm audit --audit-level=high` + secret scan → **PARTIAL** ⚠️
9. **E2E Smoke** — **SKIPPED** (production deps) 🚫
10. **Offline Tests** — **SKIPPED** (needs full stack) 🚫

## Success Criteria (Not Met)

- [ ] All lint rules pass (zero errors, zero warnings with `--max-warnings 0`)
- [ ] All TypeScript checks pass (strict mode, no `any` leaks)
- [ ] All unit tests pass (≥80% coverage on API)
- [ ] Prisma schema validates against live DB
- [ ] All Docker images build successfully
- [ ] E2E critical paths pass against staging environment
- [ ] Security audit: zero high/critical vulnerabilities, zero secrets in git
- [ ] Offline/resilience tests pass (Service Worker, sync, queue)

## Known Blockers

1. **ESLint v9 migration** — Admin, Advertiser, Driver, Agents-Orchestrator lack `eslint.config.js`
2. **Missing `@types/jest`** — 4 test suites fail to compile
3. **Broken test mocks** — `verified-metrics`, `qr-scan`, `conversation`, `commission` have type errors
4. **No test DATABASE_URL** — Integration/Prisma validation impossible
5. **E2E tests coupled to production** — No staging/preview environment for safe testing
6. **Build timeout** — Full monorepo build exceeds 5 minutes on this hardware

## Recommendations

1. **Immediate:** Fix ESLint configs (migrate to flat config) — unblocks CI lint gate
2. **Immediate:** Add `@types/jest` to API devDependencies; fix broken test imports
3. **Short-term:** Provision Supabase local dev or Testcontainers for integration tests
4. **Short-term:** Create GitHub Actions preview deployment for E2E testing
5. **Medium-term:** Split monorepo build into parallel workspace builds with caching
6. **Medium-term:** Evaluate `@qavajs/tx` only if Playwright maintenance becomes burden