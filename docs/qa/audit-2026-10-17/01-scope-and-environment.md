# 01. Scope y Entorno

## 1.1 Recurso auditado
- **Repositorio:** `tadtaxiadvertising/tad-dooh-platform`
- **Rama:** `fix/dockerfile-api-build`
- **Commit:** `6b266cae` `ci: fix dynamic needs.*.result expression in Summary job`

## 1.2 Configuración del entorno
- **Sistema:** Windows 11 (git-bash/MSYS)
- **Node.js:** v26.7.0
- **pnpm:** ~9.x
- **Manager de paquetes:** pnpm (workspaces)
- **Base de datos:** Supabase/PostgreSQL (no accedida en este auditoría)

## 1.3 Exenciones de auditoría
| Exención | Justificación |
|---|---|
| No acceder a base de datos | Ambiente sin servicio de produccion |
| No ejecutar pruebas contra produccion | Inseguro |
| No usar credenciales reales | Reglas de seguridad del skill |
| No ejecutar pruebas en dispositivos reales | Sin autorizacion |

## 1.4 Archivos útiles localizados
| Archivo | Tipo |
|---|---|
| `pnpm-lock.yaml` | Lockfile pnpm |
| `pnpm-workspace.yaml` | Configuración de workspaces |
| `.github/workflows/ci.yml` | CI/CD |
| `.github/workflows/docker-image.yml` | CI/CD (build Docker) |
| `apps/api/package.json` | App API |
| `apps/api/src/...` | Código fuente API |
| `Dockerfile.api` | Docker API |
| `Dockerfile.admin` | Docker Admin |

---

**Verificado:** 2026-10-17
