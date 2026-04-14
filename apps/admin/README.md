# tad-admin — Centro de Control Administrativo (v10.0.0)

> **Clasificación SRE:** Tier-1 (Operacional Crítico)
> **Última auditoría:** 2026-04-13
> **Mantenedor:** Equipo TAD Dominicana

---

## Resumen Ejecutivo

`tad-admin` es el **centro de comando y control** de toda la plataforma TAD DOOH. Es un frontend Next.js 15 (Pages Router) que expone la interfaz de gestión completa de la red: flotas, campañas, conductores, anunciantes, finanzas, monitoreo en tiempo real (Leaflet maps), y Business Intelligence para inversionistas.

### Rol en el flujo de TAD

```
                              ┌────────────────────┐
                              │     tad-admin       │ ◄── ESTE SERVICIO
                              │  (Next.js 15)       │
                              │  Puerto: 3000       │
                              │  PORTAL_TYPE=ADMIN  │
                              └────────┬───────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     │                 │                 │
                     ▼                 ▼                 ▼
           ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
           │ /api/proxy/* │   │  Supabase   │   │  Supabase   │
           │ (Runtime      │   │    Auth     │   │   Storage   │
           │  Proxy a API) │   │  (Login)    │   │  (Direct    │
           └──────┬────────┘   └─────────────┘   │   Upload)   │
                  │ server-to-server              └─────────────┘
                  ▼
           ┌─────────────┐
           │   tad-api    │
           │  (NestJS)    │
           │  :3000 int.  │
           └─────────────┘
```

**Este servicio NO accede a la base de datos directamente.** Todo dato operativo se consume vía el proxy API route (`/api/proxy/*`), que reenvía requests al backend `tad-api` en runtime (no build-time).

### Capacidades del Panel Admin

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard** | `/admin/dashboard` | KPIs principales, alertas, resumen de flota |
| **Dashboard Realtime** | `/admin/dashboard/realtime` | Vista en vivo de telemetría y GPS |
| **Dispositivos** | `/admin/devices` | CRUD tablets, asignación de conductores, estado HW |
| **Campañas** | `/admin/campaigns` | CRUD, segmentación por ciudad/flota/conductor, media attach |
| **Campañas (nueva)** | `/admin/campaigns/new` | Wizard de creación con selección de targets |
| **Campañas (detalle)** | `/admin/campaigns/[id]` | Vista individual + métricas |
| **Conductores** | `/admin/drivers` | CRUD, onboarding, niveles, suscripciones |
| **Onboarding** | `/admin/drivers/onboarding` | Flujo legal (contratos, seguros) |
| **Anunciantes** | `/admin/advertisers` | CRUD, detalle, portal requests |
| **Solicitudes Portal** | `/admin/advertisers/requests` | Aprobación de solicitudes de portales |
| **Media** | `/admin/media` | Biblioteca multimedia, upload directo a Supabase |
| **Fleet Tracking** | `/admin/fleet` | Mapa Leaflet con estado live de toda la flota |
| **Fleet Offline** | `/admin/fleet/offline` | Dispositivos con connectivity_issue |
| **Tracking** | `/admin/tracking` | Historial de posiciones y rutas |
| **Monitoreo** | `/admin/monitoring` | Panel de alertas y estado de dispositivos |
| **Finanzas** | `/admin/finance` | Nómina, ledger, transacciones, morosidad |
| **Exportaciones** | `/admin/finance/exports` | Descarga CSV de nómina y campañas |
| **Inversionistas** | `/admin/finance/investor` | Unit Economics: CAC, LTV, EBITDA, Payback |
| **BI** | `/admin/bi` | Dashboard estratégico: MRR, Yield/Screen, ARPU |
| **Reconciliación** | `/admin/bi/reconciliation` | Auditoría de discrepancias financieras |
| **Analytics** | `/admin/analytics` | Eventos de playback, impresiones por campaña |
| **Analytics History** | `/admin/analytics/history` | Histórico de métricas |

### Páginas Públicas (sin auth)

