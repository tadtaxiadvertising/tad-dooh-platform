# TAD DOOH Platform Stabilization v6.5.2

During this cycle, we successfully resolved a critical 404 error blocking the Business Intelligence (BI) dashboard and addressed a ReferenceError affecting high-performance UI components.

## 1. Resolved BI API 404 Error (Routing Alignment)

- **Detected Issue**: Frontend requests to `/api/proxy/bi/kpis` were failing with 404.
- **Root Cause**: The backend `BiController` was incorrectly decorated with `@Controller('api/bi')`. Combined with the global `api/v1` prefix defined in `main.ts`, the final endpoint was being served at `api/v1/api/bi/kpis`.
- **Fix Applied**: Refactored `BiController` to use `@Controller('bi')`. This aligns the route correctly with the global prefix, resulting in the correct endpoint: `api/v1/bi/kpis`, matching the frontend proxy's expectation.
- **Affected File**: `backend/src/modules/bi/bi.controller.ts`

## 2. Infrastructure Resilience (Frontend Proxy)

- **Verification**: Confirmed that `admin-dashboard/pages/api/proxy/[...path].ts` accurately forwards requests to the backend with the correct `/api/v1/` injection.
- **Environment Handling**: Verified that `BACKEND_INTERNAL_URL` is used at runtime to bypass build-time DNS issues common in VPS environments with limited memory.

## [v6.5.5] - 2026-04-03

### Stabilización BI Robustness & Routing Correction

- **Backend (BI Module)**: Corregidos decoradores de ruta redundantes (`api/bi` -> `bi`) para alinearse con el prefijo global `api/v1`.
- **Backend (BiService)**: Implementada lógica de "Graceful Fallback". Si la tabla `BiDashboardSnapshot` no existe (migración pendiente), el sistema calcula métricas en tiempo real en lugar de fallar con 500 Internal Server Error.
- **Backend (Build)**: Optimizada la Dockerfile de NestJS con `npm ci` y limpieza de caché para prevenir fallos por OOM (Out Of Memory) en VPS de 512MB RAM.
- **Frontend (Admin)**: Verificada la integridad de importaciones de `AntigravityButton` en las vistas de Fleet y BI para resolver errores de referencia en el bundle de producción.
- **Documentation**: Actualizado `AUDITORIA_TAD_2026.md` para reflejar el estado actual de los módulos de inteligencia de negocio.
- **CI/CD**: Recomendación de despliegue con "Clear Cache" en EasyPanel ante posibles capas corruptas de Docker.

---
 **Affected File**: `admin-dashboard/hooks/useTADAction.ts`

## 4. Verification Checkpoints

- [x] **BI KPIs**: Endpoint `api/v1/bi/kpis` is reachable via proxy.
- [x] **Fleet Health**: Dashboard correctly summarizes online/offline nodes from `BiService`.
- [x] **Deterministic Actions**: `AntigravityButton` is now robust and triggers actions with full telemetry support.

---
**Status**: STABLE. Redeploy the `backend` and `admin-dashboard` to apply these fixes.
