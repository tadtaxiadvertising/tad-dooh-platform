# 📝 01 — AUDITORÍA TAD DOOH PLATFORM 2026

> **Propósito**: Estado completo del ecosistema para continuidad de desarrollo con cualquier agente o desarrollador.
> **Última Actualización**: 2026-03-10T23:40:00-04:00
> **Sprint Actual**: Sprint 2 (Sprint 1 completado al 100%)

---

## 🏗️ 1. ARQUITECTURA GENERAL

```
┌──────────────────────────────────────────────────────────────┐
│             TAD DOOH PLATFORM — ARQUITECTURA                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Admin Dashboard]       [API Backend]       [Tablet PWA]    │
│   Next.js 15 (React 19)   NestJS 10           HTML + SW     │
│   Vercel (tad-dashboard)   Vercel (tad-api)    FullyKiosk    │
│        │                      │                    │         │
│        └──────────┬───────────┘                    │         │
│                   ▼                                │         │
│          [Supabase PostgreSQL]  ◄───────────────────┘        │
│          [Supabase Storage]                                  │
│          [Supabase Auth]                                     │
└──────────────────────────────────────────────────────────────┘
```

| Componente | Tecnología | URL Producción | Estado |
|---|---|---|---|
| **Dashboard Admin** | Next.js 15 / React 19 / Tailwind 4 | https://tad-dashboard.vercel.app | ✅ Operativo |
| **API Backend** | NestJS 10 / Prisma 5 / Express | https://tad-api.vercel.app | ✅ Operativo |
| **Tablet Player** | PWA (HTML + Service Worker + Cache API) | Carga local vía FullyKiosk | ✅ Funcional |
| **Base de Datos** | Supabase PostgreSQL (us-west-2) | Pool: puerto 6543 / Direct: 5432 | ✅ Conectada |
| **Storage** | Supabase Storage (bucket: `campaign-videos`) | Via Supabase SDK | ✅ Funcional |
| **Auth** | Supabase Auth (email/password) | Via Supabase SDK | ✅ Funcional |

---

## 🖥️ 2. ESTADO DE VISTAS DEL DASHBOARD

| Ruta | Propósito | Estado | Notas |
|---|---|---|---|
| `/login` | Login con Supabase Auth | ✅ Funcional | Credenciales: `admin@tad.do` / `TadAdmin2026!` |
| `/` (Home) | Dashboard general con stats | ✅ Funcional | KPIs, actividad reciente |
| `/campaigns` | CRUD de campañas publicitarias | ✅ Funcional | Crear, listar, eliminar, distribuir |
| `/campaigns/new` | Formulario de nueva campaña | ✅ Funcional | Fechas, anunciante, impressions |
| `/campaigns/[id]` | Detalle de campaña + upload video | ✅ Funcional | Subida a Supabase Storage |
| `/fleet` | Monitor de dispositivos/tablets | ✅ Funcional | Filtros, C2 remoto, perfil de nodo |
| `/drivers` | Gestión de choferes y suscripciones | ✅ Funcional | Data real de DB (13 choferes) |
| `/advertisers` | Base de datos de marcas/clientes | ✅ Funcional | Data real de DB (10 anunciantes) |
| `/finance` | Ingresos, nómina, exportaciones CSV | ✅ Funcional | Cálculos basados en PlaybackEvents |
| `/analytics` | Inteligencia: top taxis, plays/hora | ✅ Funcional | Propagaciones recientes (live feed) |
| `/media` | Galería de archivos subidos | ✅ Operativo | Previsualización vinculada a Supabase Storage |
| `/devices` | Inventario técnico de hardware | 🏗️ Mockup | Pendiente integración |

---

## 🔌 3. MÓDULOS BACKEND (NestJS)

