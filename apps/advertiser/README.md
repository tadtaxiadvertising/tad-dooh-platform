# tad-advertiser — Portal del Anunciante (v10.0.0)

> **Clasificación SRE:** Tier-2 (Comercial)
> **Última auditoría:** 2026-04-13
> **Mantenedor:** Equipo TAD Dominicana

---

## Resumen Ejecutivo

`tad-advertiser` es el **portal de autoservicio para anunciantes**. Es una aplicación Next.js 15 (Pages Router) donde los clientes corporativos gestionan sus campañas DOOH, monitorean el inventario de pantallas en tiempo real, suben contenido multimedia (con transcodificación local vía WebAssembly), y acceden a métricas de Business Intelligence.

### Rol en el flujo de TAD

```
                    ┌─────────────────────────┐
                    │     tad-advertiser       │ ◄── ESTE SERVICIO
                    │   (Next.js 15)           │
                    │   Puerto: 3000           │
                    │   PORTAL_TYPE=ADVERTISER  │
                    └────────────┬─────────────┘
                                 │
               ┌─────────────────┼──────────────────┐
               │                 │                  │
               ▼                 ▼                  ▼
     ┌──────────────┐   ┌──────────────┐   ┌───────────────┐
     │ /api/proxy/* │   │  Supabase    │   │ Supabase      │
     │ (Runtime     │   │    Auth      │   │  Storage      │
     │  Proxy)      │   │  (Login +    │   │ (Signed URL   │
     └──────┬───────┘   │  Onboarding) │   │  Upload)      │
            │           └──────────────┘   └───────────────┘
            ▼                                      ▲
     ┌──────────────┐                              │
     │   tad-api    │          FFmpeg.wasm          │
     │ (NestJS)     │  (Transcodificación local) ──┘
     └──────────────┘    en el NAVEGADOR del
                         anunciante (no backend)
```

**Diferencias clave vs. `tad-admin`:**
- Acceso restringido al rol `ADVERTISER` (o `ADMIN` como override)
- Incluye transcodificación de video **client-side** vía FFmpeg.wasm
- Subida de video mediante **Signed Upload URLs** (bypass de RLS)
- Calculadora de presupuesto con simulación de impacto
- Vista de red (inventario de pantallas) con mapa en tiempo real

### Capacidades del Portal Anunciante

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard** | `/advertiser/dashboard` | BI v6.0: KPIs, Budget Simulator, Billing Portal, métricas de ROI |
| **Campañas** | `/advertiser/campaigns` | Lista de campañas del anunciante, estado, métricas de playback |
| **Media** | `/advertiser/media` | Biblioteca multimedia + VideoUpload con transcodificación |
| **Red de Pantallas** | `/advertiser/network` | Mapa Leaflet real-time + sidebar de flota + heatmap |
| **Planificador** | `/advertiser/planner` | Simulador de presupuesto/alcance (Budget Pilot) |
| **Reports** | `/advertiser/reports` | Reportes de rendimiento de campañas |
| **Facturación** | `/advertiser/billing` | Estado de cuenta, historial de pagos |
| **Insights** | `/advertiser/insights` | Análisis avanzado de impresiones |
| **BI Dashboard** | `/advertiser/bi-v6` | Dashboard BI con métricas core |

### Páginas Públicas (sin auth)

| Ruta | Descripción |
|------|-------------|
| `/advertiser/login` | Login del anunciante (email + password vía Supabase Auth) |
| `/advertiser/onboarding` | **Wizard de auto-registro** (4 pasos): Segmentación → Presupuesto → Registro → Confirmación |
| `/check-in` | Check-in de dispositivos |
| `/p/*` | Páginas públicas genéricas |

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | Next.js (Pages Router) | 15.2.6 | SSR + API Routes + Standalone output |
| **UI Runtime** | React | 19.0.0 | Rendering de componentes |
| **Auth** | Supabase JS Client | ^2.99.1 | Login + session via cookie `sb-access-token` |
| **State** | Zustand | ^5.0.12 | Estado global (paymentStore) |
| **Data Fetching** | TanStack React Query + SWR | ^5.91.3 / ^2.4.1 | Cache, retry, stale-while-revalidate |
| **Video** | @ffmpeg/ffmpeg + @ffmpeg/util | ^0.12.15 / ^0.12.2 | **Transcodificación client-side** vía WebAssembly |
| **Styling** | Tailwind CSS | ^4.0.0 | Utility-first CSS |
| **Animaciones** | Framer Motion | ^12.38.0 | Transiciones de páginas y componentes |
| **Mapas** | Leaflet + React-Leaflet + MarkerCluster + Heatmap | ^1.9.4 / ^5.0.0 | Vista de red de pantallas |
| **Geo** | @turf/turf | ^7.3.4 | Cálculos geoespaciales |
| **Gráficas** | Recharts | ^2.15.0 | Métricas BI, impresiones, tendencias |
| **QR** | qrcode.react | ^4.2.0 | QR para campañas |
| **Observabilidad** | @sentry/nextjs | ^10.46.0 | Error tracking + source maps |
| **E2E Tests** | Playwright | ^1.58.2 | Tests de auth, GPS, offline |
| **HTTP** | Axios | ^1.13.6 | Requests API vía proxy |
| **Shared Packages** | @tad/services, @tad/ui, @tad/store | 0.1.0 | Monorepo shared code |

