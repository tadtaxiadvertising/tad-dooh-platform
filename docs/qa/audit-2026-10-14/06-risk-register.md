# 06 — Risk Register

## Risk Scoring

| Score | Likelihood | Impact |
|-------|------------|--------|
| 1 | Rare | Negligible |
| 2 | Unlikely | Minor |
| 3 | Possible | Moderate |
| 4 | Likely | Major |
| 5 | Almost Certain | Critical |

**Risk Level = Likelihood × Impact**

| Level | Score | Action |
|-------|-------|--------|
| **CRITICAL** | 20-25 | Immediate mitigation, executive visibility |
| **HIGH** | 12-16 | Urgent mitigation, sprint commitment |
| **MEDIUM** | 6-10 | Planned mitigation, next 2 sprints |
| **LOW** | 1-5 | Monitor, address when convenient |

---

## Technical Risks

| ID | Risk | Likelihood | Impact | Score | Level | Mitigation | Owner |
|----|------|------------|--------|-------|-------|------------|-------|
| **TR-01** | Exposed secrets used maliciously (DB access, email spoofing, storage deletion) | 5 | 5 | 25 | **CRITICAL** | Immediate rotation (TAD-QA-001); enable Supabase PITR; audit access logs | SecOps |
| **TR-02** | CI/CD pipeline broken — no quality gates on PRs | 5 | 4 | 20 | **CRITICAL** | Fix ESLint (TAD-QA-002); fix tests (TAD-QA-003); enforce required status checks | DevOps |
| **TR-03** | Financial data corruption — commission/payroll/verified-metrics untested | 4 | 5 | 20 | **CRITICAL** | Restore unit tests for commission, verified-metrics, payments; add integration tests with real DB | Backend |
| **TR-04** | Production database schema drift — Prisma validation not running | 4 | 4 | 16 | **HIGH** | Provision test DB for CI (TAD-QA-004); run `prisma validate` + `generate` on every PR | Backend |
| **TR-05** | Build system collapse — monorepo build OOM/timeout at scale | 4 | 3 | 12 | **HIGH** | Adopt Turborepo; split Docker builds; increase CI resources; workspace caching | DevOps |
| **TR-06** | E2E tests pollute production data — real drivers/campaigns created | 4 | 4 | 16 | **HIGH** | Remove prod defaults from tests; create preview environments (TAD-QA-006) | QA |
| **TR-07** | Tablet player (revenue device) has zero automated tests | 3 | 5 | 15 | **HIGH** | Add Playwright tests for player (TAD-QA-014); test offline sync, playback, telemetry | QA/Frontend |
| **TR-08** | Node version drift — 22 (Docker) vs 20 (CI) vs 26 (local) | 4 | 3 | 12 | **HIGH** | Pin Node 22 everywhere (engines, CI, Docker, .nvmrc) (TAD-QA-009) | DevOps |
| **TR-09** | Remotion video rendering service has no healthcheck — silent failures | 3 | 4 | 12 | **HIGH** | Add /health endpoint + HEALTHCHECK (TAD-QA-010) | Backend |
| **TR-10** | API lint timeout hides code quality issues | 3 | 3 | 9 | **MEDIUM** | Restrict patterns, add cache (TAD-QA-011) | DevOps |
| **TR-11** | No dependency automation — vulnerabilities accumulate | 3 | 3 | 9 | **MEDIUM** | Enable Dependabot/Renovate (TAD-QA-016) | DevOps |
| **TR-12** | Frontend business logic untested (planner, wallet, offline queue) | 3 | 4 | 12 | **HIGH** | Add Vitest unit tests for critical frontend logic (TAD-QA-013) | Frontend |
| **TR-13** | Impact-calculator dist files pollute Jest — potential miscompilation | 2 | 2 | 4 | **LOW** | Fix transformIgnorePatterns (TAD-QA-008) | Backend |
| **TR-14** | Supabase Free Tier limits (500MB DB, 1GB storage) — growth risk | 3 | 4 | 12 | **HIGH** | Monitor via weekly audit; plan migration to Pro; archive old telemetry | Backend/DevOps |
| **TR-15** | Single-region deployment (EasyPanel) — no DR/HA | 2 | 5 | 10 | **MEDIUM** | Document RTO/RPO; evaluate multi-region; backup strategy | DevOps |

---

## Business Risks

| ID | Risk | Likelihood | Impact | Score | Level | Mitigation | Owner |
|----|------|------------|--------|-------|-------|------------|-------|
| **BR-01** | Revenue loss — tablet player failures undetected (no tests, no monitoring) | 4 | 5 | 20 | **CRITICAL** | Player E2E tests; synthetic monitoring; alerting on playback_events drop | Product/Eng |
| **BR-02** | Driver churn — onboarding broken (offline bank sync untested) | 3 | 4 | 12 | **HIGH** | DRV_02 test must pass in CI; monitor onboarding funnel | Product |
| **BR-03** | Advertiser trust — campaign metrics inaccurate (verified-metrics broken) | 4 | 4 | 16 | **HIGH** | Fix verified-metrics tests; add metric reconciliation reports | Backend |
| **BR-04** | Compliance violation — PII in exposed secrets (driver phones, emails) | 4 | 5 | 20 | **CRITICAL** | Secret rotation (TAD-QA-001); audit log review; GDPR notification if needed | Legal/SecOps |
| **BR-05** | Inability to ship features — broken CI blocks all merges | 5 | 3 | 15 | **HIGH** | Fix lint + tests to restore green CI | DevOps |
| **BR-06** | Technical debt compounding — 4 test suites rotting, no ownership | 4 | 3 | 12 | **HIGH** | Assign test ownership; enforce "tests pass" gate; refactor broken suites | Eng Lead |
| **BR-07** | Scaling ceiling — 10× devices (GPS, telemetry, impressions) not tested | 3 | 4 | 12 | **HIGH** | Load test with tad-simulator; identify bottlenecks; optimize batch sync | Backend |
| **BR-08** | Knowledge silos — complex offline/sync logic understood by few | 3 | 3 | 9 | **MEDIUM** | Document sync engine; pair programming; ADRs for key decisions | Eng Lead |