| Módulo | Controller | Endpoints Principales | Estado |
|---|---|---|---|
| `AuthModule` | `auth.controller.ts` | `POST /api/auth/login`, `GET /api/auth/profile` | ✅ Funcional |
| `CampaignModule` | `campaign.controller.ts` | CRUD + `/upload` + `/assign` + `/drivers` + `DELETE` | ✅ Funcional |
| `FleetModule` | `fleet.controller.ts` | `/devices`, `/stats`, `/map`, `/finance`, `/:id/command`, `/register` | ✅ Funcional |
| `DriversModule` | `drivers.controller.ts` | `GET /`, `POST /`, `PUT /:id/subscription`, `/check-access` | ✅ Funcional |
| `AdvertisersModule` | `advertisers.controller.ts` | `GET /`, `POST /` | ✅ Funcional |
| `MediaModule` | `media.controller.ts` | `GET /`, `POST /upload`, `GET /:id/status` | ✅ Funcional |
| `FinanceModule` | `finance.controller.ts` | `/report/payroll`, `/report/campaigns`, `/simulate-payment`, `/export/*`, **`/invoice/:id`** | ✅ Funcional |
| `AnalyticsModule` | `analytics.controller.ts` | `/top-taxis`, `/hourly`, `/recent-plays`, **`/qr-scan`** | ✅ Funcional |
| `DeviceModule` | `device.controller.ts` | `/sync`, `/heartbeat`, `/command/:id/ack`, `/:id/profile`, `/:id/campaigns` | ✅ Funcional |
| `AssetsModule` | `assets.controller.ts` | Assets management | ✅ Funcional |

**Guard Global**: `SupabaseAuthGuard` protege TODAS las rutas. Para rutas públicas (tablet/player), usar el decorador `@Public()`.

---

## 🎯 4. REGLAS DE NEGOCIO IMPLEMENTADAS

### A. Regla de los 15 Slots
- Máximo 15 anuncios por tablet/taxi.
- Validado en backend y visualizado en frontend con barra de capacidad.

### B. Comandos Remotos (C2)
- `REBOOT`: Recarga completa del player.
- `CLEAR_CACHE`: Purga localStorage.
- `FORCE_SYNC`: Fuerza descarga inmediata de contenido.
- Feedback Loop: Player envía ACK al backend tras ejecución.

### C. Revenue Model
- **Cobro a Anunciantes**: RD$1,500/mes por anuncio de 30s.
- **Pago a Choferes**: RD$500/mes por campaña activa.
- **Ingreso por Taxi (Full)**: 15 × RD$1,500 = **RD$22,500/mes**.
- **Costo por Taxi**: 15 × RD$500 = **RD$7,500/mes**.
- **Margen Operativo**: RD$15,000/mes por taxi.

### D. Suscripciones de Choferes
- RD$6,000/año (plan ANNUAL) o RD$500/mes (plan MONTHLY).
- Si `subscriptionPaid == false` → acceso bloqueado para la tablet vía `checkTabletAccess`.

### E. Targeting de Campañas
- **Global** (`targetAll: true`): Todos los taxis activos reciben el contenido.
- **Selectivo**: Relación Many-to-Many `Campaign ↔ Driver` para segmentación manual.
- Endpoint de tablet (`/api/campaigns/tablet/:deviceId/playlist`) filtra por `driverId`.

---

## 📊 5. ESTADO DE LA BASE DE DATOS

### Data Actual en Producción
- **13 Choferes** registrados (nomenclatura TAD-XXXX, data real dominicana).
- **10 Anunciantes** (marcas top de SDQ/STI).
- **Dispositivos** vinculados a choferes via `driver.deviceId → device.deviceId`.

### Modelos Prisma Principales
`User`, `Device`, `Campaign`, `Driver`, `Advertiser`, `Subscription`, `Media`, `MediaAsset`, `Video`, `PlaybackEvent`, `DeviceCommand`, `DeviceHeartbeat`, `AnalyticsEvent`, `CampaignMetric`, `DeviceCampaign`, `PlaylistItem`, `Playlist`, `Fleet`.

---

## ⚠️ 6. RIESGOS IDENTIFICADOS

| Riesgo | Severidad | Estado |
|---|---|---|
| Inestabilidad de Handlers Serverless | Alta | ✅ Mitigado con CORS-First Handler |
| Bloqueo CORS en Producción | 🔴 Crítica | ✅ Resuelto con Header Injection en Vercel |
| Videos grandes > 50MB (Vercel limit) | 🟡 Media | Supabase Storage como intermediario |
| Muerte de tablet por batería | 🟡 Media | ✅ Mitigado con Telemetry Tracking |
| Leak de conexiones Prisma | 🔴 Alta | ✅ Mitigado (onModuleDestroy + `$disconnect()` + logging condicional) |
| Sin HTTPS local para PWA/Service Worker | 🟡 Media | No aplica en dev; usar `ngrok` para staging |
| BigInt serialization en Prisma | 🟢 Resuelto | `toJSON()` override en `main.ts` y `api/index.ts` |

