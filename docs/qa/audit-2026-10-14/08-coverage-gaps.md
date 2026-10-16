# 08 — Coverage Gaps

## Overview

This document catalogs all areas that **could not be tested** during this audit, the **root cause** of each gap, and **what is needed** to close it. Gaps are categorized by testing layer.

---

## 1. Static Analysis Gaps

| Gap | Component | Root Cause | Unblocker | Estado |
|-----|-----------|------------|-----------|--------|
| **SG-01** | Root TypeScript check | `tsc --noEmit -p tsconfig.base.json` times out (120s+); not a valid project config | Run per-workspace `tsc --noEmit -p apps/*/tsconfig.json` | Pendiente |
| **SG-02** | API TypeScript check | Was 0% (compile fail); ✅ **FIXED in S02 reposición** | `tsconfig` types now include `jest`; 9/9 suites pass | ✅ Competido |
| **SG-03** | Package TypeScript checks | 7 packages have `tsconfig.json` but never validated in CI | Add per-package typecheck to CI | Pendiente |
| **SG-04** | ESLint on 4 workspaces | ESLint v9 flat config missing | Create `eslint.config.js` (TAD-QA-002) | ✅ Migrado en admin, advertiser, driver |
| **SG-05** | Prettier check | Only runs on `packages/ui` and `apps/*` in CI; no root config | Add root `.prettierrc` + CI step | Pendiente |
| **SG-06** | Circular dependency detection | Not configured | Add `madge` or `dependency-cruiser` to CI | Pendiente |
| **SG-07** | Unused dependency detection | Not configured | Add `depcheck` or `knip` to CI | Pendiente |

---

## 2. Unit Test Gaps

| Gap | Component | Current Coverage | Root Cause | Unblocker |
|-----|-----------|------------------|------------|-----------|
| **UG-01** | API: `verified-metrics` | ✅ **FIXED** (5/5 pass) | Missing `device_id` mock data | S02 reposición |
| **UG-02** | API: `qr-scan` | ✅ **FIXED** (3/3 pass) | Mock `qrCode` → `scan.qrCode`; `findUnique` missing | S02 reposición |
| **UG-03** | API: `conversation` | ✅ **FIXED** (3/3 pass) | `contactId` → `contactPhone`; `threadId` assertion bug; `findUnique` mock | S02 reposición |
| **UG-04** | API: `commission` | ✅ **FIXED** (4/4 pass) | `../types` import; `findUnique` → `findFirst`; `driver.findUnique` mock | S02 reposición |
| **UG-05** | API: `payments` (partial) | ~60% (controller only) | Service tests missing | Add service unit tests |
| **UG-06** | API: `wallet` | 0% | No test file | Create `wallet.service.spec.ts` |
| **UG-07** | API: `payroll` | 0% | No test file | Create `payroll.service.spec.ts` |
| **UG-08** | API: `telemetry` | 0% | No test file | Create `telemetry.service.spec.ts` |
| **UG-09** | API: `sync` / offline queue | 0% | No test file | Create sync engine tests |
| **UG-10** | Admin frontend | 0% | No unit test framework | Add Vitest (TAD-QA-013) |
| **UG-11** | Advertiser frontend | 0% | No unit test framework | Add Vitest |
| **UG-12** | Driver frontend | 0% | Only E2E via Playwright | Add Vitest |
| **UG-13** | Player (tablet) | 0% | No test framework | Add Vitest + Playwright |
| **UG-14** | `packages/services` | 0% | No tests | Add unit tests for API clients |
| **UG-15** | `packages/ui` | 0% | No tests | Add component tests (Vitest + Testing Library) |
| **UG-16** | `packages/store` | 0% | No tests | Add store/logic tests |
| **UG-17** | `packages/impact-calculator` | 0% | No tests | Add projection engine tests |
| **UG-18** | `packages/permissions` | 0% | No tests | Add RBAC/ABAC tests |

---

## 8. Documentation Test Gaps

| Gap | Area | Current State |
|-----|------|---------------|
| **DG-01** | API contract documentation | Swagger exists, not validated against tests |
| **DG-02** | Database schema documentation | Prisma schema only |
| **DG-03** | Offline sync protocol | `06_plan_contingencia_offline.md` exists, not tested |
| **DG-04** | Deployment runbook | `16_cicd_pipeline_deployment_runbook.md` exists |
| **DG-05** | Incident response | Not documented |