| Ruta | Descripción |
|------|-------------|
| `/login` o `/admin/login` | Login del administrador (email + password) |
| `/check-in` | Check-in de dispositivos / conductores |
| `/p/*` | Páginas públicas genéricas |

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | Next.js (Pages Router) | 15.2.6 | SSR + API Routes + Standalone output |
| **UI Runtime** | React | 19.0.0 | Rendering de componentes |
| **Auth** | Supabase JS Client | ^2.99.1 | Login + session via cookie `sb-access-token` |
| **State** | Zustand | ^5.0.12 | Estado global (ej. PaymentLock) |
| **Data Fetching** | TanStack React Query + SWR | ^5.91.3 / ^2.4.1 | Cache, retry, stale-while-revalidate |
| **Styling** | Tailwind CSS | ^4.0.0 | Utility-first CSS |
| **Animaciones** | Framer Motion | ^12.38.0 | Transiciones y micro-interacciones |
| **Mapas** | Leaflet + React-Leaflet + MarkerCluster + Heatmap | ^1.9.4 / ^5.0.0 | Fleet tracking en tiempo real |
| **Geo** | @turf/turf | ^7.3.4 | Cálculos geoespaciales |
| **Gráficas** | Recharts | ^2.15.0 | BI dashboards, series temporales |
| **QR** | qrcode.react | ^4.2.0 | Generación de QR para campañas |
| **Toasts** | Sonner | ^2.0.7 | Notificaciones UI |
| **Observabilidad** | @sentry/nextjs | ^10.46.0 | Error tracking + source maps |
| **E2E Tests** | Playwright | ^1.58.2 | Tests de auth, GPS, offline |
| **HTTP** | Axios | ^1.13.6 | Requests API vía proxy |
| **Icons** | Lucide React | ^0.475.0 | Iconografía consistente |
| **Shared Packages** | @tad/services, @tad/ui, @tad/store | 0.1.0 | Monorepo shared code |

---

## Variables de Entorno y Conexiones

### Variables Build-Time (ARGs del Docker)

