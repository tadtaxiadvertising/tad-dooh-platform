# 🗺️ 05 — BLUEPRINT DE SERVICIOS TAD DOOH v10.0.0

> **Propósito**: Biblia de Desarrollo y Arquitectura Técnica (Full-Stack & DevOps).
> **Versión**: 10.0.0 (Microservices Architecture)
> **Última Actualización**: 2026-04-11

---

## 🏗️ 1. API Backend (NestJS Gateway)

- **Descripción Estratégica**: Es el cerebro transaccional y el motor de sincronización. Orquesta la comunicación entre Portals, Tablets, y el microservicio Remotion.
- **Protocolos e Integración**:
  - Prisma ORM `v5.22.0` con Connection Pooling.
  - Exposición de módulos vía REST (Prefijo `/api/v1`).
  - Auth local vía `SupabaseAuthGuard` con validación HS256.
- **Despliegue**: Docker on EasyPanel (512MB RAM Limit).

---

## 📺 2. Reproductor PWA (Tablet / FullyKiosk)

- **Descripción Estratégica**: Componente Offline-First encargado de reproducir campañas sin interrupciones.
- **Sync Inmediato (Realtime)**:
  - Escucha eventos `WAKE_UP_CALL` vía el canal `fleet_sync` de **Supabase Realtime**.
  - Permite actualizaciones forzosas de contenido con latencia < 1s.
- **Tolerancia a Fallos**: Cache API + IndexedDB. Autonomía de 48h sin conexión.

---

## 👔 3. Portal Anunciante (BI v6.0)

- **Descripción Estratégica**: SaaS Core para anunciantes B2B.
- **Características**: React 19, Next.js 15, Tailwind 4. Heatmaps de pauta y Billing automático.
- **Subida de Medios**: Direct-to-Supabase Storage (Bypass de API para archivos grandes).

---

## 🎬 4. Motor de Video (TAD Remotion Microservice)

- **Descripción Estratégica**: Microservicio aislado para renderizado programático.
- **Infraestructura**:
  - Contenedor dedicado con Chromium, FFMPEG y `libatk-bridge`.
  - RAM Limit: 1024MB (EasyPanel).
- **Workflow**: Recibe JSON del API -> Procesa frames -> Sube MP4 a Supabase -> Notifica vía Webhook/ACK.

---

## 🚖 5. Mobile Gateway (Driver App) PWA

- **Descripción Estratégica**: Puente 4G entre la tablet y el servidor.
- **Lógica de Batching**: Agrupa 10 coordenadas GPS en `localStorage` antes de enviarle un POST al API (Ahorro del 98% de ancho de banda).
- **Kill-Switch**: Bloqueo visual ante respuesta `402 Payment Required` del API.

---

## 🎛️ 6. Dashboard Admin (Master Console)

- **Descripción Estratégica**: Monitoreo "God Mode" de la flota.
- **Funcionalidades**: Rastreo en vivo (`/tracking`), Dashboard de Finanzas (RD$500 comisiones), y Emisión de comandos Realtime.
, el backend transaccional continúe operando para los conductores y reportes GPS. Fallos de OOM fuerzan un reinicio natural del worker en EasyPanel.