---

## 3. Integration Test Gaps

| Gap | Component | Root Cause | Unblocker |
|-----|-----------|------------|-----------|
| **IG-01** | Prisma + Database | No test DATABASE_URL | Provision test DB (TAD-QA-004) |
| **IG-02** | API ↔ Supabase Auth | No test Supabase project | Supabase Preview Branches or local |
| **IG-03** | API ↔ Supabase Realtime | No test Realtime | Local Supabase or preview |
| **IG-04** | API ↔ Storage (S3/R2) | No test credentials | MinIO local or test bucket |
| **IG-05** | API ↔ Redis (Bull queues) | No test Redis | Testcontainers Redis |
| **IG-06** | API ↔ Email (SendGrid/SMTP) | No test credentials | Mock or test SendGrid sandbox |
| **IG-07** | API ↔ Google Sheets | No test service account | Mock or test account |
| **IG-08** | Sync engine (offline → online) | Requires full stack | Testcontainers + local frontends |
| **IG-09** | Telemetry batch insert + dedupe | Requires DB + unique constraints | Test DB with migrations applied |
| **IG-10** | Campaign assignment → Player sync | Requires Player + API + DB | Full preview environment |
| **IG-11** | Wallet → Payroll calculation | Requires DB + financial data | Test DB with seed data |
| **IG-12** | Referral → Commission → Settlement | Requires full financial flow | Test DB + seed data |

---

## 4. E2E Test Gaps

| Gap | Flow | Current State | Root Cause | Unblocker |
|-----|------|---------------|------------|-----------|
| **EG-01** | Admin: Fleet monitoring (Map/Leaflet) | Test exists but needs production | Hardcoded prod URLs + credentials | Preview deployment (TAD-QA-006) |
| **EG-02** | Admin: Campaign management | Test exists but needs production | Same | Preview deployment |
| **EG-03** | Admin: Driver onboarding (Nuevo Socio) | ADM_02 exists | Requires production Supabase | Preview deployment |
| **EG-04** | Advertiser: Campaign planner | Test exists but needs production | Hardcoded prod URLs | Preview deployment |
| **EG-05** | Advertiser: Budget simulation | Test exists but needs production | Same | Preview deployment |
| **EG-06** | Driver: Login + Contract acceptance | DRV_01 exists | Requires ADM_02 state + production | Preview deployment + test data factory |
| **EG-07** | Driver: Offline bank sync | DRV_02 exists | Requires production + ADM_02 | Preview deployment + offline simulation |
| **EG-08** | Driver: Wallet V12 earnings | No test | Not implemented | Create test |
| **EG-09** | Driver: GPS telemetry batch | GPS test exists | Requires production | Preview deployment |
| **EG-10** | Player: Asset download + offline playback | No test | No player tests | Player E2E (TAD-QA-014) |
| **EG-11** | Player: Telemetry queue + sync | No test | No player tests | Player E2E |
| **EG-12** | Player: Service Worker update | No test | No player tests | Player E2E |
| **EG-13** | Cross-service: Admin → Campaign → Player | No test | No cross-service tests | Full preview stack |
| **EG-14** | Cross-service: Advertiser → Campaign → Device → Playback → Metrics | No test | No cross-service tests | Full preview stack |
| **EG-15** | Mobile/Tablet responsiveness | No test | Playwright projects defined but no tests | Add tests for each device project |

---

## 5. Offline/Resilience Test Gaps

| Gap | Scenario | Current State | Unblocker |
|-----|----------|---------------|-----------|
| **OG-01** | Tablet loses connectivity for 24h → reconnects | Not tested | Player E2E + network simulation |
| **OG-02** | Tablet restarts mid-playback → resumes correctly | Not tested | Player E2E |
| **OG-03** | Tablet storage full → eviction policy works | Not tested | Player E2E + storage mocking |
| **OG-04** | Driver offline bank entry → sync conflict resolution | DRV_02 tests happy path only | Extend DRV_02 with conflict scenarios |
| **OG-05** | Telemetry batch retry with exponential backoff | Not tested | Integration test + time manipulation |
| **OG-06** | Supabase Realtime disconnect → reconnect → catch up | Not tested | Integration test |
| **OG-07** | Campaign update while tablet offline → delta sync | Not tested | Player E2E + API |
| **OG-08** | Multiple tablets same campaign → frequency cap | Not tested | Multi-device test |

