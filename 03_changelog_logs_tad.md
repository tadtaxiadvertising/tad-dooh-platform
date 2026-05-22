# 📜 CHANGELOG & LOGS - TAD DOOH PLATFORM

> **Propósito**: Registro histórico de cambios, hitos técnicos y correcciones de errores.
> **Última Actualización**: 2026-04-23

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
