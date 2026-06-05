# 📜 CHANGELOG & LOGS - TAD DOOH PLATFORM

> **Última Actualización**: 2026-06-05

---

## [DOC-13-v13.1] - 2026-06-05

### 📚 DOC: Major Audit & Expansion of Doc 13 — Prisma Schema & Database Architecture

- **Cambio**: Reescritura comprehensiva del documento 13 (1,010→1,577 líneas). Corrección de errores críticos y adición de 8 nuevas secciones que representan brechas significativas entre la documentación original y el estado actual del código.
- **Correcciones Críticas**:
  - Model count corregido: 36 modelos + 1 enum (no 32 como indicaba)
  - Wallet `onDelete` corregido: **RESTRICT** (no Cascade — era un error que implicaba que se podía borrar drivers con wallets)
  - `FinancialTransaction.reference` corregido: **nullable** (no required — cambia la semántica de idempotencia)
  - `Campaign.status` default en embedded client: `"DRAFT"` vs `"PENDING_PAYMENT"` en schema (staleness risk documentado)
- **Campos Faltantes Documentados (56+)**:
  - Driver: 24 campos (legal compliance gate, level/tier system, penalty escalation, self-ref relations, identidadVehicular, hardwareConfig)
  - Campaign: 17 campos (dual-status active+status, 5 targeting modes, social/delivery links, createdById, version, category)
  - Device: 15 campos (storageUsed/Total/Free, authToken, appVersion, lastSyncSuccess, lastPlayback, lastOnline)
  - PayrollPayment: penaltyPercentage, referenceNum, paidAt, indexes
  - Subscription: plan (required!), paymentMethod, notes
  - Advertiser: phone, status, pedidosYaUrl, uberEatsUrl, 5 outbound relations
  - PortalRequest: onDelete Cascade, 4 indexes, timestamps
  - ContractAcceptance: driverId index, compliance gate reference
- **8 Nuevas Secciones**:
  - §7: `mv_active_campaigns` materialized view + 6-channel targeting SQL + refresh lifecycle
  - §8: RLS policies (8 tables, 17 policies) + advertiser geofence dependency cycle
  - §9: Shadow indexes (production + simulation) + cleanup procedure
  - §10: Raw SQL patterns (Wallet SELECT FOR UPDATE, Analytics hourly aggregation, Health check)
  - §11: Migration history (7 migrations documented) + zero-downtime strategy + rollback procedures + PostGIS lifecycle
  - §12: onDelete behavior map (20 Cascade + 4 Restrict, with Prisma vs DB contradiction documented)
  - §13: Generated client staleness risk (5 divergences between inlineSchema and schema.prisma)
  - §14: @@map convention (13 model-to-table mappings for raw SQL)

---

## [DOC-13-16] - 2026-06-05

### 📚 DOC: Expansión de Documentación Técnica — 4 Nuevos Documentos de Referencia
- **Cambio**: Creados 4 documentos de referencia técnicos faltantes en la secuencia de documentación del proyecto (13-16), llenando brechas críticas entre los docs existentes (01-12) y el estado actual del código.
- **Archivos tocados**:
  - `13_prisma_schema_database_architecture.md` — Referencia completa del schema Prisma (32 modelos), índices, relaciones, patrones de query, connection pooling, y glosario.
  - `14_testing_strategy_qa_protocol.md` — Pirámide de testing, E2E (Playwright), Unit (Jest), Integration (Supabase Local), Load Testing, QA checklist, bug template.
  - `15_api_endpoints_reference.md` — ~135 endpoints documentados con método, ruta, auth level, parámetros, guards, interceptors, y respuesta structure.
  - `16_cicd_pipeline_deployment_runbook.md` — EasyPanel config, secrets, deploy procedures, rollback, health checks, disaster recovery, troubleshooting.
- **Nota Infraestructura**: Los documentos 13 y 16 contienen referencia directa a la configuración de Supabase (connection pooling), Docker (RAM limits), y Prisma (migraciones) — son complementarios a los docs 05, 07, y 12 existentes.

---

## [v12.2.5] - 2026-06-05

