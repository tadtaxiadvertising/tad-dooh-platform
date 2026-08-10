# tad-driver — Portal del Conductor & Mobile Gateway (v10.0.0)

> **Clasificación SRE:** Tier-0 (Infraestructura de Flota)
> **Última auditoría:** 2026-04-13
> **Mantenedor:** Equipo TAD Dominicana

---

## Resumen Ejecutivo

`tad-driver` es el portal **más crítico operacionalmente** de la plataforma TAD. Cumple **dos roles simultáneos:**

1. **Driver Dashboard (PWA):** Panel financiero y de telemetría del conductor, accesible desde su celular.
2. **Mobile Gateway (Check-In):** Página que el conductor abre al escanear el QR de la tablet. Convierte el celular 4G del conductor en un **gateway de telemetría GPS**, batching datos y sincronizándolos al backend.

### Arquitectura Dual del Portal

```
                ┌─────────────────────────────────────────────┐
                │           tad-driver (Next.js 15)           │
                │           Puerto: 3000                      │
                │           PORTAL_TYPE=DRIVER                │
                ├─────────────────────┬───────────────────────┤
                │                     │                       │
                │  DASHBOARD (PWA)    │   MOBILE GATEWAY      │
                │  /driver/*          │   /check-in           │
                │                     │                       │
                │  • Balance/Wallet   │   • GPS watchPosition │
                │  • Telemetry HUD    │   • Batch buffer (10) │
                │  • Support tickets  │   • Auto-flush 60s    │
                │  • Referral system  │   • Offline buffer    │
                │  • Payout requests  │   • 402 Hibernation   │
                └──────────┬──────────┴──────────┬────────────┘
                           │                     │
              ┌────────────▼────────────┐  ┌─────▼──────────────┐
              │  /api/proxy/*           │  │ POST /monitoring/  │
              │  (Runtime Proxy)        │  │   gps-batch        │
              │  → GET /drivers/me/hub  │  │                    │
              │  → POST /portal-reqs    │  │ { driverId,        │
              │  → POST /drivers/login  │  │   deviceId,        │
              └────────────┬────────────┘  │   points: [...] }  │
                           │               └─────┬──────────────┘
                           ▼                     ▼
                    ┌──────────────────────────────┐
                    │         tad-api (NestJS)      │
                    │   MonitoringService           │
                    │   DriversService              │
                    │   FinanceService              │
                    └──────────────────────────────┘
```

---

## Rutas y Páginas

### Rutas Protegidas (rol `DRIVER` o `ADMIN` override)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/driver/dashboard` | `dashboard.tsx` | **⚠️ Hub principal.** Balance financiero, Progress Ring (meta 120h), Telemetry HUD, Kill-Switch alert, Support/Invite modals, bottom nav |
| `/driver/wallet` | `wallet.tsx` | Billetera: balance disponible, historial de transacciones, botón de retiro |

### Rutas Públicas (sin auth)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/driver/login` | `login.tsx` | Login por **teléfono + contraseña** (no email). Incluye registro inline y recuperación de contraseña |
| `/driver/onboarding` | `onboarding.tsx` | **Wizard de reclutamiento** (4 pasos): Propuesta de valor → Calculadora de ganancias → Registro → Confirmación |
| `/check-in` | `check-in.tsx` | **⚠️ Mobile Gateway.** Página de telemetría GPS. Se abre vía QR scan de la tablet (`?deviceId=XXX`) |
| `/login` | `login.tsx` | Redirect a /driver/login |

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | Next.js (Pages Router) | 15.2.6 | SSR + API Routes + Standalone |
| **UI** | React | 19.0.0 | Componentes |
| **Auth** | API propia (phone+password) | — | `POST /drivers/login` → JWT → cookie `sb-access-token` |
| **State** | Zustand | ^5.0.12 | `usePaymentStore` |
| **Fetching** | TanStack React Query + SWR | ^5.91.3 / ^2.4.1 | Cache, retry |
| **Animations** | Framer Motion | ^12.38.0 | Kill-Switch banners, modals |
| **Mapas** | Leaflet + React-Leaflet | ^1.9.4 / ^5.0.0 | MapView (check-in, future) |
| **Geo** | @turf/turf | ^7.3.4 | Cálculos geoespaciales |
| **Charts** | Recharts | ^2.15.0 | Gráficas financieras |
| **QR** | qrcode.react | ^4.2.0 | QR de referidos |
| **Styling** | Tailwind CSS | ^4.0.0 | Utility-first |
| **Observability** | @sentry/nextjs | ^10.46.0 | Error tracking |
| **E2E Tests** | Playwright | ^1.58.2 | Auth, GPS batch, offline |
| **HTTP** | Axios | ^1.13.6 | API calls |
| **Shared** | @tad/services, @tad/ui, @tad/store | 0.1.0 | Monorepo packages |
| **Gateway** | @tad/services/mobile-gateway | — | `startTadTracking()`, states machine |

