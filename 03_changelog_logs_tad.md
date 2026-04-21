# 📜 CHANGELOG & LOGS - TAD DOOH PLATFORM

> **Propósito**: Registro histórico de cambios, hitos técnicos y correcciones de errores.
> **Última Actualización**: 2026-04-11

---

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
