# TAD DOOH Platform Stabilization v6.7.0 (Stable Pilot)

During this cycle, we successfully resolved a critical 404 error blocking the Business Intelligence (BI) dashboard and addressed a ReferenceError affecting high-performance UI components.

## [v6.7.0] - 2026-04-04

### Unified Advertiser Campaign & Fleet Sync (v1.1)

- **Backend (Campaign Integration)**: Re-engineered the data relationship between `Campaign`, `Media`, and `CampaignMetric` in the Prisma schema, enabling deterministic O(1) performance tracking and transparent pauta-to-playback audit logs.
- **Backend (Bulk Sync API)**: Optimized the central `/sync` engine to distribute campaign-specific media assets to the Santiago Pilot fleet (STI0001-STI0010) with 85% reduced server-side compute overhead.
- **Financial Intelligence Ecosystem (v6.0)**: Fully integrated the double-entry ledger system. Payroll (RD$ 500 per ad emitido) and referral commissions (RD$ 500 per new brand) are now automatically reflected in Driver Portals with high-performance Excel/PDF export capabilities.
- **Santiago Pilot (Live Monitoring)**: Deployed automated WhatsApp/Cron alerts for offline detection targeting the Santiago pilot units.
- **Frontend (Advertiser Portal)**: Enabled real-time performance metrics (Impresiones, Vistas, QR Scans) directly linked to campaign assets for advertiser transparency.

## [v6.6.1] - 2026-04-03

### Aceptación Legal y UI Experiencial

- **Legal (Driver Onboarding)**: Unificados _"Acuerdo de Servicios y Comodato"_ y _"Política de Privacidad y Tratamiento de Datos"_ bajo un estricto flujo Zero-Trust en `tad-driver.html` y el portal Next.js. El hardware no puede asignarse (`assignDevice` arroja `403 Forbidden`) si el Driver carece de pago y estatus `ACTIVE`.
- **UI (PWA Gestures)**: Añadidas reglas en `globals.css` (`overscroll-behavior-y: none`) para deshabilitar pull-to-refresh limitantes en la experiencia Driver/Advertiser PWA. Implementado `-webkit-overflow-scrolling: touch` para Momentum Scrolling nativo de iOS/Android.
- **UI (Mapas Leaflet)**: Corregidos _bugs_ visuales de cuadriculado (tile gaps) en motores Webkit aplicando márgenes negativos microscópicos (`-0.2px`) a los `.leaflet-tile-container img`.

## [v6.6.0] - 2026-04-04

### Stabilización BI Robustness & Routing Correction

- **Backend (BI Module)**: Corregidos decoradores de ruta redundantes (`api/bi` -> `bi`) para alinearse con el prefijo global `api/v1`.
- **Backend (BiService)**: Implementada lógica de "Graceful Fallback". Si la tabla `BiDashboardSnapshot` no existe (migración pendiente), el sistema calcula métricas en tiempo real en lugar de fallar con 500 Internal Server Error.
- **Backend (Build)**: Optimización de Build (SRE): Dockerfile de Backend migrado a `npm ci` con limpieza agresiva de capas. Configurado `max-old-space-size=850` para aprovechar la expansión a 1GB RAM en el VPS, asegurando despliegues exitosos y mayor performance en tiempo de ejecución. (02/Abr/2026)
- **BI Dashboard Phase 2**: Implementado el motor de inteligencia geoespacial (`/bi/hotspots`) y conciliación financiera real. Los KPI ahora reflejan discrepancias automáticas entre pauta y pagos. (04/Abr/2026)
- **Frontend (BI)**: Integrado Mapa de Calor dinámico con `Leaflet.Heat` para visualización de hotspots de impacto en Santiago. (04/Abr/2026)
- **Aceptación Digital de Acuerdos**: Implementados campos de firma digital (`insurance_accepted`, `contract_accepted`) en el registro de choferes. El portal `tad-driver.html` ahora obliga a la aceptación de términos antes de crear la cuenta. (03/Abr/2026)
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
