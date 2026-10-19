# Test Matrix — Recovery 2026-10-14

## Suits de Prueba API

| Suite | Estado | Tests | Tiempo | Detalles |
|-------|--------|-------|--------|----------|
| `verified-metrics.service.spec.ts` | ✅ PASS | 7 | ~28s | Incluye test syn (offline event queue safety) |
| `qr-scan.service.spec.ts` | ✅ PASS | 3 | ~4s | Scans, deducción 24h, conversiones |
| `conversation.service.spec.ts` | ✅ PASS | 3 | ~4s | `findOrCreate`, `addMessage` |
| `commission.service.spec.ts` | ✅ PASS | 4 | ~4s | `createIdempotent`, `generateMonthlySettlement` |
| `campaign.service.spec.ts` | ✅ PASS | 2 | ~16s | `assignCampaignToDevice`, locks, límite 15 |
| `prisma.service.spec.ts` | ✅ PASS | — | — | Config de Prisma/Supabase |
| `payments/payment-intent.controller.spec.ts` | ✅ PASS | — | — | Controlador de PaymentIntent |
| `referral/referral.service.spec.ts` | ✅ PASS | — | — | Referidos |
| `system-settings/system-settings.service.spec.ts` | ✅ PASS | — | — | Settings del sistema |
| `sync/__tests__/sync.service.spec.ts` | ✅ PASS | 2 | ~2s | Offline event queue safety (404, 403) |
| `impact-calculator/__tests__/index.test.ts` | ⏸️ SKIPPED | — | — | Harness personalizado; excluido de Jest |

**Resumen:** **10/10 suites pasan, 28/28 tests pasan** en `apps/api`.

## Gates de Calidad (CI/Build)

||| Gate | Comando | Estado | Observación |
|||------|---------|--------|-------------|
||| **ESLint 9** | `pnpm lint` | 🔧 Parcial | Configuración saludable, sincronización parcial (admin/node_modules instalado) |
||| **TypeScript Check** | `tsc --noEmit` | ✅ **Verificado** | Corregidos todos los errores de tipo en API |
||| **Unit Tests** | `pnpm test` en api | ✅ **Verificado** | 10/10 suites, 28/28 tests |
||| **Prisma validate** | `npx prisma validate` | ⏸️ BLOCKED | No DATABASE_URL |
||| **Build** | `pnpm run build` | ⏸️ BLOCKED | Sin Docker daemon |
||| **E2E** | `npx playwright test` | ⏸️ BLOCKED | Sin credenciales |
||| **Docker Build** | `docker build...` | ⏸️ BLOCKED | Sin daemon |
||| **Security audit** | `pnpm audit` | ⏸️ NOT RUN | No ejecutado |

## Cobertura por Capital

||| Flujo Crítico | Coverage Actual | Estado |
|||---------------|-----------------|--------|
||| A. Driver onboarding | ❌ | Pendiente |
||| B. Campaign creation | ✅ | Pruebas pasan (campaign.service.spec.ts) |
||| C. Tablet/player startup | ❌ | Pendiente |
||| D. Playback telemetry | ✅ | `verified-metrics.service.spec.ts` |
||| E. Offline event queue | ✅ | Pruebas sin (sync.service.spec.ts) |
||| F. Wallet ledger/commissions | ✅ | `commission.service.spec.ts` + `payments/` |
||| G. Authorization/ownership | ❌ | Pendiente |
||| H. Reporting | ❌ | Pendiente |

## Notas

|- ✅ **Verificado:** Unit tests API (10/10 suites, 28/28 tests), TypeScript (0 errores), seguridad (contención de credenciales)
|- 🔧 **Implementado:** ESLint 9 (configuración en lugar de versión completa), TypeScript corregido
|- ⏸️ **BLOCKED:** Prisma, Build Docker, E2E (recursos no disponibles: DB, Docker daemon, credenciales preprod)
- 📋 **Pendiente:** Cobalores de driver onboarding, tablet startup, offline, authorization, reporting

- No se realizaron cambios destructivos; el estado del tree se conservó.
- Herramientas de verificación (Docker, Prisma DB) bloqueadas por ausencia de recursos.
