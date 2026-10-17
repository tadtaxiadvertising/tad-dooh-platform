# 05. Registro de ejecución

| # | Comando | Resultado | Código |
|---|---|---|---|
| 1 | `git status --porcelain` | Limpio | 0 |
| 2 | `pnpm lint` | Timeout (>180s) | 124 |
| 3 | `npm run test` (apps/api) | Timeout (>180s) | 124 |
| 4 | `npx jest --passWithNoTests` (apps/api) | Timeout | 124 |
| 5 | `npx jest src/modules/campaign/__tests__/campaign.service.spec.ts` | ✅ PASO | 0 |
| 6 | `npx tsc --noEmit` (apps/api) | ❌ 59 errores | 1 |
| 7 | `npm run build` (apps/api) | ❌ 59 errores | 1 |

---

**Verificado:** 2026-10-17
