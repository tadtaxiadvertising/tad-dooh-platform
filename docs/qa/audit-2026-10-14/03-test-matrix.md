# 03 — Test Matrix

## Matrix by Module

| Module | Layer | Test ID | Status | Evidence | Notes |
|--------|-------|---------|--------|----------|-------|
| **Root/Repo** | Install | REPO-01 | PASS | `pnpm install --frozen-lockfile` ✓ | Lockfile consistent |
| **Root/Repo** | Lint | REPO-02 | FAIL | ESLint v9 config missing in 4 workspaces | Blocks CI `format` job |
| **Root/Repo** | TypeCheck | REPO-03 | NOT RUN | Root tsc times out; per-workspace needed | Use `tsc --noEmit -p apps/*/tsconfig.json` |
| **Root/Repo** | Build | REPO-04 | BLOCKED | Timeout >5min; memory pressure suspected | Split builds or increase timeout |
| **Root/Repo** | Security | REPO-05 | FAIL | `.env` files contain real secrets (P0) | Rotate immediately |
| **Root/Repo** | CI Config | REPO-06 | PASS | `.github/workflows/ci.yml` comprehensive | Gates: format, typecheck, test, prisma, security, build |
| **API** | Lint | API-01 | FAIL | ESLint v8 config works but times out (180s) | Config exists; slow on large codebase |
| **API** | TypeCheck | API-02 | NOT RUN | `tsc --noEmit` not executed | |
| **API** | Unit Tests | API-03 | PASS (5/9) | `referral`, `prisma`, `payment-intent`, `campaign`, `system-settings` pass | 11 tests passed |
| **API** | Unit Tests | API-04 | FAIL | `verified-metrics` — missing `@types/jest`, TS errors | 18 TS errors |
| **API** | Unit Tests | API-05 | FAIL | `qr-scan` — missing `@types/jest`, TS errors | 16 TS errors |
| **API** | Unit Tests | API-06 | FAIL | `conversation` — missing `@types/jest`, TS errors + API mismatch | 22 TS errors |
| **API** | Unit Tests | API-07 | FAIL | `commission` — missing `@types/jest`, TS errors + import error | 19 TS errors |
| **API** | Integration | API-08 | BLOCKED | Requires `DATABASE_URL` + Redis | No test DB |
| **API** | Prisma Validate | API-09 | BLOCKED | `DATABASE_URL` not set | P1012 error |
| **API** | Build | API-10 | NOT RUN | `nest build` not tested locally | |
| **API** | Docker Build | API-11 | NOT RUN | Requires Docker daemon | CI passes |
| **Admin** | Lint | ADM-01 | FAIL | ESLint v9 flat config missing | `eslint.config.js` not found |
| **Admin** | TypeCheck | ADM-02 | NOT RUN | | |
| **Admin** | Build | ADM-03 | NOT RUN | `next build` not tested | |
| **Admin** | E2E | ADM-04 | BLOCKED | Requires production credentials + live Supabase | `tests/e2e/v12/admin.spec.ts` |
| **Admin** | E2E (CI) | ADM-05 | NOT RUN | `test:e2e:ci` script exists | Needs preview env |
| **Advertiser** | Lint | ADV-01 | FAIL | ESLint v9 flat config missing + interactive prompt | `next lint` prompts for config |
| **Advertiser** | TypeCheck | ADV-02 | NOT RUN | | |
| **Advertiser** | Build | ADV-03 | NOT RUN | | |
| **Advertiser** | E2E | ADV-04 | BLOCKED | Requires production credentials | `tests/e2e/v12/advertiser.spec.ts` |
| **Driver** | Lint | DRV-01 | FAIL | ESLint v9 flat config missing | |
| **Driver** | TypeCheck | DRV-02 | NOT RUN | | |
| **Driver** | Build | DRV-03 | NOT RUN | | |
| **Driver** | E2E | DRV-04 | BLOCKED | Requires production credentials + ADM_02 state | `tests/e2e/v12/driver.spec.ts` |
| **Driver** | E2E Offline | DRV-05 | BLOCKED | `test:e2e:offline` project defined | Needs local stack |
| **Driver** | E2E GPS | DRV-06 | BLOCKED | `test:e2e:gps` project defined | |
| **Player** | Lint | PLR-01 | NOT RUN | No lint script in package.json | Vite project |
| **Player** | TypeCheck | PLR-02 | NOT RUN | `tsc` only in build script | |
| **Player** | Build | PLR-03 | NOT RUN | `vite build` not tested | |
| **Player** | E2E | PLR-04 | N/A | No E2E tests for player | Kiosk mode testing gap |
| **Remotion** | Lint | REM-01 | NOT RUN | No lint script | |
| **Remotion** | TypeCheck | REM-02 | NOT RUN | | |
| **Remotion** | Build | REM-03 | NOT RUN | `tsc` only | |
| **Remotion** | Render Test | REM-04 | NOT RUN | `test:remotion` script in API | Needs Chromium |
| **Simulator** | Lint | SIM-01 | N/A | No lint, no TS, plain JS | CLI tool |
| **Simulator** | Test | SIM-02 | N/A | No tests | Load testing only |
| **Packages: services** | Lint | PKG-SVC-01 | NOT RUN | No lint script | |
| **Packages: services** | TypeCheck | PKG-SVC-02 | NOT RUN | | |
| **Packages: services** | Test | PKG-SVC-03 | N/A | No tests | Shared clients/types |
| **Packages: ui** | Lint | PKG-UI-01 | NOT RUN | No lint script | |
| **Packages: ui** | TypeCheck | PKG-UI-02 | NOT RUN | | |
| **Packages: ui** | Test | PKG-UI-03 | N/A | No tests | Component library |
| **Packages: store** | Lint | PKG-ST-01 | NOT RUN | | |
| **Packages: store** | TypeCheck | PKG-ST-02 | NOT RUN | | |
| **Packages: store** | Test | PKG-ST-03 | N/A | | |
| **Packages: logging** | Lint | PKG-LG-01 | NOT RUN | | |
| **Packages: logging** | TypeCheck | PKG-LG-02 | NOT RUN | | |
| **Packages: logging** | Test | PKG-LG-03 | N/A | | |
| **Packages: types** | Lint | PKG-TY-01 | NOT RUN | | |
| **Packages: types** | TypeCheck | PKG-TY-02 | NOT RUN | | |
| **Packages: types** | Test | PKG-TY-03 | N/A | | |
| **Packages: permissions** | Lint | PKG-PM-01 | NOT RUN | | |
| **Packages: permissions** | TypeCheck | PKG-PM-02 | NOT RUN | | |
| **Packages: permissions** | Test | PKG-PM-03 | N/A | | |
| **Packages: impact-calculator** | Lint | PKG-IC-01 | NOT RUN | | |
| **Packages: impact-calculator** | TypeCheck | PKG-IC-02 | NOT RUN | | |
| **Packages: impact-calculator** | Test | PKG-IC-03 | N/A | Dist files cause ts-jest warnings | |
| **Agents-Orchestrator** | Lint | AGT-01 | FAIL | ESLint config missing | |
| **Agents-Orchestrator** | TypeCheck | AGT-02 | NOT RUN | | |
| **Agents-Orchestrator** | Test | AGT-03 | N/A | No tests | |
| **Driver-Flutter** | Test | FLT-01 | N/A | Separate Flutter toolchain | Out of scope |
| **Driver-Android** | Test | AND-01 | N/A | Legacy, separate toolchain | Out of scope |

