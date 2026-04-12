# 🔐 02 — REGLAS DE NEGOCIO, STACK TÉCNICO Y CREDENCIALES

> **Propósito**: Referencia rápida de credenciales, URLs, stack y las reglas que el agente debe respetar.
> **Última Actualización**: 2026-04-11T22:45:00-04:00

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

## 🏗️ STACK TÉCNICO v10.0.0

### Microservicios (Dockerized on EasyPanel)

| Service | Technology | RAM Limit | Purpose |
| :--- | :--- | :--- | :--- |
| **API Gateway** | NestJS / Prisma | 512 MB | Core logic, Auth & Fleet sync. |
| **TAD Remotion**| Remotion / Chromium | 1024 MB | Programmatic Video Rendering. |
| **Admin Panel** | Next.js 15 / Tailw4 | 512 MB | Fleet Operations & God Mode. |
| **Adv Portal**  | Next.js 15 / Tailw4 | 512 MB | Advertiser BI v6.0. |
| **Driver Portal**| Next.js 15 / Tailw4 | 512 MB | Mobile Gateway & Earnings. |

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
2. **Batching de Telemetría**: El Mobile Gateway (Smartphone del chofer) acumula coordenadas y las envía en bloques (10 puntos o 60 segundos) para optimizar la carga del API Gateway.
3. **Kill-Switch Suscripción**: Los dispositivos sin pago activo (`subscriptionPaid: false`) reciben un comando de bloqueo inmediato que inhabilita el playback.
4. **Validación de Inventario (Regla 15 Slots)**: Ninguna tablet puede tener más de 15 campañas activas simultáneamente para asegurar la equidad de impresiones.
5. **Realtime Sync (Wake-up Call)**: El Admin puede forzar una sincronización inmediata emitiendo un comando vía Supabase Realtime a todo el canal `fleet_sync`.
6. **Double-Entry Ledger**: Todas las impresiones publicitarias generan un débito al anunciante y un crédito (comisión) al conductor proporcional a la pauta validada por GPS.
7. **Seguridad Bcrypt & JWT**: Rotación de tokens con verificación de identidad desde la API descentralizada.
8. **Validación Multimedia**: El sistema solo acepta `video/mp4` con encoding compatible H.264 para asegurar el playback en hardware STI.

---

*Nota: Cualquier desviación de estas reglas debe ser aprobada por el Arquitecto de Producto.*