---

## Variables de Entorno

### Build-Time (ARGs Docker)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Anon Key (auth) |
| `NEXT_PUBLIC_API_URL` | `https://tad-api.easypanel.host/api` | URL pública del backend |

### Runtime

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NEXT_PUBLIC_PORTAL_TYPE` | `DRIVER` | Identidad del portal. Inyectada en Dockerfile |
| `BACKEND_INTERNAL_URL` | `http://api:3000` | URL interna Docker |
| `NODE_OPTIONS` | `--max-old-space-size=256 --expose-gc` | Heap limit aligned with Easypanel (512 MB service limit) |
| `NEXT_TELEMETRY_DISABLED` | `1` | No telemetría Vercel |
| `PORT` | `3000` | Puerto interno |

---

## Despliegue manual en Easypanel

Usa el `Dockerfile.driver` de la raíz del monorepo; no uses `apps/driver/Dockerfile`.
Configura como variables del servicio: `NODE_ENV=production`,
`NEXT_TELEMETRY_DISABLED=1`, `NODE_OPTIONS=--max_old_space_size=256` y
`NEXT_PUBLIC_API_URL` con la ruta interna correcta del API Gateway (por ejemplo,
`http://api:3000`, según la red del proyecto). Mantén `BACKEND_INTERNAL_URL`
como destino runtime del proxy cuando esté disponible.

Después de reconstruir y reiniciar, verifica la URL pública
`https://tad-driver.rewvid.easypanel.host`, el registro de `sw.js` sin 302 y
un `POST /api/proxy/fleet/track-batch`. No consideres el despliegue confirmado
hasta revisar los logs y comprobar que el consumo permanece bajo 512 MB.

---

## Arquitectura de Archivos

```
apps/driver/
├── pages/
│   ├── _app.tsx                    # AuthProvider + QueryClient + PaymentLockOverlay + useAntigravity()
│   ├── _document.tsx               # HTML shell
│   ├── login.tsx                   # Redirect
│   ├── check-in.tsx                # ⚠️ MOBILE GATEWAY — GPS telemetry page
│   ├── api/
│   │   └── proxy/
│   │       └── [...path].ts        # Runtime proxy → tad-api
│   ├── driver/
│   │   ├── login.tsx               # Phone auth (login + register + forgot)
│   │   ├── onboarding.tsx          # 4-step driver recruitment wizard
│   │   ├── dashboard.tsx           # ⚠️ MAIN HUB — Financial + Telemetry + Alerts
│   │   └── wallet.tsx              # Balance + transaction history
│   └── p/                          # Public pages
├── components/
│   ├── MapView.tsx                 # Leaflet map (SSR disabled)
│   ├── DirectUpload.tsx            # Upload component
│   ├── CampaignModal.tsx           # Campaign detail modal
│   ├── DeviceHubModal.tsx          # Device hub detail
│   ├── bi/                         # BI components
│   ├── monitoring/                 # Monitoring widgets
│   ├── map/                        # Map sub-components
│   └── ui/                         # FleetSidebar, base UI
├── store/
│   └── usePaymentStore.ts          # Zustand: payment lock state
├── middleware.ts                   # Auth: rol DRIVER o ADMIN
├── next.config.ts                  # Standalone, memory optimization
├── instrumentation.ts              # Sentry server
├── instrumentation-client.ts       # Sentry client
├── playwright.config.ts            # E2E tests
└── tsconfig.json
```

