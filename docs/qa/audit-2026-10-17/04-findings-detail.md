# 04. Hallazgos — Detalle de evidencia

## TAD-QA-001: 59 errores de tipo en apps/api
- **Severidad:** P1 (alta)
- **Estado:** CONFIRMADO
- **Comando:** `npx tsc --noEmit` (apps/api)
- **Evidencia:**
  - `payment-intent.controller.ts:94` — TS1272 (`import type` faltante)
  - `payment-evidence.service.ts:344,425` — TS2322 (`'string | null'` no es `'string'`)
  - `qr-scan.controller.ts:31` — TS1272 (`import type` faltante)
  - `sheets.controller.ts:43` — TS1272 (`import type` faltante)
  - `supabase.service.ts:149` — TS2322 (`'string | null'` no es `'string | undefined'`)
  - `sync.controller.ts:48` — TS1272 (`import type` faltante)
  - `sync.service.ts:106` — TS2322 (`'boolean | null'` no es `'boolean'`)
  - `verified-metrics.service.ts:161` — TS2322 (`'string | null'` no es `'string'`)

## TAD-QA-002: Timeout en lint
- **Severidad:** P2 (media)
- **Estado:** CONFIRMADO
- **Comando:** `pnpm lint`
- **Evidencia:** Timeout (>180s), no se pudo obtener resultado

## TAD-QA-003: Build falla por errores de tipo
- **Severidad:** P1 (alta)
- **Estado:** CONFIRMADO
- **Comando:** `npm run build` (apps/api)
- **Evidencia:** 59 errores (0 exito = 59 fallo)

---

**Verificado:** 2026-10-17