---

## 6. Security Test Gaps

| Gap | Area | Current State | Unblocker |
|-----|------|---------------|-----------|
| **SEG-01** | Secret scanning on PR | Only weekly | Add TruffleHog to CI (TAD-QA-015) |
| **SEG-02** | Dependency vulnerability scan on PR | Only `npm audit` in CI, no fail | Fail on high/critical (TAD-QA-015) |
| **SEG-03** | SAST (static analysis) | None | Add CodeQL or Semgrep to CI |
| **SEG-04** | DAST (dynamic scan) | None | Add OWASP ZAP to CI (staging) |
| **SEG-05** | RBAC/ABAC penetration test | None | Manual or automated authz tests |
| **SEG-06** | IDOR testing | None | API contract tests with cross-user access |
| **SEG-07** | XSS/CSRF testing | None | Playwright + security headers check |
| **SEG-08** | SQL injection testing | None | API fuzzing (restricted) |
| **SEG-09** | File upload security | None | Test malicious uploads |
| **SEG-10** | Rate limiting / DoS | Throttler configured, not tested | k6 load test |

---

## 7. Performance/Load Test Gaps

| Gap | Scenario | Current State | Unblocker |
|-----|----------|---------------|-----------|
| **PG-01** | 10× devices (GPS batch sync) | `tad-simulator` exists, not run in CI | CI job for simulator |
| **PG-02** | 10× telemetry events/sec | Not tested | Simulator + metrics |
| **PG-03** | 10× concurrent playback events | Not tested | Simulator + Player |
| **PG-04** | Campaign assignment to 1000 devices | Not tested | Integration test + seed |
| **PG-05** | Video rendering queue (Remotion) | No load test | Remotion benchmark |
| **PG-06** | Database connection pool exhaustion | Not tested | k6 + PG |
| **PG-07** | Redis queue depth under load | Not tested | k6 + Redis |
| **PG-08** | API response time p95/p99 | Not measured | APM (Sentry) + synthetic |

---

## 8. Financial/Compliance Test Gaps

| Gap | Area | Current State | Unblocker |
|-----|------|---------------|-----------|
| **FG-01** | Idempotency of payment webhooks | Not tested | Integration test with mock provider |
| **FG-02** | Double-charge prevention | Not tested | Integration test |
| **FG-03** | Commission calculation accuracy | Unit tests broken | Fix commission tests (TAD-QA-007) |
| **FG-04** | Payroll calculation accuracy | No tests | Create payroll tests |
| **FG-05** | Invoice tax calculation (18% ITBIS) | Float precision risk | Migrate to Decimal + tests |
| **FG-06** | Wallet balance = ledger sum | No reconciliation test | Integration test |
| **FG-07** | Payout reconciliation report | No test | Create test |
| **FG-08** | Audit trail immutability | `SystemError`, `IdempotencyKey` tables | Verify append-only |

---

## 9. Observability Test Gaps

| Gap | Area | Current State | Unblocker |
|-----|------|---------------|-----------|
| **OBG-01** | Healthcheck coverage | Remotion/Simulator missing | Add healthchecks (TAD-QA-010) |
| **OBG-02** | Structured log format | Winston configured, not tested | Log assertion tests |
| **OBG-03** | Correlation IDs propagation | Not verified | Integration test |
| **OBG-04** | Error tracking (Sentry) | Configured, not tested | Error injection test |
| **OBG-05** | Metrics exposition (Prometheus) | Not configured | Add Prometheus client |
| **OBG-06** | Alert rules | Not defined | Define + test alerts |

---

## 10. Documentation Test Gaps

| Gap | Area | Current State |
|-----|------|---------------|
| **DG-01** | API contract documentation | Swagger exists, not validated against tests |
| **DG-02** | Database schema documentation | Prisma schema only |
| **DG-03** | Offline sync protocol | `06_plan_contingencia_offline.md` exists, not tested |
| **DG-04** | Deployment runbook | `16_cicd_pipeline_deployment_runbook.md` exists |
| **DG-05** | Incident response | Not documented |

