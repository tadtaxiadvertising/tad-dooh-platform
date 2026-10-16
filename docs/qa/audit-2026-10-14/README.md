# TAD DOOH Platform — QA Audit Report

**Audit Date:** 2026-10-14
**Commit Audited:** `14d184e9` (Merge PR #73)
**Branch:** `main` (behind origin/main by 23 commits)
**Environment:** Windows 11 (git-bash/MSYS), Node v26.7.0, pnpm v11.7.0
**Auditor:** Principal QA Automation Engineer (AI-assisted)

---

## Executive Summary

This audit evaluates the TAD DOOH Platform (`tadtaxiadvertising/tad-dooh-platform`) across all quality dimensions defined in the `tad-platform-qa-audit` skill. The platform is a **pnpm monorepo** with 10 applications and 7 shared packages, using Next.js/React (frontend), NestJS/Node (API), Prisma/PostgreSQL (Supabase), Remotion (video), and offline-first tablet players.

### Global Status: **PARCIAL** ⚠️

| Category | Status | Details |
|----------|--------|---------|
| **Static Analysis / Lint** | **FAIL** | ESLint v9 migration incomplete; config files missing in 4 workspaces |
| **TypeScript Check** | **NOT RUN** | Blocked by missing tsconfig in some packages; tsc times out at root |
| **Unit Tests (API)** | **FAIL** | 4/9 test suites failing — missing `@types/jest`, type errors, import issues |
| **E2E Tests** | **BLOCKED** | Driver tests timeout; require live Supabase credentials |
| **Build** | **BLOCKED** | Timeout (>5min); likely memory pressure in monorepo build |
| **Prisma Schema** | **BLOCKED** | Requires `DATABASE_URL` (Supabase) — not available locally |
| **Security Scan** | **PARTIAL** | CI has TruffleHog + npm audit; local `.env` files contain real secrets (P0) |
| **Docker Build** | **NOT RUN** | Requires Docker daemon; CI builds pass per workflow |

---

## Critical Findings (P0/P1)

| ID | Title | Severity | Component | Status |
|----|-------|----------|-----------|--------|
| **TAD-QA-001** | Real credentials in committed `.env` files | **P0** | Security/Config | CONFIRMADO |
| **TAD-QA-002** | ESLint v9 migration incomplete — lint gate broken | **P1** | DX/CI | CONFIRMADO |
| **TAD-QA-003** | API unit tests failing — missing `@types/jest`, broken mocks | **P1** | Testing/API | CONFIRMADO |
| **TAD-QA-004** | Prisma schema cannot validate without live `DATABASE_URL` | **P1** | DB/CI | CONFIRMADO |
| **TAD-QA-005** | Build times out — potential memory/architecture issue | **P1** | Build/Infra | PROBABLE |
| **TAD-QA-006** | E2E tests require production credentials — no isolated test env | **P1** | Testing/E2E | CONFIRMADO |
| **TAD-QA-007** | `verified-metrics`, `qr-scan`, `conversation`, `commission` test suites have TypeScript errors | **P1** | Testing/API | CONFIRMADO |
| **TAD-QA-008** | `packages/impact-calculator` dist files cause ts-jest warnings | **P2** | Testing/Build | CONFIRMADO |

---

## Test Matrix Summary

| Layer | Tests Run | Pass | Fail | Blocked | Not Run | N/A |
|-------|-----------|------|------|---------|---------|-----|
| Lint/Format | 1 | 0 | 1 | 0 | 0 | 0 |
| TypeCheck | 0 | 0 | 0 | 1 | 0 | 0 |
| Unit (API) | 9 | 5 | 4 | 0 | 0 | 0 |
| Integration | 0 | 0 | 0 | 1 | 0 | 0 |
| E2E (Playwright) | 0 | 0 | 0 | 1 | 0 | 0 |
| Build | 0 | 0 | 0 | 1 | 0 | 0 |
| Prisma Validate | 0 | 0 | 0 | 1 | 0 | 0 |
| Security (local) | 1 | 0 | 1 | 0 | 0 | 0 |
| Docker Build | 0 | 0 | 0 | 1 | 0 | 0 |

---

## Entregables Generados

- `01-scope-and-environment.md` — Scope, commit, versions, limitations
- `02-test-strategy.md` — Layers, decisions, commands, risks
- `03-test-matrix.md` — Detailed matrix by module
- `04-findings.md` — All findings with IDs and evidence
- `05-execution-log.md` — Commands, timestamps, exit codes
- `06-risk-register.md` — Technical and business risks prioritized
- `07-remediation-backlog.md` — Recommended work, dependencies, acceptance criteria
- `08-coverage-gaps.md` — What couldn't be tested and why
- `09-re-audit-matrix.md` — **S02 re-audit matrix** (2026-10-14): 6 categories
- `artifacts/` — Redacted logs, config snippets

---

## S02 — Re-audit Summary

| Category | Count | Change vs S01 |
|----------|-------|---------------|
| ✅ Fallos originales reparados y verificados | 4/16 | 25% |
| ❌ Fallos originales aún reproducibles | 12/16 | 75% |
| ⚠️ Regresiones nuevas | 0 | 0% |
| ⛔ Bloqueadas (cred/infra/permisos) | 9/62 | 14.5% |
| ⏭️ No ejecutadas | 14/62 | 22.6% |
| ❓ Riesgos humanos | 12/12 | — |

> S02 reposición: 4 suites API arregladas, 0 regresiones nuevas.

---

## Siguientes pasos

1. Corregir 4 suites API fallantes (missing `@types/jest`)
2. Arreglar ESLint v9 en 4 workspaces
3. Configurar DB de prueba para CI
4. Desacoplar E2E de producción
5. Implementar Turborepo para builds

---

## Limitations & Constraints

- **No live Supabase/PostgreSQL** — Prisma validation, integration tests, and E2E tests requiring DB cannot run locally
- **No Docker daemon** — Docker image builds not verified locally
- **No isolated test environment** — E2E tests use production URLs and real credentials
- **Node version mismatch** — Project targets Node 22 (`.nvmrc`, Dockerfiles); host runs Node 26.7.0
- **Windows/MSYS environment** — Some POSIX commands behave differently; path handling requires forward slashes
- **Audit-only mode** — No fixes applied; all findings documented for subsequent remediation phase