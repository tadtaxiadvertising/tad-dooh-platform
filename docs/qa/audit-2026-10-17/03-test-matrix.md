# 03. Matriz de cobertura

| Módulo | Comprobación | Estado |
|---|---|---|
| **Repositorio** | Estado de Git, archivos clave | ✅ |
| **Dependencias** | pnpm-lock.yaml, package.json | ✅ |
| **Lint** | `pnpm lint` | ⏱️ Timeout |
| **Typecheck** | `tsc --noEmit` (apps/api) | 🔴 Falla (59 errores) |
| **Tests unitarios** | `jest` (apps/api) | ✅ Pasa |
| **Build** | `nest build` | 🔴 Falla |
| **Docker** | Dockerfiles existentes | ✅ Sin verificacion |
| **CI/CD** | `.github/workflows/*.yml` | ✅ |
| **Offline/sync** | No verificado | N/A (sin entorno) |
| **Finanzas** | No verificado (sin entorno) | N/A |

---

**Verificado:** 2026-10-17