---

## 📋 7. ROADMAP

### Sprint 1: ESTABILIDAD ✅ COMPLETADO
- [x] Subida de videos a Supabase Storage
- [x] Borrado de campañas y videos en cascada
- [x] Borrado de nodos en Fleet
- [x] Perfil de nodo con chofer y anuncios
- [x] Cache API + Service Worker en player
- [x] `prisma.$disconnect()` para Vercel
- [x] Relación granular Campaign ↔ Device
- [x] Revenue Protector (15 slots)
- [x] Mapa de calor por campaña

### Sprint 2: GESTIÓN DE FLOTA (EN PROGRESO)
- [x] Módulo de Choferes conectado a data real
- [x] Módulo de Anunciantes conectado a data real
- [x] Autenticación Supabase Auth (migrado de JWT local)
- [x] Targeting por chofer (many-to-many)
- [x] Bloqueo automático de tablets por falta de pago (SubscriptionGuard)
- [x] Tracking de QR Scans con Redirect Proxy (atribución directa)
- [x] Generador de Facturas HTML Print-Ready (Cero Costos)
- [x] Estructura GPS para Geo-fencing (Lat/Lng en PlaybackEvents)
- [x] Lógica de Geo-fencing (Filtrado por ciudad)
- [x] Monitoreo de salud de hardware (Batería/GPS en tiempo real)
- [x] Tracking de ubicación vía celular del chofer (Estrategia Mobile Gateway)
- [x] Sincronización de telemetría externa hacia Device ID
- [ ] Integración con WhatsApp API para alertas automáticas (Siguiente)

### Sprint 3: PILOTO DE CALLE (FUTURO)
- [ ] Onboarding de tablets en campo
- [ ] Dashboard analytics en tiempo real
- [ ] Alertas SMS/WhatsApp para choferes
- [ ] Integración con pasarela de pago
- [ ] Módulo de Nómina (RD$500/anuncio por taxi)
- [ ] Mapa de Calor de Reproducciones (Geo-fencing data)

---

## 📁 8. ESTRUCTURA DE ARCHIVOS CLAVE

```
tad-dooh-platform/
├── admin-dashboard/           # Next.js 15 Dashboard
│   ├── pages/                 # Rutas del dashboard
│   │   ├── login.tsx
│   │   ├── index.tsx          # Home/Dashboard
│   │   ├── campaigns/         # CRUD campañas
│   │   ├── fleet/             # Monitor de flota
│   │   ├── drivers/           # Gestión choferes
│   │   ├── advertisers/       # Gestión marcas
│   │   ├── finance/           # Ingresos y pagos
│   │   ├── analytics/         # Inteligencia
│   │   ├── media/             # Galería
│   │   └── devices/           # Inventario (mockup)
│   ├── components/            # Componentes reutilizables
│   ├── services/api.ts        # Axios client centralizado
│   └── .env.local             # NEXT_PUBLIC_API_URL (local dev)
├── backend/                   # NestJS API
│   ├── src/
│   │   ├── app.module.ts      # Root module
│   │   ├── main.ts            # Bootstrap + CORS
│   │   └── modules/
│   │       ├── auth/          # Login + Guard + @Public()
│   │       ├── campaign/      # CRUD + Upload + Targeting
│   │       ├── fleet/         # Devices + C2 + Finance
│   │       ├── drivers/       # Choferes + Suscripciones
│   │       ├── advertisers/   # Marcas
│   │       ├── media/         # Upload a Supabase Storage
│   │       ├── finance/       # Reportes + Exportación CSV
│   │       ├── analytics/     # Eventos + Top taxis
│   │       ├── device/        # Sync + Heartbeat + Profile
│   │       ├── prisma/        # PrismaService
│   │       └── supabase/      # SupabaseService
│   ├── api/index.ts           # Vercel serverless handler
│   ├── prisma/schema.prisma   # Esquema completo de DB
│   ├── vercel.json            # Routing config para Vercel
│   └── .env                   # Variables locales
└── tablet-player/             # PWA para tablets en taxis
```
