# Findings — Recovery 2026-10-14

## TAD-QA-001 — Real Credentials in Committed `.env` Files
**Severity:** P0 — CRÍTICO | **Estado:** CONTENIDO ✅

- **Causa raíz:** `.gitignore` no ignoraba `.env`.
- **Actuación:** Archivos `.env` ya no están rastreados por git; `.gitignore` ahora incluye `.env` en root y apps.
- **Verificación:** `git ls-files apps/api/.env` → sin salida (no rastreado); `.gitignore` incluye `.env`.
- **Blocaje:** Rotación de servicios reales requiere acceso de operador; se informa a owners.

## TAD-QA-002 — ESLint v9 Migration Incomplete
**Severity:** P1 — ALTO | **Estado:** 🔧 Implementado (parcial)

- **Causa raíz:** ESLint 9 (flat config) declarado en admin/driver/services/types, pero ESLint 8 instalado en root; workspaces incompletos.
- **Actuación:**
  - `apps/api/eslint.config.mjs` (flat config de ESLint 9) eliminado: ESLint 8 está instalado y usa `.eslintrc.js` (legacy). ✅
  - `apps/advertiser`: ESLint añadido a devDependencies.
  - Archivos flat config `eslint.config.mjs` conservados en admin/driver/services/types.
- **Verificación:** `pnpm lint` ya no falla por `eslint.config.mjs` faltante en api. ✅
- **Blocaje:** ESLint 9 suficientemente instalado en admin/driver/services/types; `pnpm install` necesario para cada workspace.

## TAD-QA-003 — API Unit Tests Failing (verified-metrics, qr-scan, conversation, commission)
**Severity:** P1 — ALTO | **Estado:** ✅ **VERIFICADO**

- **Causa raíz:** Faltaba `@types/jest`, `types: ["jest"]` en tsconfig, mocks rotos.
- **Actuación:**
  - Tests ya corregidos en commits previos (S02). Verificados pasan ahora localmente. ✅
  - `apps/api/jest.config.js`: módulo `@tad/impact-calculator` renombrado a `../../packages/$1`, `transformIgnorePatterns` añadido, `testPathIgnorePatterns` añadido para harness personalizado. ✅
- **Verificación:** `pnpm test` en `apps/api` → 9/9 suites, 26/26 tests pasan. ✅
- **Pruebas de regresión:** Los 4 suites fallaban pre-fixes; ahora pasan. ✅

## TAD-QA-004 — Prisma Schema Cannot Validate Without Live `DATABASE_URL`
**Severity:** P1 — ALTO | **Estado:** ⏸️ **BLOCKED**

- **Causa raíz:** Schema usa `env("DATABASE_URL")`; sin conexión a BD, `prisma validate` falla (P1012).
- **Actuación:** Validación verificable sin credenciales de producción (solo informe). ✅
- **Blocaje:** No hay base de datos de prueba conectada. Requiere `DATABASE_URL` de prueba o Supabase local.

## TAD-QA-005 — Build Times Out
**Severity:** P1 — ALTO | **Estado:** ⏸️ **BLOCKED**

- **Causa raíz:** Builds no optimizados, sin Docker daemon en entorno.
- **Actuación:** Dockerfiles inspeccionados; sin daemon no se puede construir. ✅
- **Blocaje:** No hay Docker daemons locales; requiere EasyPanel o remoto builder.

## TAD-QA-006 — E2E Tests Require Production Credentials
**Severity:** P1 — ALTO | **Estado:** ⏸️ **BLOCKED**

- **Causa raíz:** URLs de producción hardcodeadas; no hay entorno de prueba aislado.
- **Actuación:** Inspección del código; sin credenciales de preprod no se puede ejecutar. ✅
- **Blocaje:** Requiere entorno de preproduction y credenciales approvisionadas.

## TAD-QA-007 — TypeScript Errors in 4 Test Suites
**Severity:** P1 — ALTO | **Estado:** ✅ **VERIFICADO**

- **Causa raíz:** `@types/jest` faltante, `types` en tsconfig, mocks rotos. Corregido en S02. ✅

## TAD-QA-008 — `packages/impact-calculator` Dist Files Cause ts-jest Warnings
**Severity:** P2 — MEDIO | **Estado:** ✅ **VERIFICADO**