> **⚠️ CRÍTICO:** En EasyPanel, estas deben configurarse como **Build Args**, no solo como Environment Variables. Si faltan durante el build, las vistas SSR no tendrán acceso al backend.

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL del proyecto Supabase (baked en el bundle del cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Anon Key de Supabase (pública, para auth) |
| `NEXT_PUBLIC_API_URL` | `https://tad-api.easypanel.host/api` | URL pública del backend (fallback del proxy) |

### Variables Runtime (Environment del contenedor)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_PORTAL_TYPE` | `ADMIN` | **Identidad del portal.** Inyectada en Dockerfile. NO cambiar |
| `BACKEND_INTERNAL_URL` | `http://api:3000` | URL interna Docker → tad-api (red de EasyPanel). **Prioridad 1 del proxy** |
| `NODE_ENV` | `production` | Modo de ejecución |
| `NODE_OPTIONS` | `--max-old-space-size=1024` | Límite de heap para Next.js standalone |
| `NEXT_TELEMETRY_DISABLED` | `1` | Desactiva telemetría de Vercel |
| `PORT` | `3000` | Puerto interno del contenedor |
| `HOSTNAME` | `0.0.0.0` | Bind en todas las interfaces |
| `SENTRY_AUTH_TOKEN` | — | Token para upload de source maps (solo build) |
| `NEXT_PUBLIC_SENTRY_DSN` | hardcoded | DSN de Sentry para error tracking |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | — | OAuth de Google (opcional) |

### Cascada de URL del Backend (Proxy)

El proxy `/api/proxy/*` resuelve la URL del backend en este orden:

```
1. BACKEND_INTERNAL_URL    → http://api:3000         (red interna Docker - MÁS RÁPIDO)
2. NEXT_PUBLIC_API_URL     → https://...easypanel.host (URL pública - fallback)
3. HARDCODED               → https://proyecto-ia-tad-api.rewvid.easypanel.host (último recurso)
```

Si el Target 1 falla (ENOTFOUND/ECONNREFUSED), el proxy automáticamente reintenta con el fallback público.

### Endpoints Internos

| Recurso | URL | Notas |
|---------|-----|-------|
| Portal Admin | `:3000/admin/*` | Todas las rutas protegidas por middleware |
| Proxy API | `:3000/api/proxy/*` | Server-to-server hacia tad-api |
| Proxy Health | `:3000/api/proxy/_proxy_health` | Diagnóstico del proxy: target URL, fuente de env |
| Static Assets | `:3000/_next/static/*` | Archivos estáticos (standalone output) |

---

## Arquitectura de Archivos

```
apps/admin/
├── pages/
│   ├── _app.tsx                  # AuthProvider + QueryClient + PaymentLockOverlay + Toaster
│   ├── _document.tsx             # HTML shell con meta tags
│   ├── login.tsx                 # Redirect → /admin/login
│   ├── index.tsx                 # Redirect → /admin
│   ├── check-in.tsx              # Check-in público (sin auth)
│   ├── p/                        # Páginas públicas
│   ├── api/
│   │   └── proxy/
│   │       └── [...path].ts      # ⚠️ PROXY RUNTIME — todo el tráfico API pasa por aquí
│   └── admin/
│       ├── index.tsx             # Redirect → /admin/dashboard
│       ├── login.tsx             # Login (email/password + Supabase Auth)
│       ├── dashboard/            # KPIs + Realtime view
│       ├── devices/              # Gestión de tablets
│       ├── campaigns/            # CRUD de campañas + wizard + detalle [id]
│       ├── drivers/              # Gestión de conductores + onboarding
│       ├── advertisers/          # Gestión de anunciantes + requests
│       ├── media/                # Biblioteca multimedia
│       ├── fleet/                # Tracking GPS + mapa + offline view
│       ├── tracking/             # Historial de rutas
│       ├── monitoring/           # Panel de alertas
│       ├── finance/              # Nómina + exports + investor metrics
│       ├── bi/                   # BI dashboard + reconciliación
│       └── analytics/            # Playback events + history
├── components/
│   ├── AdvertiserModal.tsx       # Modal CRUD anunciantes
│   ├── CampaignModal.tsx         # Modal CRUD campañas (28KB — el más complejo)
│   ├── CampaignInventoryView.tsx # Vista de inventario
│   ├── DeviceHubModal.tsx        # Hub de dispositivo (24KB)
│   ├── DeviceModal.tsx           # CRUD dispositivos
│   ├── DeviceSelectorModal.tsx   # Selector de dispositivos para asignación
│   ├── DeviceSlotsInfo.tsx       # Info de slots
│   ├── DeviceCampaignsPanel.tsx  # Campañas asignadas a un device
│   ├── DirectUpload.tsx          # ⚠️ Upload directo a Supabase Storage (client-side)
│   ├── DriverModal.tsx           # CRUD conductores
│   ├── MapView.tsx               # Mapa Leaflet principal
│   ├── bi/                       # BiHeatmap, BiKpiCard
│   ├── map/                      # Componentes de mapa auxiliares
│   ├── monitoring/               # MonitoringMap, MonitoringSidebar
│   └── ui/                       # Componentes UI reutilizables
├── store/
│   └── usePaymentStore.ts        # Zustand: estado global de payment lock
├── middleware.ts                  # Auth middleware: valida cookie + rol ADMIN
├── next.config.ts                 # Standalone output, rewrites, Sentry, memory optimization
├── instrumentation.ts             # Sentry server-side init
├── instrumentation-client.ts      # Sentry client-side init
├── styles/
│   └── globals.css                # Tailwind base + custom tokens
└── tsconfig.json
```

---

## Reglas de Negocio / Guardrails

> **⚠️ Las siguientes son Directivas Cero aplicables a `tad-admin`. Violarlas constituye un incidente P0.**

### 1. Infraestructura (EasyPanel) — Límite de Memoria 512MB

```dockerfile
# Dockerfile.admin — Línea 39
ENV NODE_OPTIONS="--max-old-space-size=1024"
```

| Regla | Enforcement |
|-------|------------|
| **El contenedor tiene límite estricto de 512MB RAM en EasyPanel** | `NODE_OPTIONS` restringe V8 heap. Next.js standalone minimiza overhead |
| **Build optimizado para RAM baja** | `webpackBuildWorker: true` + `parallelServerCompiles: false` en `next.config.ts` |
| **Output Standalone** | `output: "standalone"` — genera server.js auto-contenido, elimina dependencias innecesarias |
| **ESLint/TypeScript ignorados en build** | `ignoreDuringBuilds: true` / `ignoreBuildErrors: true` — previene OOM durante build en VPS |
| **No se usa `getServerSideProps` para data** | Todo data-fetching es client-side vía React Query/SWR → reduce carga del servidor |

### 2. Gestión Multimedia — Anti-OOM

| Regla | Enforcement |
|-------|------------|
| **Videos NUNCA pasan por el servidor Next.js** | `DirectUpload.tsx` sube directo a Supabase Storage desde el navegador del admin |
| **Límite de 50MB validado client-side** | `handleFileChange()` rechaza archivos >50MB antes de cualquier upload |
| **Solo formato MP4 permitido** | Validación `file.type !== 'video/mp4'` en el componente |
| **El proxy API tiene `bodyParser: false`** | El catch-all `[...path].ts` no parsea bodies — streamed al backend |

### 3. Finanzas y Nómina — Solo Visualización

| Regla | Enforcement |
|-------|------------|
| **RD$500 por anuncio transmitido** | `tad-admin` MUESTRA esta cifra; el cálculo ocurre en `tad-api.FinanceService` |
| **RD$6,000 de anualidad** | Mostrado en módulo de finanzas; definido en `BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD` del backend |
| **Admin no modifica tarifas directamente** | Las constantes de negocio viven en `tad-api/src/common/constants/business-rules.ts` |
| **Exportaciones CSV delegadas al backend** | Los endpoints `/finance/exports/*` generan CSV server-side; admin solo descarga |

### 4. Kill-Switch (402) — Visualización Admin

| Regla | Enforcement |
|-------|------------|
| **Admin ve el estado de morosidad** | Conductores con suscripción vencida se marcan visualmente en `/admin/drivers` |
| **PaymentLockOverlay** | Componente global en `_app.tsx` que puede bloquear la UI si se activa desde `usePaymentStore` |
| **402 solo lo recibe el celular** | Admin no envía el 402; lo visualiza como estado del conductor/dispositivo |

### 5. Autenticación y Seguridad

| Regla | Enforcement |
|-------|------------|
| **Middleware de Next.js valida rol ADMIN** | `middleware.ts` decodifica `sb-access-token` cookie y verifica `app_metadata.role === 'ADMIN'` |
| **Token en cookie segura** | `SameSite=Lax`, `Secure` en HTTPS. TTL: 7 días (604800s) |
| **Proxy reenvía Authorization header** | `getForwardHeaders()` normaliza y reenvía el Bearer token al backend |
| **Proxy loguea 401s** | Security auditing: cada 401 del backend se registra en console con estado del header |

---

## Despliegue

### Docker Build (Multi-Stage)

```
Phase 1 (builder):  npm install → NEXT_PUBLIC_* env inyección → next build
Phase 2 (runner):   Standalone output → server.js + static + public
```

### Diagrama del Build

```
┌─ builder ──────────────────────────────────────┐
│  COPY monorepo deps (packages/ + apps/admin)   │
│  npm install (resuelve @tad/services, @tad/ui) │
│  ARG NEXT_PUBLIC_SUPABASE_URL                  │
│  ARG NEXT_PUBLIC_SUPABASE_ANON_KEY             │
│  ARG NEXT_PUBLIC_API_URL                       │
│  npm run build                                 │
└──────────────────────┬─────────────────────────┘
                       │
┌─ runner ─────────────▼─────────────────────────┐
│  node:20-alpine (user: nextjs:nodejs)          │
│  COPY .next/standalone/ → ./                   │
│  COPY .next/static → apps/admin/.next/static   │
│  COPY public → apps/admin/public               │
│  CMD ["node", "apps/admin/server.js"]          │
│  EXPOSE 3000                                   │
└────────────────────────────────────────────────┘
```

### Comandos de Operación

```bash
# Desarrollo local (puerto 3002 para no colisionar con tad-api)
npm run dev               # next dev -p 3002

# Build producción
npm run build             # next build (standalone output)

# Start producción (local test)
npm run start             # node .next/standalone/server.js

# E2E Tests
npm run test:e2e          # Playwright full suite
npm run test:e2e:auth     # Solo tests de autenticación
npm run test:e2e:gps      # Solo tests de GPS batch
npm run test:e2e:offline  # Solo tests de resiliencia offline
npm run test:e2e:report   # Abrir reporte HTML
```

---

## Shared Packages (Monorepo)

| Package | Propósito |
|---------|----------|
| `@tad/services` | Cliente Supabase, API helpers, función `login()` |
| `@tad/ui` | Layout, AuthProvider, PaymentLockOverlay, AntigravityButton, useAntigravity hook |
| `@tad/store` | Stores Zustand compartidos entre portales |

Estos paquetes se resuelven vía monorepo workspaces y se transpilan con `transpilePackages` en `next.config.ts`.