---

## Variables de Entorno y Conexiones

### Variables Build-Time (ARGs del Docker)

> **⚠️ CRÍTICO:** En EasyPanel, estas deben configurarse como **Build Args**. Si faltan, el portal no podrá autenticarse ni conectar al backend.

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Anon Key de Supabase (pública, para auth) |
| `NEXT_PUBLIC_API_URL` | `https://tad-api.easypanel.host/api` | URL pública del backend (fallback del proxy) |

### Variables Runtime (Environment del contenedor)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_PORTAL_TYPE` | `ADVERTISER` | **Identidad del portal.** Inyectada en Dockerfile. NO cambiar |
| `BACKEND_INTERNAL_URL` | `http://api:3000` | URL interna Docker → tad-api |
| `NODE_ENV` | `production` | Modo de ejecución |
| `NODE_OPTIONS` | `--max-old-space-size=1024` | Límite de heap para Next.js |
| `NEXT_TELEMETRY_DISABLED` | `1` | Desactiva telemetría de Vercel |
| `PORT` | `3000` | Puerto interno del contenedor |
| `HOSTNAME` | `0.0.0.0` | Bind en todas las interfaces |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | — | OAuth de Google (opcional) |

---

## Arquitectura de Archivos

```
apps/advertiser/
├── pages/
│   ├── _app.tsx                    # AuthProvider + QueryClient + PaymentLockOverlay
│   ├── _document.tsx               # HTML shell
│   ├── login.tsx                   # Redirect → /advertiser/login
│   ├── check-in.tsx                # Check-in público
│   ├── api/
│   │   └── proxy/
│   │       └── [...path].ts        # ⚠️ PROXY RUNTIME (idéntico a tad-admin)
│   └── advertiser/
│       ├── login.tsx               # Login page (Supabase Auth)
│       ├── onboarding.tsx          # 4-step self-registration wizard
│       ├── dashboard.tsx           # BI v6.0 dashboard principal
│       ├── campaigns/
│       │   └── index.tsx           # Lista y gestión de campañas
│       ├── media.tsx               # Biblioteca multimedia + upload
│       ├── network.tsx             # Mapa de red de pantallas (Leaflet live)
│       ├── planner.tsx             # Simulador de presupuesto (Budget Pilot)
│       ├── reports.tsx             # Reportes de campaña
│       ├── billing.tsx             # Estado de cuenta
│       ├── insights.tsx            # Análisis avanzado
│       └── bi-v6.tsx               # Dashboard BI alternativo
├── components/
│   ├── VideoUpload.tsx             # ⚠️ Upload con transcodificación + Signed URL
│   ├── DirectUpload.tsx            # Upload directo simple a Supabase Storage
│   ├── MapView.tsx                 # Mapa Leaflet (dynamic import, SSR disabled)
│   ├── CampaignModal.tsx           # Modal complejo de campañas (28KB)
│   ├── DeviceHubModal.tsx          # Hub de dispositivo (24KB)
│   ├── bi/
│   │   ├── BiMainDashboard.tsx     # Dashboard BI principal
│   │   ├── BiKpiCard.tsx           # Tarjeta KPI reutilizable
│   │   ├── BiHeatmap.tsx           # Wrapper del heatmap (dynamic)
│   │   ├── BiHeatmapInner.tsx      # Heatmap Leaflet inner component
│   │   ├── BillingPortal.tsx       # Portal de facturación
│   │   ├── BudgetSimulator.tsx     # Simulador de presupuesto interactivo
│   │   ├── MetricsGrid.tsx         # Grid de métricas del dashboard
│   │   └── ScreenUpsellCalculator.tsx  # Calculadora de upsell de pantallas
│   ├── dashboard/
│   │   ├── ImpressionChart.tsx     # Gráfica de impresiones (Recharts)
│   │   ├── LiveStatusBadge.tsx     # Badge de estado en vivo
│   │   ├── Sidebar.tsx             # Sidebar del advertiser dashboard
│   │   └── TopMetrics.tsx          # Métricas superiores del dashboard
│   ├── layout/
│   │   └── AdvertiserLayout.tsx    # Layout wrapper con título/subtítulo
│   ├── monitoring/                 # MonitoringMap, MonitoringSidebar
│   ├── map/                        # Componentes auxiliares de mapa
│   └── ui/                         # FleetSidebar + componentes UI base
├── hooks/
│   └── useVideoTranscoder.ts       # ⚠️ Hook de FFmpeg.wasm (transcodificación local)
├── utils/
│   └── simulations.ts              # Lógica del Budget Pilot (simulateImpact)
├── store/
│   └── usePaymentStore.ts          # Zustand: payment lock state
├── middleware.ts                    # Auth: rol ADVERTISER o ADMIN
├── next.config.ts                   # Standalone, memory optimization, Sentry
├── instrumentation.ts               # Sentry server-side
├── instrumentation-client.ts        # Sentry client-side
├── playwright.config.ts             # E2E test configuration
└── tsconfig.json
```

