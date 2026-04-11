# 📜 CHANGELOG & LOGS - TAD DOOH PLATFORM

> **Propsito**: Registro histrico de cambios, hitos tcnicos y correcciones de errores.
> **ltima Actualizacin**: 2026-04-10

---

## [v10.0.0] - 2026-04-10

### Driver Portal Tools & Advertiser BI v6.0 Finish

- **Driver Portal (Service Tools)**: Implemented functional, high-craft tool modals for "Technical Support" and "Driver Referrals". Integrated with the backend via /portal-requests API for maintenance reporting and fleet growth incentives.
- **Advertiser Portal (Route Stabilization)**: Resolved all 404 errors by implementing missing routes (i-v6, illing, 
etwork, insights) and updating _app.tsx for proper layout handling.
- **Architecture (Microservices)**: Final stabilization of the 	ad-remotion service. Added native Linux dependencies (libatk-bridge, etc.) to the Docker container for consistent rendering on headless VPS environments.
- **Authentication (Advertiser Flow)**: Stabilized the password-reset and onboarding mechanism, ensuring legacy advertisers can securely claim their accounts.

## [v9.0.0] - 2026-04-09

### Microservices Migration & Video Engine (v9.0.0)

- **Architecture (Microservices)**: Successfully decoupled the video generation engine into a standalone service pps/tad-remotion. This isolates heavy Chromium/FFMPEG processes, ensuring the main API remains responsive during peak rendering tasks.
- **Backend (Auth Security)**: Enhanced RolesGuard to handle @Public routes correctly when class-level roles are defined. This fixes a critical 403 issue on login/register endpoints.
- **Backend (Advertiser Onboarding)**: Implementado un robusto flujo de eset-password y feedback de login mejorado.
- **UI (Status & Transparency)**: Deployed a premium Glassmorphism landing page for the 	ad-remotion microservice.
- **Dependency Management**: Upgraded the entire monorepo to React 19 types.

## [v8.0.0] - 2026-04-08

### UI & Security Optimization

- **Frontend (Layout & UX)**: Resolved a critical depth-sorting issue (z-index) where the top search bar obscured the brand identity and navigation nexus.
- **Backend (Auth Core)**: Stabilized SupabaseAuthGuard by explicitly enforcing HS256 validation.
- **Backend (Observability)**: Refactored LoggerMiddleware to provide clean, human-readable HTTP audit logs.
- **Integration (Operational Sync)**: Restored and verified the Google Sheets integration.

---
**Status**: STABLE.
