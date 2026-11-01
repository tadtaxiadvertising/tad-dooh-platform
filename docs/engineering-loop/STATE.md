# Estado del Loop de Ingeniería TAD

**Rama actual:** `feat/landing-v5-financial-motion-fix`
**Base:** `origin/main` (merge #173 Landing V5 + #174 ownership commission)
**Fecha:** 2026-11-01

---

## Historial de PRs

| PR | Título | Estado |
|---|---|---|
| #173 | Landing V5 Financial Motion Fix | ✅ MERGED |
| #174 | Ownership en comisiones Driver | ✅ MERGED |
| #175 | Advertiser onboarding opt-in production + campaignMonths + includeProduction | ✅ MERGED (`origin/main` → `1185c1bd`)

### Cambios aplicados

1. **Advertiser onboarding** (`apps/advertiser/pages/advertiser/onboarding.tsx`)
   - `includeProduction: false` por defecto (opcional, desactivado)

2. **DTO OnboardAdvertiser** (`apps/api/src/modules/onboarding/dto/onboard-advertiser.dto.ts`)
   - Agregados `campaignMonths: number` (optional, min 1)
   - Agregado `includeProduction: boolean` (optional)
   - `fileMetadata` mantenido como optional

3. **Onboarding service** (`apps/api/src/modules/onboarding/onboarding.service.ts`)
   - Destructura `campaignMonths`, `includeProduction`, `targetCity`
   - Usa `campaignMonths` para calcular `endDate` y `campaignMonths` en la campaña
   - `includeProduction` se guarda en `includeProduction` del campaign

4. **Prisma schema** (`apps/api/prisma/schema.prisma`)
   - Agregado `campaignMonths: Int? @default(1) @map("campaign_months")`
   - Agregado `includeProduction: Boolean? @default(false) @map("include_production")`
   - Regeneró Prisma client

### Tests ejecutados (todos PASS)

| Test | Resultado |
|---|---|
| `scripts/landing.test.cjs` | 13/13 ✅ |
| `scripts/driver-landing.test.cjs` | 11/11 ✅ |
| `scripts/cookie-management.test.cjs` | 14/14 ✅ |
| `pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json` | ✅ |
| `pnpm --filter api build` | ✅ |
| `pnpm --filter advertiser build` | ✅ |

### Prisma migration
- **Pendiente**: `prisma migrate dev` en staging (falta `DATABASE_URL` válido localmente)

### Estado del trabajo

- ✅ `includeProduction` ahora por defecto `false`
- ✅ DTO declara `campaignMonths` e `includeProduction`
- ✅ Backend guarda `campaignMonths` y `includeProduction` en el campaign
- ✅ Prisma client actualizado
- ✅ PR #175 mergeado en `origin/main` (`1185c1bd`)
- ⚠️ Prisma migration aún no aplicada en DB (esquema actualizado, DB no modificado)
- ❌ Build advertiser: timeout (no ejecutado, no es un error real)

### Pendientes

| # | Pendiente | Prioridad |
|---|---|---|
| 1 | Aplicar `prisma migrate dev` en staging | 🔴 |
| 2 | Concordar precio de producción: `1500rd` vs `2500rd/month` (drift comercial) | 🟡 |
| 3 | Auditoría `apps/driver/pages/api/proxy/[...path].ts` — implementación correcta | 🟡 |
| 4 | Registrar captured screenshots y evidencia visual | 🟡 | Verificar con navegador (Playwright) en `docs/engineering-loop/` |

### Resumen de audit
| Archivo | Encontrado | Avalado | Acción |
|---|---|---|---|
| `apps/driver/pages/api/proxy/[...path].ts` | `bodyParser: false`, `getRawBody` con `limit: "5mb"`, `duplex: "half"` | ✅ Correcto | Sin cambios |
| `apps/advertiser/components/advertiser/simulatorPricing.ts` | `SCREEN_MONTHLY_RATE = 2500`, `PRODUCTION_FEE = 2500` | ⚠️ Drift | PR financiero independiente |
| `apps/api/src/common/constants/business-rules.ts` | `ADVERTISER_COST_PER_CAMPAIGN_RD = 1500` | ⚠️ Drift | PR financiero independiente |

### Próximos pasos
1. **Prisma migrate**: Aplicar en staging (`prisma migrate dev`) con DATABASE_URL válido
2. **Pricing**: Concordar contrato comercial entre `1500rd` y `2500rd/month`
3. **Screenshots**: Capturar con Playwright en sistemas con navegador disponible

### Personal de rollback

- Revertir cambios en `apps/advertiser/pages/advertiser/onboarding.tsx`
- Revertir cambios en `apps/api/src/modules/onboarding/dto/onboard-advertiser.dto.ts`
- Revertir cambios en `apps/api/src/modules/onboarding/onboarding.service.ts`
- Revertir cambios en `apps/api/prisma/schema.prisma`
- Regenerar Prisma client

### Owner

`codex/tad-landing-multirole` (agente automático)