### 🚀 FEATURE / 🔧 FIX: Implementación Completa del Plan de Auditoría, Consolidación y Optimización de Telemetría
- **Finance Consolidation**: Corregida la inyección de dependencias en `FinanceModule` importando `NotificationsModule`, asegurando que el job CRON de cobros automáticos/morosidad no falle al enviar WhatsApps y correos.
- **Telemetry Security**: Endurecido `/telemetry/playback` mediante validación estricta de firmas HMAC y `deviceId` para evitar inyecciones maliciosas de reproducciones falsas.
- **IndexedDB Sync Engine**: Añadido motor de colas de telemetría persistente usando IndexedDB en el portal del conductor (`apps/driver/utils/indexedDb.ts`), garantizando que los datos no se pierdan al reiniciar el navegador en tablets Android.
- **Optimización y Limpieza**: Eliminados artefactos de Vercel innecesarios en un entorno autohospedado en Easypanel, y añadidas migraciones de base de datos para índices de telemetría de alta performance.
- **Archivos tocados**:
  - `package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/v12_2_5_indexes_and_cleanup.sql`
  - `apps/api/src/modules/finance/finance.module.ts`
  - `apps/api/src/modules/finance/finance.service.ts`
  - `apps/api/src/modules/telemetry/telemetry.controller.ts`
  - `apps/api/src/modules/telemetry/telemetry.module.ts`
  - `apps/api/src/modules/telemetry/telemetry.service.ts`
  - `apps/driver/utils/indexedDb.ts`
  - `apps/driver/hooks/useTelemetry.ts`
  - `apps/driver/hooks/useBackgroundTelemetry.ts`
  - `apps/driver/pages/check-in.tsx`
  - `apps/tad-simulator/package.json`

---

## [v12.2.4] - 2026-05-31

### 🚀 FEATURE / 🔧 FIX: Corrección de Scripts Raíz y Mitigación TypeScript 6.0
- **Cambio**: Normalización de los scripts raíz del monorepo para usar `--workspaces` en lugar del shorthand `-ws`, y alineación de `ignoreDeprecations` a `5.0` en las configuraciones TypeScript de Admin y API para usar un valor válido con los compiladores TypeScript 5.x durante los builds Docker.
- **Archivos tocados**:
  - `package.json`
  - `apps/admin/tsconfig.json`
  - `apps/api/tsconfig.json`
  - `03_changelog_logs_tad.md`
- **Nota Infraestructura**: La validación completa de instalación/build en el contenedor actual queda condicionada por la política de registry que devuelve `403 Forbidden` al resolver `@ducanh2912/next-pwa`; la corrección aplicada es estática y compatible con Easypanel/NPM moderno.

---

## [v12.2.3] - 2026-05-26

### 🚀 FEATURE / 🔧 FIX: Corrección Quirúrgica de Telemetría Realtime y Proof of Play
- **Cambio**: Unificación del pipeline de telemetría entre baseline REST histórico y Supabase Broadcast efímero. Admin hidrata todas las unidades registradas, escucha `fleet_tracking_live` y degrada a offline después de 90s sin borrar marcadores. El portal del anunciante hidrata exclusivamente sus pantallas contratadas desde `/advertisers/:id/portal`, construye sets inmutables de `driverId/deviceId`, descarta pings externos y mantiene el contador `Pantallas Contratadas: X (N activas ahora mismo)`.
- **Backend**: `/fleet/map` y `/fleet/tracking/baseline` devuelven `driverId`, `deviceId`, última coordenada histórica y estado online de 90s. `/advertisers/:id/portal` expone `telemetry.contractedScreens`, `driverIds` y `deviceIds` solo para campañas activas vigentes del anunciante.
- **Infraestructura**: Los pings de 30s siguen siendo efímeros por Broadcast; la persistencia en `DriverLocations` continúa aislada al batch de 5 minutos del dispositivo. CORS ahora registra orígenes bloqueados y permite headers operativos de tablet/admin.
- **Archivos tocados**:
  - `apps/admin/pages/admin/tracking/index.tsx`
  - `apps/admin/components/MapView.tsx`
  - `apps/advertiser/components/bi/BiHeatmapInner.tsx`
  - `apps/advertiser/components/MapView.tsx`
  - `apps/api/src/modules/fleet/fleet.service.ts`
  - `apps/api/src/modules/fleet/tracking.controller.ts`
  - `apps/api/src/modules/advertisers/advertisers.service.ts`
  - `apps/driver/hooks/useBackgroundTelemetry.ts`

