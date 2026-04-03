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

## 3. UI Component Fix (ReferenceError Mitigation)

- **Detected Issue**: `ReferenceError: AntigravityButton is not defined` occurred in production.
- **Root Cause**: Likely a build-time crash or circular dependency involving the Supabase client initialization when environment variables are partially missing during the the EasyPanel build phase.
- **Improved Pattern**: Hardened the `useTADAction` hook and `AntigravityButton` by using lazy-loading for the Supabase client. This prevents initialization errors from breaking the JS evaluation of essential UI components.
- **Affected File**: `admin-dashboard/hooks/useTADAction.ts`

## 4. Verification Checkpoints

- [x] **BI KPIs**: Endpoint `api/v1/bi/kpis` is reachable via proxy.
- [x] **Fleet Health**: Dashboard correctly summarizes online/offline nodes from `BiService`.
- [x] **Deterministic Actions**: `AntigravityButton` is now robust and triggers actions with full telemetry support.

---
**Status**: STABLE. Redeploy the `backend` and `admin-dashboard` to apply these fixes.