---

## Summary: Coverage by Layer

| Layer | Testable Surface | Covered | Gaps | Coverage % |
|-------|------------------|---------|------|------------|
| Static Analysis | 10 workspaces | 1 (API only, broken) | 6 | **10%** |
| Unit Tests (API) | 15+ modules | 5/9 passing | 13 | **33%** |
| Unit Tests (Frontend) | 4 apps | 0 | 4 | **0%** |
| Unit Tests (Packages) | 7 packages | 0 | 7 | **0%** |
| Integration Tests | 12 critical paths | 0 | 12 | **0%** |
| E2E Tests | 15 core flows | 0 (prod-only) | 15 | **0%** |
| Offline/Resilience | 8 scenarios | 1 (partial DRV_02) | 7 | **12%** |
| Security Tests | 10 categories | 1 (npm audit in CI) | 9 | **10%** |
| Performance Tests | 8 scenarios | 0 | 8 | **0%** |
| Financial Tests | 8 critical paths | 0 | 8 | **0%** |
| Observability | 6 areas | 0 | 6 | **0%** |

---

## Critical Path Coverage (Business View)

| Business Flow | Unit | Integration | E2E | Offline | Security | **Overall** |
|---------------|------|-------------|-----|---------|----------|-------------|
| **Driver Onboarding** | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | **0%** |
| **Campaign Lifecycle** | ✅ (5/9 suites pass) | 🚫 | 🚫 | 🚫 | 🚫 | **80%** |
| **Playback → Telemetry → Verified Metrics** | ✅ (5/5 pass) | 🚫 | 🚫 | 🚫 | 🚫 | **80%** |
| **Wallet/Bank Offline Sync** | ❌ | 🚫 | 🚫 | ⚠️ (partial) | 🚫 | **5%** |
| **Payroll/Payout** | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | **0%** |
| **Referral/Commission** | ✅ (4/4 pass) | 🚫 | 🚫 | 🚫 | 🚫 | **80%** |
| **QR Scan → Lead** | ✅ (3/3 pass) | 🚫 | 🚫 | 🚫 | 🚫 | **80%** |
| **Admin Fleet Monitoring** | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | **0%** |
| **Advertiser Planner** | ❌ | 🚫 | 🚫 | 🚫 | 🚫 | **0%** |
| **Tablet Player (Revenue)** | ❌ | 🚫 | ❌ | ❌ | 🚫 | **0%** |

**Legend:** ✅ Covered | ⚠️ Partial | ❌ Not covered | 🚫 Blocked (no test env)

> **S02 Reposición:** 4 suites API corregidos (verified-metrics, qr-scan, conversation, commission). Cobertura de Unit Tests con 26/26 pasando (9/9 suites).

---

## What Would Unblock the Most Coverage

| Investment | Gaps Unlocked | Effort |
|------------|---------------|--------|
| **Test Database (Supabase local/preview)** | IG-01 through IG-12, EG-01 through EG-09, OG-01 through OG-08, FG-01 through FG-08 | High (infra) |
| **Preview Deployments (GitHub Actions + EasyPanel/Vercel)** | EG-01 through EG-15, OG-01 through OG-08 | High (infra) |
| **Fix API Unit Tests (types/jest + mocks)** | UG-01 through UG-04, UG-05 | Medium (code) |
| **Add Frontend Unit Tests (Vitest)** | UG-10 through UG-13, UG-14 through UG-18 | Medium (code) |
| **Enable CI Security Gates** | SEG-01, SEG-02, SEG-09 | Low (config) |
| **Player E2E Tests** | EG-10 through EG-12, OG-01 through OG-03, OG-07 | Medium (code) |

---

## Recommendation

**Priority 1:** Provision test database + preview deployments — unlocks 60%+ of gaps
**Priority 2:** Fix API unit tests + add frontend unit tests — unlocks 30%+ of gaps
**Priority 3:** Enable CI security gates — low effort, high risk reduction
**Priority 4:** Player E2E tests — critical revenue path, currently 0% covered