---

## Security Risks (Detailed)

| ID | Risk | Evidence | Severity | Status |
|----|------|----------|----------|--------|
| **SR-01** | Service Role Key in `.env` — full DB admin | `apps/api/.env` has `SUPABASE_SERVICE_ROLE_KEY` | **P0** | OPEN |
| **SR-02** | JWT Secret in `.env` — token forgery | `apps/api/.env` has `JWT_SECRET` | **P0** | OPEN |
| **SR-03** | Storage Secret Key — object read/write/delete | `apps/api/.env` has `STORAGE_SECRET_KEY` | **P0** | OPEN |
| **SR-04** | SendGrid API Key — email spoofing, spam | `apps/api/.env` has `SENDGRID_API_KEY` | **P0** | OPEN |
| **SR-05** | Google Service Account — Sheets/Drive access | `apps/api/.env` has `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` | **P0** | OPEN |
| **SR-06** | SMTP Password — email relay abuse | `apps/api/.env` has `SMTP_PASSWORD` | **P0** | OPEN |
| **SR-07** | Simulator API Key — fake telemetry injection | `apps/api/.env` has `SIMULATOR_API_KEY` | **P1** | OPEN |
| **SR-08** | Supabase Anon Key in frontend `.env` — public but rotatable | `apps/admin/.env` etc. | **P2** | OPEN |
| **SR-09** | No secret scanning on PR — only weekly | CI only runs TruffleHog weekly | **P1** | OPEN |
| **SR-10** | CORS_ORIGIN in API `.env.example` shows production domains | `CORS_ORIGIN=http://localhost:3001,https://tad-dooh-dashboard.vercel.app` | **P3** | OPEN |

---

## Offline/Resilience Risks

| ID | Risk | Component | Evidence |
|----|------|-----------|----------|
| **OR-01** | Offline queue not tested — data loss on prolonged disconnect | Driver portal, Player | DRV_02 tests offline but needs production |
| **OR-02** | Sync reconciliation logic untested — duplicate/conflict risk | API sync endpoints | No integration tests for sync |
| **OR-03** | Service Worker cache corruption — player shows stale ads | Player (Vite PWA) | No SW tests |
| **OR-04** | Telemetry batch deduplication — unique constraint depends on DB | `telemetry` table unique (driver_id, timestamp) | Migration `20260110_telemetry_unique_constraint` |
| **OR-05** | Driver location dedupe — unique constraint prevents OOM | `driver_locations` table unique (device_id, timestamp) | Migration `20260110_driver_location_unique` |

---

## Financial Integrity Risks

| ID | Risk | Component | Evidence |
|----|------|-----------|----------|
| **FR-01** | Commission idempotency relies on DB unique constraint only | `commission.reference` unique | No test for duplicate submission |
| **FR-02** | Wallet balance derived from ledger — no reconciliation test | `Wallet` + `FinancialTransaction` | No integration test |
| **FR-03** | Payroll calculation uses Float — precision risk | `PayrollPayment.amount` Float | Should use Decimal/BigInt |
| **FR-04** | Invoice totals use Float — tax calculation drift | `Invoice.subtotal/tax/total` Float | Should use Decimal |
| **FR-05** | No idempotency key enforcement on payment webhooks | `PaymentIntent.idempotency_key` unique | Not tested |

---

## Risk Heat Map

```
Impact →
     5  ████ TR-01, BR-01, BR-04, FR-01
     4  ████ TR-02, TR-03, TR-04, TR-06, BR-03, BR-05
     3  ████ TR-05, TR-08, TR-09, TR-14, BR-02, BR-06, BR-07
     2  ████ TR-10, TR-11, TR-12, TR-15, SR-07, SR-08
     1  ████ TR-13, SR-09, SR-10
       ↓
       Likelihood
```

---

## Top 5 Risks to Address This Sprint

1. **TR-01 / SR-01-06** — Rotate all exposed secrets (P0, 25 score)
2. **TR-02** — Fix CI quality gates (lint + tests) (P1, 20 score)
3. **TR-03** — Restore financial module tests (P1, 20 score)
4. **TR-04** — Enable Prisma validation in CI (P1, 16 score)
5. **TR-06 / BR-01** — Decouple E2E from production (P1, 16-20 score)

---

## Risk Acceptance (Deferred)

| ID | Risk | Reason for Deferral | Revisit |
|----|------|---------------------|---------|
| TR-13 | Impact-calculator Jest warnings | Cosmetic; no functional impact | Next quarter |
| TR-15 | Single-region DR | Business not at scale for multi-region | When MRR > $50k |
| BR-08 | Knowledge silos | Team small; pair programming mitigates | When team > 8 |