# 📜 CHANGELOG & LOGS - TAD DOOH PLATFORM

> **Propósito**: Registro histórico de cambios, hitos técnicos y correcciones de errores.
> **Última Actualización**: 2026-04-23

---

## [v12.1.1] - 2026-04-27

### 🚀 FEATURE / 🔧 FIX: Refactor de Login UI y Prevención de 401 en Advertiser Portal
- **Cambio**: Se aplicó el decorador `@Public()` al endpoint de login en el backend para evitar bloqueos del `JwtAuthGuard`. Se rediseñó la pantalla de login del Portal de Anunciantes con Tailwind 4 (Glassmorphism), incluyendo manejo de errores explícito para status 401 y previniendo el loop de Axios en el cliente.
- **Archivos tocados**:
  - `apps/api/src/advertisers/advertisers.controller.ts`
  - `apps/advertiser/pages/login.tsx`

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