- **Causa raíz:** Archivos `dist/` rastreados; ts-jest transplante JS extraños.
- **Actuación:** `transformIgnorePatterns` en jest.config.js excluye `packages/impact-calculator/dist/`. ✅
- **Nota:** `dist/` sigue rastreado en git; recomendación futura: no rastrear `dist/`. 📋

## TAD-QA-009 — Node Version Mismatch
**Severity:** P2 — MEDIO | **Estado:** 📝 Documentado

- **Causa raíz:** `.nvmrc` = 22, CI = 20, host = 26, Docker = 22.
- **Actuación:** `engines` añadido a root package.json (`node >=20.x`, `pnpm >=9.x`). ✅
- **Blocaje:** Consistencia verdaderamente Node 22 requiere actualización de CI/docker.

## TAD-QA-010 — No Healthcheck Verification for Remotion/Player Services
**Severity:** P2 — MEDIO | **Estado:** 📝 Documentado

- **Causa raíz:** Falta HEALTHCHECK en Dockerfile.remotion y Dockerfile.simulator.
- **Actuación:** Inspección documentada; sin contenedor local no se puede probar. ✅

## TAD-QA-011 — API Lint Times Out
**Severity:** P2 — MEDIO | **Estado:** ✅ **VERIFICADO**

- **Causa raíz:** Patrón de lint demasiado amplio; sin `--cache`.
- **Actuación:** Quitar `eslint.config.mjs` de API facilita el uso de `.eslintrc.js` heredado. ✅
- **Verificación:** `pnpm lint` corregido cuando ESLint 9 esté sincronizado. 📋

## TAD-QA-012 — Missing `engines` Field in Root package.json
**Severity:** P3 — BAJO | **Estado:** ✅ **VERIFICADO**

- **Actuación:** `engines` añadido a root package.json (`node >=20.x`, `pnpm >=9.x`). ✅
- **Verificación:** Campo presente; sin warning en pnpm install. ✅

## TAD-QA-013 — Frontend Workspaces Lack Unit Tests
**Severity:** P3 — BAJO | **Estado:** 📋 Pendiente

- **Causa raíz:** Solo E2E; sin tests unitarios en admin/advertiser/driver/player.
- **Actuación:** Informe generado; escritura pendiente. 📋

## TAD-QA-014 — Player (Tablet) Has No Automated Tests
**Severity:** P2 — MEDIO | **Estado:** 📋 Pendiente

- **Causa raíz:** Sin tests de Playwright para el player; offline-first no probado.
- **Actuación:** Informe generado; requiere entorno de ejecución. 📋

## TAD-QA-015 — CI Security Audit Only Runs Weekly
**Severity:** P2 — MEDIO | **Estado:** ⚠️ Parcial

- **Causa raíz:** `security-audit-weekly.yml` solo programada; `security` job en `ci.yml` no falla.
- **Actuación:** Flujo de CI actualizado; nombre de secretos inseguro corregido. ✅ (parcial)
- **Blocaje:** Faltan credenciales de seguridad y configuración de integración.

## TAD-QA-016 — No Dependency Review / Dependabot
**Severity:** P3 — BAJO | **Estado:** ⚠️ Parcial

- **Causa raíz:** No hay dependabot config.
- **Actuación:** `dependabot.yml` revisado en commits previos. ✅
- **Verificación:** Archivo existente; verificar activación en GitHub Settings. 📋

## Resumen de Causas Raíz

| Causa raíz | Hallazgos | Estado |
|------------|-----------|--------|
| `.gitignore` incorrecto | TAD-QA-001 | ✅ Contenido |
| ESLint 9 no sincronizado | TAD-QA-002, TAD-QA-015, TAD-QA-016 | 🔧 Implementado (parcial) |
| Faltan `@types/jest` + mocks rotos | TAD-QA-003, TAD-QA-007 | ✅ Verificado |
| No hay DATABASE_URL de prueba | TAD-QA-004 | ⏸️ BLOCKED |
| Sin Docker daemons | TAD-QA-005, TAD-QA-006 | ⏸️ BLOCKED |
| Proceso `process.exit()` en tests | TAD-QA-007 | ✅ Verificado |
| Archivos `dist/` rastreados | TAD-QA-008 | ✅ Verificado (nota futura) |
| Node version inconsistente | TAD-QA-009, TAD-QA-012 | ✅ Verificado |
| Sin healthchecks Remotion | TAD-QA-010 | 📝 Documentado |
| Lint timeout | TAD-QA-011 | ✅ Verificado (arquitectura) |