---

## [v12.2.2] - 2026-05-25

### 🔧 FIX / 🧱 ARCH: Unificación SaaS Advertiser + Erradicación de Mock Data
- Se eliminaron fallbacks mock en facturación, reports y métricas del portal advertiser.
- Se estandarizó el cálculo real de CPM, balanceRD e invoices desde backend (`getPortalData` + endpoint dedicado `GET /advertisers/:id/invoices`).
- Se agregaron componentes reutilizables `SkeletonCard` y `ZeroState` para cargas y estados vacíos premium.
- Se incorporó la arquitectura `11_advertiser_data_flow_v12.md` con diagrama Mermaid y mapa de endpoints.

---

## [v12.2.1] - 2026-05-24

### 🔧 FIX / 🚀 FEATURE: Unificación y Consolidación del Portal del Anunciante (Advertiser V12)
- **Cambio**: Centralización de la lógica de facturación, gestión de campañas y analíticas desde el dashboard general hacia el portal SaaS independiente `apps/tad-advertiser`. Implementación de UI/UX Premium con Glassmorphism en Tailwind 4 y eliminación de redundancias de código.
- **Archivos tocados**:
  - `apps/advertiser/pages/advertiser/dashboard.tsx`
  - `apps/advertiser/pages/advertiser/campaigns/index.tsx`
  - `apps/advertiser/pages/advertiser/requests.tsx`
  - `apps/advertiser/pages/advertiser/billing.tsx`
  - `apps/admin/pages/p/advertiser/[id].tsx`
- **Nota Infraestructura**: Configuración de redirecciones seguras y validación del JWT/Supabase con RolesGuard para accesos cruzados de Administradores sin duplicar endpoints.

---

## [v12.2.0] - 2026-05-22

### 🚀 FEATURE: Autenticación Unificada y Onboarding Radial (UX Sprint)

#### Portal de Anunciantes (Demand Gate)
- **Login Unificado Glassmorphic**: Refactorizado `apps/advertiser/pages/advertiser/login.tsx` con selector de pestañas deslizante (Iniciar Sesión / Registrar Empresa), inputs optimizados para touch, y toggle visual de contraseña (Eye/EyeOff). Estética Industrial Terminal oscura con resplandores `#FFD400`.
- **Wizard de Onboarding de 3 Pasos** en `apps/advertiser/pages/advertiser/dashboard.tsx`:
  - **Paso 1**: Selección táctil de ciudad objetivo (Santo Domingo vs Santiago).
  - **Paso 2**: Slider de presupuesto (RD$5,000–RD$150,000) con simulación en vivo contra `/api/proxy/campaigns/simulate-budget` y fallback matemático client-side.
  - **Paso 3**: Proyección de impacto (Alcance único, Impresiones, Pantallas asignadas).
  - Persistencia con `localStorage` key `tad_adv_onboarded_${advertiserId}`. Sesiones subsecuentes omiten el modal.

#### Portal de Conductores (Mobile Gateway)
- **Touch-Native Inputs**: Campo de cédula/teléfono migrado a `type="tel"` en `apps/driver/pages/driver/login.tsx` para activar teclados numéricos nativos en tablets Android.
- **Onboarding Bancario Offline-First** en `apps/driver/pages/driver/dashboard.tsx` (3 pasos):
  - **Paso 1 – Contrato v2.0**: Aceptación formal del servicio HaaS, membresía RD$6,000 + ITBIS 18%, y Fórmula V12: `RD$ = (min(Ads, 15) × 500) + (CPA_Sales × 500)`.
  - **Paso 2 – Banco Dominicano**: Botones táctiles grandes para Banco Popular, BHD León y Banreservas.
  - **Paso 3 – Cuenta Bancaria**: Inputs `type="tel"` para número de cuenta y nombre del titular.
