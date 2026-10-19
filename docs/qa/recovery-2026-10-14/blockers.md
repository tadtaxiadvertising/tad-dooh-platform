# Blockers — Recovery 2026-10-14

## Bloqueantes (Requieren Acción Externa)

| Bloqueador | Gravedad | Impacto | Próxima Acción |
|-------------|----------|---------|----------------|
| **DATABASE_URL** (test) | P1 | `prisma validate` no correr; CI gate prisma cerrado | Proporcionar URL de BD de prueba o Supabase local |
| **Docker daemon** | P1 | Builds y E2E imposibles; archivos DOCKERFILES validados estáticamente | Instalar Docker en el entorno o usar EasyPanel build service |
| **Credenciales de preprod/E2E** | P1 | Ensayos de E2E no se pueden ejecutar | Provisionar preprod; aprovisionar credenciales |
| **ESLint 9 no sincronizado** | P2 | Configuración inconsistente entre workspaces | Reinistrar node_modules en admin/driver/services/types, y usar ESLint 9 |
| **TypeScript errors en API** | P2 | Preventions de CI y builds fallidos | Corregir errores de tipo en api source |

## No Bloqueantes (Mejora / Próximo Paso)

| Mejora | Gravedad | Descripción |
|--------|----------|-------------|
| Frontend unit tests (admin/advertiser/driver/player) | P3 | Cobertura de lógica de negocio sin pruebas |
| Player E2E | P2 | Sin tests de Playwright para player |
| Dependabot / dependency review | P3 | Configuración de actualización automática |
| Healthchecks Remotion/Simulator | P2 | Agregar HEALTHCHECK a Dockerfile |
| Engine de preciado / performance baseline | P2 | Baseline de rendimiento |

## Estado de Bloqueos

| Bloqueador | Solucionando | Estatus |
|-------------|--------------|---------|
| DATABASE_URL | Backend / Infra | ⏸️ Pendiente |
| Docker daemon | Infra | ⏸️ Pendiente |
| Credenciales de preprod | QA | ⏸️ Pendiente |
| ESLint 9 | Dev | 🔧 En progreso |
| TypeScript | Dev | 🔧 Pendiente |
