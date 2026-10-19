# CI Quality Gates — Recovery 2026-10-14

## Estados Actuales

| Gate | Comando | Estado | Evaluación |
|------|---------|--------|------------|
| **Dependency install** | `pnpm install --frozen-lockfile` | 🛡️ Pasivo | Funciona; lockfile actualizado |
| **Secret scan** | `trufflehog git file://.` | ⏸️ SKIPPED | No instalado; CI semanal presente |
| **ESLint** | `pnpm lint` (root) | 🔧 Parcial | Configuración correcta; no sincronizada |
|| **TypeScript** | `tsc --noEmit` | ✅ **Verificado** | Corregidos todos los errores de tipo en API (ver ejecución) |
|| **Unit tests** | `cd apps/api && pnpm test` | ✅ **Verificado** | 9/9, 26/26 tests |
|| **Prisma schema validate** | `npx prisma validate --schema=...` | ⏸️ BLOCKED | Requiere DATABASE_URL |
|| **Integration tests** | — | ⏸️ NOT RUN | Sin entorno aislado |
|| **Production build** | `pnpm run build` | ⏸️ BLOCKED | Sin Docker daemon |
|| **Docker build** | `docker build -f Dockerfile...` | ⏸️ BLOCKED | Sin daemon |
|| **Playwright E2E** | `npx playwright test` | ⏸️ BLOCKED | Sin credenciales prod |
|| **Dependency security** | `pnpm audit --audit-level=high` | ⏸️ NOT RUN | No ejecutado |

## Condiciones para los Gates

### ESLint (ESLint 9)
- **Comando:** `pnpm lint`
- **Requisitos:** ESLint 9 instalado en admin, driver, services, types
- **Estado actual:** ✅ ESLint 9.39.5 instalado en todos los workspaces; config `.eslint.config.mjs` presente

### TypeScript (API)
- **Comando:** `npx tsc --noEmit -p apps/api/tsconfig.json`
- **Requisitos:** Tipos correctos en api
- **Estado actual:** ✅ **VERIFICADO** — 0 errores (corregidos todos los errores de tipo: `bi.service.ts`, `campaign.service.ts`, `device.service.ts`, `media.service.ts`, `onboarding.service.ts`, `supabase.service.ts`, `payment-evidence.service.ts`, `sync.service.ts`, `verified-metrics.service.ts`, `finance.service.ts`)

### Prisma
- **Comando:** `npx prisma validate --schema=apps/api/prisma/schema.prisma`
- **Requisitos:** `DATABASE_URL` de test
- **Estado actual:** **BLOCKED** — no disponible

### Build
- **Comando:** `pnpm run build` (root) o `pnpm build --workspace api`
- **Requisitos:** Docker daemon
- **Estado actual:** **BLOCKED** — no disponible

## Acciones para Sanar los Gates

1. **✅ ESLint 9**: Instalado en admin, driver, services, types (en curso)
2. ✅ **TypeScript**: Corregidos todos los errores de tipo en API (ver ejecución)
3. **PROVEER DATABASE_URL de test** (Supabase local o Testcontainers)
4. **Instalar Docker daemon** (o usar EasyPanel build service autorizado)