- **Estrategia Offline-First**: Datos persisten en `localStorage` (`tad_offline_bank_details`, `tad_drv_bank_setup_done`). Si `navigator.onLine === false` activa `tad_pending_bank_sync = true` y banner naranja sticky. Listener `window.addEventListener('online', ...)` auto-sincroniza con `POST /drivers/me/bank-details` al recuperar conexión.

#### Portal Administrativo (Master Console)
- **Tour de Inducción de 3 Pasos** (primera sesión) en `apps/admin/pages/admin/dashboard/index.tsx`:
  - **Paso 1**: Bienvenida al Command Center TAD.
  - **Paso 2**: GPS en vivo → ruta `/admin/tracking` con CTA directo.
  - **Paso 3**: Semáforos de salud (Verde/Amarillo/Rojo) de conectividad y batería → ruta `/admin/monitoring`.
  - Detección via `localStorage` key `tad_admin_onboarded`. Botón para re-activar el tour en la sidebar.
- **Procesador de Nómina por Lotes Secuenciales** (`PayrollBatcher` component):
  - 15 conductores simulados divididos en **3 lotes secuenciales de 5** con pausa de 800ms entre lotes (RAM Safeguard para VPS de 512MB).
  - Barra de progreso global con indicadores por lote (Lote 1/2/3).
  - Grid de 15 mini-cards de conductores con estados `pending → processing → done` animados.
  - Terminal de logs en tiempo real con timestamps, mensajes de éxito y advertencias de pausa inter-lote.
  - Resumen final con total desembolsado calculado con Fórmula V12.

---

## [v12.1.3] - 2026-05-21

### 🛡️ SECURITY / 🎨 UI: Driver Onboarding Hardening & BankForm Premium Redesign

- **Fix CRÍTICO — Bypass de Onboarding (CVE-interno TAD-001)**:
  - El botón X del `DriverOnboardingModal` ahora es **no-operable** cuando el `stage` es `'contract'` o `'bank'`. Los pasos obligatorios muestran un ícono X gris inactivo con tooltip informativo.
  - `closeOnboarding()` valida el estado actual del stage antes de ejecutar el cierre; retorna sin efecto si el conductor intenta cerrar un paso obligatorio desde el cliente.
  - El `useEffect` de control del modal ahora incluye `hubData?.contractAccepted` y `hubData?.bankAccountConfigured` en sus dependencias, garantizando que el modal se **re-abra automáticamente** si los pasos mandatorios están incompletos, aunque el conductor haya marcado `hasSeenOnboarding='1'` en `localStorage`.
- **Fix — Divulgación ITBIS**: El paso `payment` del modal ahora muestra explícitamente `(ITBIS 18% incluido)` junto al monto de RD$6,000.
- **Fix — Versión**: Footer del Driver Dashboard corregido de `v11.0.0` a `v12.0.0`.
- **UI PREMIUM — BankForm.tsx** (Rediseño completo):
  - Nuevo diseño glassmorphic-industrial coherente con el resto del portal de conductores.
  - Selector de banco con **tarjetas interactivas** (BPD, BHD, BR, Scotiabank, APAP) en lugar de `<select>` genérico. Acentos amarillo TAD al seleccionar.
  - **Step track indicator** de 5 pasos con colores de estado (amarillo = activo, verde = completado, gris oscuro = pendiente).
  - Inputs con `inputMode="numeric"` / `type="tel"` para mejor UX en tablets Android.
  - **Pantalla de confirmación offline** con animación de éxito cuando el formulario se encola sin red.
  - Spinner de loading en el botón "Guardar" durante el submit.
  - Banner de alerta `WifiOff` cuando el dispositivo está sin conexión.
- **Archivos tocados**:
  - `apps/driver/pages/driver/dashboard.tsx`
  - `apps/driver/components/BankForm.tsx`

## [v12.1.2] - 2026-05-20