---

## Reglas de Negocio / Guardrails

> **⚠️ Directivas Cero — tad-driver es donde viven las reglas financieras del conductor.**

### 1. Compensación del Conductor (DIRECTIVA CERO #1)

| Regla | Enforcement en Código |
|-------|----------------------|
| **RD$500 por campaña activa / mes** | `onboarding.tsx`: `projectedEarnings = (campaigns * 500) + 500`. Visualizado en calculadora Step 2 |
| **RD$500 bono de disponibilidad** | Requiere ≥100 GPS points/mes. Mostrado en `dashboard.tsx` como "Bono Diario" |
| **RD$500 por referido** | `copyReferral()` genera link `tad.do/driver/onboarding?ref=<userId>`. UI: "Invitar Chofer +RD$300" (monto display vs regla de negocio puede diferir — verificar con backend) |
| **RD$6,000 membresía anual (Starter Kit)** | Mostrado en onboarding Step 2 y Step 3 agreements. Kill-Switch alert: "Regulariza tu anualidad (RD$6k)" |
| **NO hay pago por desempeño/tiempo** | El dashboard muestra "Balance Base (Ads & Referidos)" — solo transacciones verificadas |

### 2. Motor de Telemetría GPS (Dashboard)

El dashboard incluye un **motor de telemetría embebido** que corre en background:

```
┌──────────────────────────────────────────────────────────────┐
│  TELEMETRY ENGINE (dashboard.tsx useEffect)                  │
│                                                              │
│  navigator.geolocation.watchPosition()                       │
│     ↓                                                        │
│  locationQueue.push({ latitude, longitude, speed, timestamp})│
│     ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Flush Conditions:                                     │    │
│  │  • Queue >= 20 points  → flush inmediato              │    │
│  │  • Cada 60 segundos    → auto-flush                   │    │
│  │  • window.online event → flush al reconectar          │    │
│  └──────────────────────────────────────────────────────┘    │
│     ↓                                                        │
│  POST /monitoring/gps-batch                                  │
│  { driverId, deviceId, points: [...] }                       │
│     ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ ERROR HANDLING:                                       │    │
│  │  • Network error → re-enqueue batch                   │    │
│  │  • 402 Payment Required → HIBERNATION PROTOCOL        │    │
│  │    - isHibernating = true                             │    │
│  │    - Wait backoffDelay (1min → 2min → ... → 1hr max)  │    │
│  │    - Resume after delay                               │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

| Parámetro | Valor | Notas |
|-----------|-------|-------|
| `enableHighAccuracy` | `true` | GPS preciso (más consumo de batería) |
| `maximumAge` | 10000ms | Cache de 10s |
| `timeout` | 5000ms | Fallo si no obtiene GPS en 5s |
| Flush interval | 60s | Auto-flush periódico |
| Burst threshold | 20 points | Flush forzado si cola crece |
| Hibernation backoff | 60s → 3600s (x2 cada fallo) | Exponential backoff para 402 |

### 3. Mobile Gateway (Check-In)

La página `/check-in` es el **nodo de telemetría real** de la flota. Usa `@tad/services/mobile-gateway`:

| Estado | Significado | UX |
|--------|------------|-----|
| `IDLE` | Esperando GPS | Icono gris, "PREPARANDO GPS..." |
| `INITIALIZING` | Iniciando rastreo | Spinner amarillo |
| `TRACKING` | GPS activo, captando puntos | Navegación pulsante amarilla |
| `BUFFERING` | Acumulando datos en buffer | Icono azul, "BUFFERING DATA" |
| `SYNCING` | Enviando batch al backend | Spinner amarillo |
| `SYNCED` | Batch enviado exitosamente | Check verde |
| `OFFLINE` | Sin red, guardando local | Icono amarillo, "OFFLINE BUFFER" |
| `GPS_ERROR` | Error de geolocalización | Icono rojo |
| `SUSPENDED` | **Kill-Switch activo (402)** | Banner rojo pulsante, "Servicio Suspendido" |
| `DEVICE_NOT_FOUND` | `deviceId` no existe en BD | Icono naranja, "SIN REGISTRO" |

**Métricas en pantalla:**
- **Buffer:** `batchSize/10` — puntos acumulados antes del flush
- **Sync:** Total de puntos sincronizados al backend
- **Time:** Hora del último sync exitoso

### 4. Kill-Switch y Morosidad (DIRECTIVA CERO #6)

| Regla | Enforcement |
|-------|------------|
| **402 Payment Required** | Manejado por el **celular** (Mobile Gateway), NO por la tablet |
| **Dashboard: banner no-bloqueante** | `subscriptionStatus !== 'ACTIVE'` → banner rojo "Servicio Limitado" + botón "Regularizar" |
| **Dashboard: penalidad at-risk** | `penaltyStatus.isAtRisk` → banner naranja pulsante "Faltan Xh para evitar penalidad del 10%" |
| **Gateway: SUSPENDED state** | Banner rojo en `/check-in` — "Tu cuenta tiene una restricción activa" |
| **Telemetry: hibernación** | Motor GPS entra en backoff exponencial (1min → 1hr) tras recibir 402 |
| **PaymentLockOverlay** | Componente global en `_app.tsx` — overlay de bloqueo si hay deuda |

### 5. Autenticación (DRIVER-specific)

| Regla | Enforcement |
|-------|------------|
| **Login por TELÉFONO** (no email) | `POST /drivers/login { phone, password }` → JWT custom |
| **Token almacenado en cookie + localStorage** | `sb-access-token` (cookie) + `tad_driver_token` + `tad_driver_user` (localStorage) |
| **Middleware verifica rol `DRIVER`** | `decodeTokenRole()` en `middleware.ts` |
| **Admin override** | `ADMIN` puede acceder a rutas del driver |
| **Onboarding público** | `/driver/onboarding` excluido del auth |
| **Recuperación de contraseña** | Manual vía soporte TAD (no hay SMS recovery aún) |
| **Registro inline** | Wizard de 4 pasos + form directo en login page |

### 6. Onboarding del Conductor

Wizard de 4 pasos para reclutamiento:

| Step | Nombre | Contenido |
|------|--------|-----------|
| **1** | Propuesta de Valor | 4 beneficios: RD$500/campaña, Internet 5G, Bono disponibilidad, Referidos |
| **2** | Calculadora de Ingresos | Slider de campañas (3-15) × RD$500 + bono. Tabla de costos con membresía RD$6,000 |
| **3** | Registro | Form: nombre, teléfono, cédula, placa, contraseña + 2 agreements (contrato + hardware) |
| **4** | Confirmación | Terminal-style status check + redirect a login |

---

## Despliegue

### Docker Build

```
Phase 1 (builder):  npm install → NEXT_PUBLIC_* injection → next build
Phase 2 (runner):   node:20-alpine, usuario nextjs:nodejs, standalone
CMD: node apps/driver/server.js
```

### Comandos de Operación

```bash
# Desarrollo local (puerto 3002)
npm run dev

# Build producción
npm run build

# E2E Tests
npm run test:e2e            # Suite completa
npm run test:e2e:auth       # Auth flow
npm run test:e2e:gps        # GPS batch sync
npm run test:e2e:offline    # Offline resilience
```

---

## Componentes Compartidos Críticos

| Package | Componente | Uso en tad-driver |
|---------|-----------|------------------|
| `@tad/ui` | `AuthProvider` | Contexto de autenticación |
| `@tad/ui` | `Layout` | Wrapper para páginas protegidas |
| `@tad/ui` | `PaymentLockOverlay` | Overlay global de bloqueo por morosidad |
| `@tad/ui` | `PortalRequestCenter` | Centro de solicitudes (soporte, payouts) |
| `@tad/ui` | `useAntigravity` | Realtime sync hook (inicializado en `_app.tsx`) |
| `@tad/ui` | `useAuth` | Hook de sesión |
| `@tad/services` | `api` (axios instance) | HTTP client configurado con proxy |
| `@tad/services` | `logout` | Función de cierre de sesión |
| `@tad/services/mobile-gateway` | `startTadTracking`, `stopTadTracking`, `onGatewayStateChange` | Motor de telemetría del check-in |
