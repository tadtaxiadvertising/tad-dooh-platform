# Test Matrix — Recovery 2026-10-14

## Suits de Prueba API

| Suite | Estado | Tests | Tiempo | Detalles |
|-------|--------|-------|--------|----------|
| `verified-metrics.service.spec.ts` | ✅ PASS | 5 | ~26s | Verificado, deduplicación, anómalos |
| `qr-scan.service.spec.ts` | ✅ PASS | 3 | ~4s | Scans, deducción 24h, conversiones |
| `conversation.service.spec.ts` | ✅ PASS | 3 | ~4s | `findOrCreate`, `addMessage` |
| `commission.service.spec.ts` | ✅ PASS | 4 | ~4s | `createIdempotent`, `generateMonthlySettlement` |
| `campaign.service.spec.ts` | ✅ PASS | 2 | ~16s | `assignCampaignToDevice`, locks, límite 15 |
| `prisma.service.spec.ts` | ✅ PASS | — | — | Config de Prisma/Supabase |
| `payments/payment-intent.controller.spec.ts` | ✅ PASS | — | — | Controlador de PaymentIntent |
| `referral/referral.service.spec.ts` | ✅ PASS | — | — | Referidos |
| `system-settings/system-settings.service.spec.ts` | ✅ PASS | — | — | Settings del sistema |
| `impact-calculator/__tests__/index.test.ts` | ⏸️ SKIPPED | — | — | Harness personalizado; excluido de Jest |

**Resumen:** **9/9 suites pasan, 26/26 tests pasan** en `apps/api`.

## Gates de Calidad (CI/Build)

| Gate | Comando | Estado | Observación |
|------|---------|--------|-------------|
| **ESLint 9** | `pnpm lint` | 🔧 Parcial | Configuración saludable, no sincronizada |
| **TypeScript Check** | `tsc --noEmit` | ❌ Falla | Errores de tipo en API (ver ejecución) |
| **Unit Tests** | `pnpm test` en api | ✅ **Verificado** | 9/9, 26/26 tests |
| **Prisma validate** | `npx prisma validate` | ⏸️ BLOCKED | No DATABASE_URL |
| **Build** | `pnpm run build` | ⏸️ BLOCKED | Sin Docker daemon |
| **E2E** | `npx playwright test` | ⏸️ BLOCKED | Sin credenciales |
| **Docker Build** | `docker build...` | ⏸️ BLOCKED | Sin daemon |
| **Security audit** | `pnpm audit --audit-level=high` | ⏸️ NOT RUN | No ejecutado |

## Cobertura por Capital

| Flujo Crítico | Coverage Actual | Estado |
|---------------|-----------------|--------|
| A. Driver onboarding | ❌ | Pendiente |
| B. Campaign creation | ✅ | Pruebas pasan (campaign.service.spec.ts) |
| C. Tablet/player startup | ❌ | Pendiente |
| D. Playback telemetry | ✅ | `verified-metrics.service.spec.ts` |
| E. Offline event queue | ❌ | Pendiente |
| F. Wallet ledger/commissions | ✅ | `commission.service.spec.ts` + `payments/` |
| G. Authorization/ownership | ❌ | Pendiente |
| H. Reporting | ❌ | Pendiente |

## Notas

- La cobertura de *financial* y *core API* está verificada.
- No se realizaron cambios destructivos; el estado del tree se conservó.
- Herramientas de verificación (Docker, Prisma DB) bloqueadas por ausencia de recursos.
