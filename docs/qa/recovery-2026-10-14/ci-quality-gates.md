# CI Quality Gates — Recovery 2026-10-14

## Estados Actuales

| Gate | Comando | Estado | Evaluación |
|------|---------|--------|------------|
| **Dependency install** | `pnpm install --frozen-lockfile` | 🛡️ Pasivo | Funciona; lockfile actualizado |
| **Secret scan** | `trufflehog git file://.` | ⏸️ SKIPPED | No instalado; CI semanal presente |
| **ESLint** | `pnpm lint` (root) | 🔧 Parcial | Configuración correcta; no sincronizada |
| **TypeScript** | `tsc --noEmit` | ❌ Falla | Errores de tipo en API (ver más abajo) |
| **Unit tests** | `cd apps/api && pnpm test` | ✅ **Verificado** | 9/9, 26/26 tests |
| **Prisma schema validate** | `npx prisma validate --schema=...` | ⏸️ BLOCKED | Requiere DATABASE_URL |
| **Integration tests** | — | ⏸️ NOT RUN | Sin entorno aislado |
| **Production build** | `pnpm run build` | ⏸️ BLOCKED | Sin Docker daemon |
| **Docker build** | `docker build -f Dockerfile...` | ⏸️ BLOCKED | Sin daemon |
| **Playwright E2E** | `npx playwright test` | ⏸️ BLOCKED | Sin credenciales prod |
| **Dependency security** | `pnpm audit --audit-level=high` | ⏸️ NOT RUN | No ejecutado |

## Condiciones para los Gates

### ESLint

- **Comando:** `pnpm lint`
- **Requisitos:** ESLint 9 sincronizado en todos los workspaces; `.eslintrc.js` (per files) en api
- **Estado actual:** Configuración válida; ESLint 8 y 9 coexisten; reinstalación pendiente de workspaces

### TypeScript

- **Comando:** `npx tsc --noEmit -p apps/api/tsconfig.json`
- **Requisitos:** Tipos correctos en api
- **Estado actual:** Errores tipo detectados (ver ejecución)

### Prisma

- **Comando:** `npx prisma validate --schema=apps/api/prisma/schema.prisma`
- **Requisitos:** `DATABASE_URL` de test
- **Estado actual:** **BLOCKED** — no disponible

### Build

- **Comando:** `pnpm run build` (root) o `pnpm build --workspace api`
- **Requisitos:** Docker daemon
- **Estado actual:** **BLOCKED** — no disponible

## Acciones para Sanar los Gates

1. **Reinstalar node_modules** en admin, driver, services, types (ESLint 9 no sincronizado)
2. **Corregir TypeScript** en api source
3. **Proveer DATABASE_URL de test** (Supabase local o Testcontainers)
4. **Instalar Docker daemon** (o usar EasyPanel build service autorizado)
