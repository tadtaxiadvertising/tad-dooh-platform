# 🔐 02 — REGLAS DE NEGOCIO, STACK TÉCNICO Y CREDENCIALES

> **Propósito**: Referencia rápida de credenciales, URLs, stack y las reglas que el agente debe respetar.
> **Última Actualización**: 2026-04-23T07:00:00-04:00

---

## 🌐 URLS DE PRODUCCIÓN (EasyPanel)

| Recurso | URL |
| :--- | :--- |
| **Dashboard Admin** | <https://tad-dashboard.rewvid.easypanel.host> |
| **API (Gateway)** | <https://tad-api.rewvid.easypanel.host/api/v1> |
| **Video Engine** | <https://tad-remotion.rewvid.easypanel.host> |
| **Portal Anunciante** | <https://tad-advertiser.rewvid.easypanel.host> |
| **Portal Conductor** | <https://tad-driver.rewvid.easypanel.host> |
| **Supabase Project** | <https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf> |

---

## 🔑 CREDENCIALES

### Login del Dashboard Admin

```text
Email:    admin@tad.do
Password: TadAdmin2026!
```

### Supabase & Postgres (EasyPanel Secrets)

Todas las variables de entorno están centralizadas en EasyPanel bajo el esquema de **Secrets**.

- `DATABASE_URL`: Connection Pool (puerto 6543) para Prisma.
- `DIRECT_URL`: Direct Connection (puerto 5432) para Migraciones.
- `SUPABASE_SERVICE_ROLE_KEY`: JWT de alta prioridad para bypass de RLS en el Backend.

---

## 🏗️ STACK TÉCNICO v12.0.0

### Microservicios (Dockerized on EasyPanel)

| Service | Technology | RAM Limit | Purpose |
| :--- | :--- | :--- | :--- |
| **API Gateway** | NestJS / Prisma | 512 MB | Core logic, Auth & Fleet sync. |
| **TAD Remotion** | Remotion / Chromium | 1024 MB | Programmatic Video Rendering. |
| **Admin Panel** | Next.js 15 / Tailw4 | 512 MB | Fleet Operations & God Mode. |
| **Adv Portal** | Next.js 15 / Tailw4 | 512 MB | Advertiser BI v6.0. |
| **Driver Portal** | Next.js 15 / Tailw4 | 512 MB | Mobile Gateway & Earnings. |

### Shared Core

- **Runtime**: Node.js 20.x
- **Database**: PostgreSQL 15 (Supabase)
- **Realtime**: Supabase Broadcast (Realtime v2)
- **Styling**: Tailwind CSS v4.x

---

## ⚡ REGLA DE ORO

> **CERO COSTOS ADICIONALES**. Todo el stack debe mantenerse dentro de los tiers gratuitos de EasyPanel, Supabase y Cloudflare.

---

## 🔧 COMANDOS DE DESARROLLO (Monorepo)

```bash
# Instalación raíz
npm install

# Iniciar ecosistema local
npm run dev           # Lanza todos los servicios vía Turborepo (si aplica)

# Prisma (dentro de apps/api o packages/database)
npx prisma generate
npx prisma db push
```

---

## 📍 REGLAS DE NEGOCIO (Core Principles)

1. **Offline-First Delivery**: El TAD Player debe ser capaz de reproducir contenido durante 48 horas sin internet. El token de sesión (`JWT`) expira transcurrido ese tiempo forzando un re-sync.
2. **Batching de Telemetría (V12)**: El Mobile Gateway acumula coordenadas y las envía en bloques masivos. El hook `useBackgroundTelemetry` aplica un debounce de 5 min para ahorro de batería.
3. **Kill-Switch Suscripción**: Los dispositivos sin pago activo (`subscriptionPaid: false`) reciben un comando de bloqueo inmediato que inhabilita el playback.
4. **Validación de Inventario (Regla 15 Slots)**: Ninguna tablet puede tener más de 15 campañas activas simultáneamente.
5. **Realtime Sync (Wake-up Call)**: Sincronización inmediata vía Supabase Realtime al canal `fleet_sync`.
6. **Compensación V12**: $Earnings = (\min(Ads, 15) \times 500) + (CPA_{Sales} \times 500)$. RD$500 por slot publicitario y RD$500 por referido de anunciante.
7. **Gestión Bancaria Offline-First**: Persistencia en `localStorage` con sincronización automática ante reconexión.
8. **Validación Multimedia**: Solo `video/mp4` H.264, máximo 55 MB por archivo.
9. **Referido Automatizado**: Cada conductor tiene un `referralCode` (UUID) para captación de leads mediante QR.

---

*Nota: Cualquier desviación de estas reglas debe ser aprobada por el Arquitecto de Producto.*
