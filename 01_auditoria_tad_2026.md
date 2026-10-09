# 📝 01 — AUDITORÍA TAD DOOH PLATFORM 2026

> **Propósito**: Estado completo del ecosistema para continuidad de desarrollo. v12.0.0 Financial, Telemetry & Referral.
> **Última Actualización**: 2026-04-23T19:00:00-04:00
> **Estado Operativo Actual**: v12.0.0 (Financial & Telemetry V12). Santiago Pilot LIVE.

---

## 🏗️ 1. ARQUITECTURA GENERAL (MONOREPO v12.0.0)

```text
┌──────────────────────────────────────────────────────────────────┐
│             TAD DOOH PLATFORM — ARQUITECTURA v12.0.0             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Portals: Admin/Adv/Driver]   [API Backend]    [TAD Remotion]   │
│   Next.js 15 / Tailw4            NestJS 10       Video Engine    │
│   React 19 / Docker              Docker          Microservice    │
│         │                          │                   │         │
│         └──────────┬───────────────┴───────────────────┘         │
│                    ▼                                             │
│           [Supabase PostgreSQL]  ◄────────────────────────┐      │
│           [Supabase Storage]                              │      │
│           [Supabase Realtime]   <─ (Wake-up Call) ─ [Tablet PWA] │
└──────────────────────────────────────────────────────────────────┘
```

| Componente | Tecnología | URL Producción (ibusiness.com.do) | URL Legacy (EasyPanel) | Estado |
| --- | --- | --- | --- | --- |
| **Dashboard Admin** | Next.js 15 / Tailw4 | <https://tad.adm.ibusiness.com.do> | <https://tad-dashboard.rewvid.easypanel.host> | ✅ v12.0 Operativo |
| **API Backend** | NestJS 10 / Prisma 5 | <https://tad.api.ibusiness.com.do/api/v1> | <https://tad-api.rewvid.easypanel.host/api/v1> | ✅ v12.0 Operativo |
| **Portal Anunciante** | Next.js 15 / Tailw4 | <https://tad.anunciante.ibusiness.com.do> | <https://tad-advertiser.rewvid.easypanel.host> | ✅ v12.0 Live |
| **Portal Conductor** | Next.js 15 (V12) | <https://tad.driver.ibusiness.com.do> | <https://tad-driver.rewvid.easypanel.host> | ✅ v12.0 Live |
| **Video Engine** | Remotion / Chromium | <https://tad.remotion.ibusiness.com.do> | <https://tad-remotion.rewvid.easypanel.host> | ✅ ON-LINE |
| **Tablet Player** | PWA (Offline-first) | <https://tad.player.ibusiness.com.do> | Carga local vía FullyKiosk | ✅ Funcional |

---

## 🖥️ 2. ESTADO DE VISTAS Y PORTALES (V12)

- **Admin Dashboard**: Consola central de mando con monitoreo de flota v12. Incluye auditoría de billetera y gestión de referidos.
- **Advertiser Portal**: Sistema de registro público y gestión de campañas con estimación de presupuesto RD$.
- **Driver Portal V12**: Rediseño radical con Tailwind 4. Incluye Billetera Digital, Telemetría de bajo consumo y Sistema de Referidos mediante códigos QR.
- **Sync Protocol v12**: Sincronización atómica con soporte para bloqueos financieros (Kill-Switch) y actualización de contenido vía Wake-up Call.

---

## 🎯 3. REGLAS DE NEGOCIO CRÍTICAS (V12 Core Rules)

1. **Compensación V12**: $Earnings = (\min(Ads, 15) \times 500) + (CPA_{Sales} \times 500)$. RD$500 por anuncio activo y RD$500 por referido.
2. **Telemetría Inteligente**: Debounce de 5 min en tracking GPS para ahorro de batería. Inserción masiva vía PostgREST para bypass de Vercel limits.
3. **Kill-Switch Suscripción**: Bloqueo automático (402 Payment Required) si la suscripción está vencida o el pago anual de RD$6,000 está pendiente.
4. **Offline-First Banking**: Gestión bancaria persistente en `localStorage` con sincronización automática ante reconexión.
5. **Inventario Fijo**: Límite estricto de 15 slots por tablet para maximizar el ROI del anunciante.

---

## ⚠️ 4. RIESGOS Y MITIGACIONES (SRE V12)

| Riesgo | Severidad | Mitigación Implementada |
| --- | --- | --- |
| **Saturación API GPS** | MEDIA | Batching 10:1 y debounce de 300s. Bypass de API Gateway vía Supabase Direct Insert. |
| **Fuga de Batería en Tablets** | ALTA | Hook `useBackgroundTelemetry` optimizado y Worker inactivo si no hay movimiento. |
| **Integridad Financiera** | ALTA | Transacciones atómicas en PostgreSQL y auditoría cruzada de impresiones/pago. |
| **OOM en Remotion** | MEDIA | Aislamiento en microservicio con límite de 1GB RAM. |

---

## 🚀 5. PRÓXIMOS PASOS (Roadmap Q2 2026 - Sprint 4)

- [ ] **Referral Loop**: Automatización de pagos instantáneos tras cierre de venta de referido.
- [ ] **Cloudflare CDN**: Conexión final para cacheo de videos multimedia pesados.
- [ ] **Advanced Telemetry**: Detección de "Safe Driving" para bonos adicionales por baja velocidad en áreas escolares.
- [ ] **Dynamic Ads**: Integración de anuncios HTML interactivos basados en la ubicación.

---

*Nota: Este documento refleja el estado actual de la plataforma en su versión 12.0.0.*
ndwidth Supabase (5GB/mes)** | CRÍTICA | Infraestructura | 🔄 **EN PROGRESO**: Implementación de Cloudflare CDN (`media.tad.do`) para cachear videos y evitar agotar cuota. |
| 🟠 14 | **Límite Almacenamiento DB (500MB)** | MEDIA | Data | 🔄 **PENDIENTE**: Crear CRON job para agregar logs antiguos de `analytics_events` a `campaign_metrics` y purgar raw data mensual. |

### Roadmap 2026 - Actualización Sprint 3 (Escalabilidad de Costos)

- [x] **Relajación de Batching GPS:** Ajustado de 60s a 300s (5 min) para reducir tráfico de escritura.
- [ ] **Configuración Cloudflare CDN:** Conectar dominio gratuito a Supabase Storage y configurar Cache Rules.
- [x] **Políticas RLS Supabase:** Configuradas reglas para permitir `INSERT` anónimo seguro desde el Mobile Gateway directamente a PostgreSQL.
