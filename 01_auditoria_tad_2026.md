# 📝 01 — AUDITORÍA TAD DOOH PLATFORM 2026

> **Propósito**: Estado completo del ecosistema para continuidad de desarrollo. v10.0.0 Microservices & Premium Portals.
> **Última Actualización**: 2026-04-11T22:45:00-04:00
> **Estado Operativo Actual**: v10.0.0 (Microservices & Premium Portals). Santiago Pilot LIVE.

---

## 🏗️ 1. ARQUITECTURA GENERAL (MONOREPO v10.0.0)

```text
┌──────────────────────────────────────────────────────────────────┐
│             TAD DOOH PLATFORM — ARQUITECTURA v10.0.0             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Portals: Admin/Adv/Driver]   [API Backend]    [TAD Remotion]   │
│   Next.js 15 / React 19          NestJS 10       Video Engine    │
│   Tailwind 4 / Docker            Docker          Microservice    │
│         │                          │                   │         │
│         └──────────┬───────────────┴───────────────────┘         │
│                    ▼                                             │
│           [Supabase PostgreSQL]  ◄────────────────────────┐      │
│           [Supabase Storage]                              │      │
│           [Supabase Realtime]   <─ (Wake-up Call) ─ [Tablet PWA] │
└──────────────────────────────────────────────────────────────────┘
```

| Componente | Tecnología | URL Producción (EasyPanel) | Estado |
| --- | --- | --- | --- |
| **Dashboard Admin** | Next.js 15 / React 19 | <https://tad-dashboard.rewvid.easypanel.host> | ✅ Operativo |
| **API Backend** | NestJS 10 / Prisma 5.22 | <https://tad-api.rewvid.easypanel.host/api/v1> | ✅ Operativo |
| **Portal Anunciante** | Next.js 15 (BI v6.0) | <https://tad-advertiser.rewvid.easypanel.host> | ✅ v6.0 Live |
| **Portal Conductor** | Next.js 15 (Wallet) | <https://tad-driver.rewvid.easypanel.host> | ✅ Live |
| **Video Engine** | Remotion / Chromium | <https://tad-remotion.rewvid.easypanel.host> | ✅ ON-LINE |
| **Tablet Player** | PWA (Offline-first) | Carga local vía FullyKiosk | ✅ Funcional |

---

## 🖥️ 2. ESTADO DE VISTAS Y PORTALES

- **Admin Dashboard**: Consola central de mando. Incluye mapa de rastreo GPS en tiempo real (`/tracking`) con Spotlight y Motion Trails.
- **Advertiser BI v6.0**: Dashboard premium para clientes. Incluye mapas de calor (Heatmaps) de impactos por campaña y gestión directa de archivos `.mp4`.
- **Driver Portal**: Herramientas de soporte y referidos. Incluye "Mobile Gateway" para envío de GPS por lotes (Batching 10:1), reduciendo el tráfico en un 98%.
- **Sync Protocol v1.1**: Sincronización diaria optimizada con ventana de tiempo (Sync Window) e integridad de archivos vía Hash validation.

---

## 🎯 3. REGLAS DE NEGOCIO CRÍTICAS (Core Rules)

1. **Regla de los 15 Slots**: Límite estricto de 15 anuncios de 30s por dispositivo para garantizar la rotación y el revenue.
2. **Kill-Switch Suscripción**: Si el pago de RD$6,000 (Anual) no está activo, el dispositivo es bloqueado remotamente (`402 Payment Required`).
3. **Bono de Disponibilidad**: RD$500/mes para choferes que registren >100 puntos GPS válidos en el mes.
4. **Referidos**: Comisión automática de RD$500 por cada nuevo anunciante o conductor referido.
5. **Formatos**: Restricción técnica a `video/mp4` para compatibilidad nativa con tablets STI.

---

## ⚠️ 4. RIESGOS Y MITIGACIONES (SRE)

| Riesgo | Severidad | Mitigación Implementada |
| --- | --- | --- |
| **OOM en Remotion** | ALTA | Aislamiento en microservicio con límite de 1024MB RAM en EasyPanel. |
| **Ancho de banda Supabase** | ALTA | Implementación de Cloudflare CDN (`media.tad.do`) planeada para Q2. |
| **Saturación API GPS** | MEDIA | Batching 10:1 y retención en `localStorage` ante fallos de red. |
| **Leak de Conexiones DB** | ALTA | Orquestación de `$disconnect()` en NestJS Hooks. |

---

## 📂 5. ESTRUCTURA DEL MONOREPO

```text
tad-dooh-platform/
├── apps/
│   ├── admin/           # Dashboard Maestro (Next.js 15)
│   ├── advertiser/      # Portal Anunciante (BI v6.0)
│   ├── driver/          # Portal Conductor (Mobile Gateway)
│   ├── api/             # NestJS Backend Gateway
│   ├── tad-remotion/    # Microservicio de Renderizado de Video
│   └── tablet-player/   # PWA Pauta Offline (HTML/JS)
├── packages/
│   ├── database/        # Lógica compartida de Prisma y DB
│   └── ui/              # Componentes compartidos (AntigravityUI)
└── docker/              # Definiciones de contenedores para EasyPanel
```

---

## 🚀 6. PRÓXIMOS PASOS (Roadmap Q2 2026)

- [ ] **Escalabilidad**: Scale Test de Remotion con 10 renders paralelos.
- [ ] **CDN**: Configuración final de Cloudflare para cacheo de videos.
- [ ] **KYC**: Automatización de validación de documentos para conductores.
- [ ] **Auditoría**: Exportación de reportes PDF certificados para marcas.

---

*Nota: Este documento reemplaza cualquier versión anterior de auditoría y debe ser el punto de partida para cualquier cambio arquitectónico.*
 INFRAESTRUCTURA (12-MAR-2026)

### Modificación de Riesgos Técnicos Críticos

| # | Riesgo | Severidad | Área | Estado / Mitigación |
| --- | --- | --- | --- | --- |
| 🔴 7 | **Límite Invocaciones Vercel (100k/mes)** | CRÍTICA | Escalabilidad | ✅ **MITIGADO**: Implementada arquitectura "Vercel Bypass" vía Supabase Direct Insert (PostgREST) para telemetría. |
| 🔴 13 | **Límite Bandwidth Supabase (5GB/mes)** | CRÍTICA | Infraestructura | 🔄 **EN PROGRESO**: Implementación de Cloudflare CDN (`media.tad.do`) para cachear videos y evitar agotar cuota. |
| 🟠 14 | **Límite Almacenamiento DB (500MB)** | MEDIA | Data | 🔄 **PENDIENTE**: Crear CRON job para agregar logs antiguos de `analytics_events` a `campaign_metrics` y purgar raw data mensual. |

### Roadmap 2026 - Actualización Sprint 3 (Escalabilidad de Costos)

- [x] **Relajación de Batching GPS:** Ajustado de 60s a 300s (5 min) para reducir tráfico de escritura.
- [ ] **Configuración Cloudflare CDN:** Conectar dominio gratuito a Supabase Storage y configurar Cache Rules.
- [x] **Políticas RLS Supabase:** Configuradas reglas para permitir `INSERT` anónimo seguro desde el Mobile Gateway directamente a PostgreSQL.