---

## Reglas de Negocio / Guardrails

> **⚠️ Directivas Cero aplicables a `tad-advertiser`.**

### 1. Flujo de Subida de Video — Client-Side Processing

Este es el flujo más crítico y diferenciador del portal anunciante:

```
                    ┌─────────────────────────────────────────────┐
                    │        NAVEGADOR DEL ANUNCIANTE             │
                    │                                             │
                    │  1. Seleccionar archivo (.mp4/.mov, ≤100MB) │
                    │  2. FFmpeg.wasm transcodifica localmente:   │
                    │     - H.264, CRF 28, 1080p max, faststart  │
                    │  3. Smart Fallback: si el resultado pesa    │
                    │     MÁS que el original → usa el original   │
                    │  4. Si WASM no disponible → subida directa  │
                    └───────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼─────────────────┐
                    │    GET /media/upload-url     │
                    │    → Obtiene Signed URL      │
                    │      del backend             │
                    └───────────┬─────────────────┘
                                │
                    ┌───────────▼─────────────────┐
                    │  PUT <signedUrl>             │
                    │    → Sube directo a          │
                    │      Supabase Storage        │
                    │    (NUNCA pasa por backend)   │
                    └───────────┬─────────────────┘
                                │
                    ┌───────────▼─────────────────┐
                    │  POST /campaigns/register   │
                    │    → Registra metadata       │
                    │      (ruta, tamaño, brandId) │
                    └─────────────────────────────┘
```

| Regla | Enforcement |
|-------|------------|
| **Video NUNCA viaja al backend Node.js** | `VideoUpload.tsx` usa Signed URL → `PUT` directo a Storage |
| **Transcodificación es client-side** | `useVideoTranscoder.ts` carga FFmpeg.wasm desde unpkg CDN |
| **Smart Fallback** | Si el video optimizado pesa más que el original, se descarta la optimización |
| **Fallback total** | Si FFmpeg falla (OOM, WASM no soportado), se sube el original sin comprimir |
| **Límite de 100MB client-side** | `MAX_FILE_SIZE_MB = 100` validado antes de cualquier procesamiento |
| **Backend registra solo metadata** | `POST /campaigns/register-media` recibe `{ fileName, storagePath, url, fileSize, brandId }` |
| **Formatos aceptados** | `video/mp4` y `video/quicktime` en el input |

### 2. Tarifas del Anunciante (Solo Visualización)

| Regla | Enforcement |
|-------|------------|
| **RD$1,500 por campaña (sin ITBIS)** | `BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD` en backend. Mostrado en onboarding/billing |
| **ITBIS 18%** | Calculado en onboarding: `budget * 0.18`. Constante `ITBIS_RATE` del backend |
| **Facturación por Playback Complete** | Contrato acepta cobro solo por reproducciones verificadas |
| **Budget Pilot** | `simulateImpact()` usa datos históricos de telemetría para proyección de alcance |

### 3. Autenticación y Acceso

| Regla | Enforcement |
|-------|------------|
| **Middleware valida rol `ADVERTISER`** | `decodeTokenRole()` en `middleware.ts` verifica `app_metadata.role` |
| **Admin puede acceder** | Si `role === 'ADMIN'`, el middleware permite acceso (override para soporte) |
| **Onboarding es público** | Ruta `/advertiser/onboarding` excluida del middleware auth |
| **Self-registration** | `POST /advertisers` crea cuenta desde el wizard (4 pasos) |
| **Token en cookie segura** | `sb-access-token`, TTL: 7 días, `SameSite=Lax` |

### 4. Mapa de Red de Pantallas (Inventario)

| Regla | Enforcement |
|-------|------------|
| **Auto-refresh cada 30s** | `setInterval(fetchData, 30000)` en `network.tsx` |
| **SSR deshabilitado para Leaflet** | `dynamic(import('MapView'), { ssr: false })` |
| **Modos: Live + Heatmap** | Toggle entre telemetría en tiempo real y mapa de densidad calórica |
| **Filtros de flota** | all / active / offline / unpaid — filtros client-side |
| **Tema dark/light persistido** | `localStorage.getItem('tad_map_theme')` |

---

## Despliegue

### Docker Build (Multi-Stage)

```
Phase 1 (builder):  npm install → NEXT_PUBLIC_* env injection → next build
Phase 2 (runner):   node:20-alpine, usuario nextjs:nodejs, standalone output
CMD: node apps/advertiser/server.js
```

### Comandos de Operación

```bash
# Desarrollo local (puerto 3002)
npm run dev               # next dev -p 3002

# Build producción
npm run build             # next build (standalone output)

# Start producción (local test)
npm run start             # node .next/standalone/server.js

# E2E Tests
npm run test:e2e          # Playwright full suite
npm run test:e2e:auth     # Tests de autenticación
npm run test:e2e:offline  # Tests de resiliencia offline
```