## Summary Counts

| Status | Count |
|--------|-------|
| **PASS** | 7 |
| **FAIL** | 9 |
| **BLOCKED** | 12 |
| **NOT RUN** | 28 |
| **N/A** | 6 |
| **TOTAL** | 62 |

## By Category

| Category | PASS | FAIL | BLOCKED | NOT RUN | N/A |
|----------|------|------|---------|---------|-----|
| Static/Config | 2 | 5 | 0 | 1 | 0 |
| Unit Tests | 5 | 4 | 0 | 0 | 0 |
| Integration | 0 | 0 | 2 | 0 | 0 |
| E2E | 0 | 0 | 6 | 0 | 0 |
| Build | 0 | 0 | 2 | 4 | 0 |
| Security | 0 | 1 | 0 | 0 | 0 |
| Docker | 0 | 0 | 5 | 0 | 0 |
| Packages | 0 | 0 | 0 | 21 | 0 |

## Critical Path Coverage

| Critical Path | Unit | Integration | E2E | Status |
|---------------|------|-------------|-----|--------|
| Driver Onboarding | ❌ | 🚫 | 🚫 | **UNCOVERED** |
| Campaign Creation → Assignment | ✅ (campaign service) | 🚫 | 🚫 | **PARTIAL** |
| Playback → Telemetry → Verified Metrics | ❌ (verified-metrics failing) | 🚫 | 🚫 | **BROKEN** |
| Wallet/Bank Offline Sync | ❌ | 🚫 | 🚫 (DRV_02 needs ADM_02) | **UNCOVERED** |
| Payout/Payroll Calculation | ❌ | 🚫 | 🚫 | **UNCOVERED** |
| Referral/Commission | ✅ (referral service) | 🚫 | 🚫 | **PARTIAL** |
| QR Scan → Lead Conversion | ❌ (qr-scan failing) | 🚫 | 🚫 | **BROKEN** |
| Conversation/Chat | ❌ (conversation failing) | 🚫 | 🚫 | **BROKEN** |
| Admin Fleet Monitoring | ❌ | 🚫 | 🚫 | **UNCOVERED** |
| Advertiser Planner/Budget | ❌ | 🚫 | 🚫 | **UNCOVERED** |

## Legend

- ✅ = PASS (tested and passing)
- ❌ = FAIL (tested and failing)
- 🚫 = BLOCKED (cannot run due to missing dependency/env)
- ⏭️ = NOT RUN (skipped due to time/risk)
- N/A = Not Applicable (no tests exist)