### 🎨 UI/UX & AUTH: Refactorización Premium de Portales (Glassmorphism)
- **Cambio**: Rediseño completo de las pantallas de login (Admin, Anunciante y Conductor) unificando la identidad visual hacia un Glassmorphism Oscuro con acentos en TAD Yellow (#facc15).
- **Mejoras UX/UI**: Detección de Bloqueo de Mayúsculas, Toggle de visibilidad de contraseña, protección *double-submit* mediante loaders nativos, y banners de error explícitos.
- **Lógica de Autenticación**:
  - `Dashboard Admin` y `Portal Anunciante` centralizados en `PortalAuth` asegurando el flujo nativo JWT/Cookies de Supabase (uso estricto de `email`).
  - `Portal Conductor` refactorizado en un componente dedicado sin dependencias de `PortalAuth`, garantizando el uso exclusivo de `phone` (tipo `tel`) y enrutando correctamente a `/api/proxy/drivers/login`.
- **Archivos tocados**:
  - `packages/ui/components/PortalAuth.tsx`
  - `apps/driver/pages/driver/login.tsx`
  - `apps/advertiser/pages/login.tsx`

## [v12.1.1] - 2026-04-27


### 🛡️ Driver Critical Patch (Easypanel + Offline-First)

- **Networking/CORS (403 Fix):**
  - Endurecido `apps/api/src/main.ts` con allow-list estricta de orígenes y `credentials: true`.
  - Incluido explícitamente `https://proyecto-ia-tad-driver.rewvid.easypanel.host` en validación CORS productiva.
- **Proxy Contract (Docker/Easypanel):**
  - Refactor de `apps/driver/next.config.ts` para rewrite estable de `/api/proxy/:path*` hacia `BACKEND_URL` normalizada.
  - Refuerzo de `apps/driver/pages/api/proxy/[...path].ts` con forwarding de `cookie`, `x-forwarded-host`, `x-forwarded-proto` y respuesta CORS con credenciales.
  - Eliminadas rutas directas al backend en cliente (`packages/services/api.ts` y hook de telemetría), consolidando `/api/proxy` como única vía.
- **PWA Resilience (404/Offline):**
  - `apps/driver/public/manifest.json` migrado a rutas relativas para despliegue consistente en contenedores Docker.
  - Service Worker del Driver actualizado a estrategia **Stale-While-Revalidate** para assets del Dashboard (`/driver/dashboard`, `/_next/static`, scripts/styles/images/fonts).
- **Sync Engine (GPS & Pendientes):**
  - `apps/driver/hooks/useTelemetry.ts` ahora expone `syncPending()` para procesar cola offline por lotes en `fleet/track-batch`.
  - Persistencia y progreso de sincronización mantenidos en `localStorage` sin bloqueo de interfaz.
  - Ante fallo de red, estado operativo cambia a **Modo Local** y mantiene reintentos seguros.
- **Meta RD$7,500 (Slots + Ingresos):**
  - `apps/driver/hooks/useDriverHub.ts` normaliza tipos numéricos de payload backend (alineación con Prisma).
  - `apps/driver/pages/driver/dashboard.tsx` calcula progreso real separando ingresos acumulados y slots activos (`activeSlots/maxSlots`) y usa ambos indicadores en el ledger.

## [v12.1.0] - 2026-04-26

### 🎨 UI/UX: Professional Map Specification (MAP-SPEC-2026)

- **Map Icons**: Implemented a new high-fidelity SVG car icon with binary status logic:
  - **Online**: Yellow number/accents (#eab308).
  - **Offline**: Red number/accents (#dc2626).
- **Orientation Control**: Added fixed TAD Yellow (#fad400) front headlights to distinguish car orientation from the red taillights.
- **Theme Awareness**: Dynamic car body color (White for Dark Mode maps, Black/Dark for Light Mode/OSM tiles).
- **Platform Sync**: Synchronized the new specification across **Admin**, **Advertiser**, and **Driver** applications (both MapView and MonitoringMap components).
- **Aesthetics**: Integrated glassmorphism, pulse animations for active devices, and high-contrast styling for premium visualization.

## [v12.0.0] - 2026-04-23

### 💎 ARCHITECTURE: Master Engineering Specification (EMS) V1.0

- **Cambio**: Elevación del sistema a arquitectura de alta disponibilidad con PostGIS para telemetría.
- **Finanzas**: Lógica de RD$500 por anuncio y RD$500 por venta blindada con transacciones atómicas.
- **Integración**: Definido el "Mirror Mode" para que el Admin gestione el Driver Hub directamente.
- **Infra**: Configuración de límites de recursos Docker para estabilidad en Easypanel.

### 🛡️ SECURITY & ARCHITECTURE: Anti-Error Protocol (Zero-Trust)

- **Cambio**: Integración de directivas estrictas de mitigación de errores para el Agente IA.
- **Backend**: Obligatoriedad de transacciones atómicas (`$transaction`) e Idempotency Keys para evitar duplicación de pagos.
- **Frontend**: Colas en IndexedDB para manejo offline y validación Zod para datos bancarios.
- **Estandarización**: Tabla global de códigos de error para manejo uniforme en la UI.

### Financial, Telemetry & Referral (TAD-DRIVER V12)

- **Financial Logic**: Implemented the V12 compensation formula ($Earnings = \min(Ads, 15) \times 500 + CPA \times 500$). Added atomic transaction support for withdrawals.
- **Telemetry System**: Created `useBackgroundTelemetry` hook with 5-minute debounce and background sync to minimize battery drain. Implemented batch sync in the API.
- **Referral System**: Automated unique referral code generation and QR-code payload for advertiser recruitment.
- **Banking (Offline-First)**: New 5-step bank account registration with `localStorage` persistence and auto-retry on reconnection.
- **Database**: Updated schema with `ActiveAd`, `Commission`, and `Telemetry` models. Added `walletBalance`, `referralCode`, and `bankAccount` to the `Driver` model.

## [v10.0.0] - 2026-04-11

### Microservices Stabilization & Fleet Realtime Sync

- **Architecture (Microservices)**: Final stabilization of the `tad-remotion` service. Added native Linux dependencies (`libatk-bridge`, etc.) to the Docker container for consistent rendering on headless VPS environments. Optimized Docker build to include Chromium binary installation.
- **Fleet Synchronization**: Integrated `Supabase Realtime` for instantaneous command broadcasting. Implemented the `WAKE_UP_CALL` event in the Tablet Player for 1-second sync latency.
- **Advertiser Portal (BI v6.0)**: Fully operational BI v6.0 with premium dark-mode interface, conversion tracking maps (Heatmaps), and automated billing reports. Resolved all 404 routing errors.
- **Driver Portal (Service Tools)**: Implemented functional tool modals for "Technical Support" and "Driver Referrals". Integrated with the backend via `/portal-requests` API.
- **Authentication (Auth UX)**: Stabilized the password-reset and onboarding mechanism. Enforced HS256 local JWT validation to reduce API latency.
- **Infrastructure (EasyPanel)**: Migrated all services to VPS via EasyPanel with strict RAM capping (512MB/1024MB) to ensure performance on the free tier.

## [v9.0.0] - 2026-04-09

### Microservices Migration & Video Engine

- **Architecture (Microservices)**: Successfully decoupled the video generation engine into a standalone service `apps/tad-remotion`. This isolates heavy Chromium/FFMPEG processes, ensuring the main API remains responsive.
- **Backend (Auth Security)**: Enhanced RolesGuard to handle @Public routes correctly when class-level roles are defined. This fixes a critical 403 issue on login/register endpoints.
- **Backend (Advertiser Onboarding)**: Implementado un robusto flujo de reset-password y feedback de login mejorado.
- **UI (Status & Transparency)**: Deployed a premium Glassmorphism landing page for the `tad-remotion` microservice.
- **Dependency Management**: Upgraded the entire monorepo to React 19 types.

## [v8.0.0] - 2026-04-08

### UI & Security Optimization

- **Frontend (Layout & UX)**: Resolved a critical depth-sorting issue (z-index) where the top search bar obscured the brand identity and navigation nexus.
- **Backend (Auth Core)**: Stabilized SupabaseAuthGuard by explicitly enforcing HS256 validation.
- **Backend (Observability)**: Refactored LoggerMiddleware to provide clean, human-readable HTTP audit logs.
- **Integration (Operational Sync)**: Restored and verified the Google Sheets integration.

---
**Status**: STABLE.
