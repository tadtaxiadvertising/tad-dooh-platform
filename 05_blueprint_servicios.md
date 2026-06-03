# 🗺️ 05 — BLUEPRINT DE SERVICIOS TAD DOOH v12.0.0

> **Propósito**: Biblia de Desarrollo y Arquitectura Técnica (Full-Stack & DevOps).
> **Versión**: 12.0.0 (Financial & Telemetry V12)
> **Última Actualización**: 2026-04-23

---

## 🏗️ 1. API Backend (NestJS Gateway v12)

- **Descripción Estratégica**: Cerebro transaccional y motor de sincronización. Orquesta la comunicación entre Portals, Tablets, y el microservicio Remotion.
- **Módulos Críticos V12**:
  - **WalletService**: Gestión de balances y retiros atómicos.
  - **TelemetryService**: Procesamiento de GPS en lotes con bypass de API Gateway.
  - **ReferralService**: Generación de leads y atribución de comisiones.
- **Protocolos**: NestJS 10, Prisma 5, Supabase Realtime v2.
- **Despliegue**: Docker on EasyPanel (512MB RAM Limit).

---

## 📺 2. Reproductor PWA (Tablet / FullyKiosk)

- **Descripción Estratégica**: Componente Offline-First encargado de reproducir campañas sin interrupciones.
- **Sync Inmediato (Realtime)**:
  - Escucha eventos `WAKE_UP_CALL` vía el canal `fleet_sync`.
  - Permite actualizaciones forzosas de contenido con latencia < 1s.
- **Kill-Switch**: Bloqueo automático de pantalla ante respuesta `402 Payment Required` (Mora de pago).

---

## 👔 3. Portal Anunciante (V12)

- **Descripción Estratégica**: SaaS Core para anunciantes B2B con auto-registro público.
- **Características**: React 19, Next.js 15, Tailwind 4. Estimación de impacto basada en presupuesto RD$.
- **Subida de Medios**: Direct-to-Supabase Storage via Signed URLs (Bypass de API).

---

## 🎬 4. Motor de Video (TAD Remotion Microservice)

- **Descripción Estratégica**: Microservicio aislado para renderizado programático de anuncios.
- **Infraestructura**:
  - Contenedor dedicado con Chromium, FFMPEG y `libatk-bridge`.
  - RAM Limit: 1024MB (EasyPanel).
- **Workflow**: Recibe JSON del API -> Procesa frames -> Sube MP4 a Supabase.

---

## 🚖 5. Mobile Gateway (Driver App V12)

- **Descripción Estratégica**: Puente 4G optimizado entre la tablet y el servidor.
- **Telemetría V12**: Hook `useBackgroundTelemetry` con debounce de 5 min para preservación de batería.
- **Wallet & Banking**: Interfaz offline-first para gestión de ganancias y registro de cuentas bancarias.
- **Referidos**: Generación de códigos QR para captación de anunciantes.

---

## 🎛️ 6. Dashboard Admin (Master Console)

- **Descripción Estratégica**: Monitoreo "God Mode" de la flota y auditoría financiera.
- **Funcionalidades**: Rastreo en vivo (`/tracking`), Dashboard de Finanzas V12 (Compensación fija RD$500), y Gestión de Payouts.
, el backend transaccional continúe operando para los conductores y reportes GPS. Fallos de OOM fuerzan un reinicio natural del worker en EasyPanel.
