# 📝 01 — AUDITORÍA TAD DOOH PLATFORM 2026

> **Propósito**: Estado completo del ecosistema para continuidad de desarrollo con cualquier agente o desarrollador.
> **Propósito**: Estado completo del ecosistema para continuidad de desarrollo con cualquier agente o desarrollador.
> **Última Actualización**: 2026-03-20T14:10:00-04:00
> **Estado Operativo Actual**: Layout Responsive (Móvil/Tablet) Completado. Diseño UI "Dark Premium" homologado en todas las vistas. Sincronización Realtime Broadcast integrada.

---

## 🏗️ 1. ARQUITECTURA GENERAL

```text
┌──────────────────────────────────────────────────────────────┐
│             TAD DOOH PLATFORM — ARQUITECTURA                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [Admin Dashboard]       [API Backend]       [Tablet PWA]    │
│   Next.js 15.1.7 (React 19) NestJS 10           HTML + SW     │
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
| --- | --- | --- | --- |
| **Dashboard Admin** | Next.js 15 / React 19 / Tailwind 4 | <https://tad-dashboard.vercel.app> | ✅ Operativo |
| **API Backend** | NestJS 10 / Prisma 5 / Express | <https://tad-api.vercel.app> | ✅ Operativo |
| **Tablet Player** | PWA (HTML + Service Worker + Cache API) | Carga local vía FullyKiosk | ✅ Funcional |
| **Base de Datos** | Supabase PostgreSQL (us-west-2) | Pool: puerto 6543 / Direct: 5432 | ✅ Conectada |
| **Storage** | Supabase Storage (bucket: `campaign-videos`) | Via Browser-Direct Upload | ✅ Operativo |
| **Auth** | Supabase Auth (email/password) | Via Supabase SDK | ✅ Funcional |

---

## 🖥️ 2. ESTADO DE VISTAS DEL DASHBOARD

| Ruta | Propósito | Estado | Notas |
| --- | --- | --- | --- |
| `/login` | Login con Supabase Auth | ✅ Funcional | Credenciales: `admin@tad.do` / `TadAdmin2026!` |
| `/` (Home) | Dashboard general con stats | ✅ Funcional | KPIs, actividad reciente |
| `/campaigns` | CRUD de campañas publicitarias | ✅ Funcional | Crear, listar, eliminar, distribuir |
| `/campaigns/new` | Formulario de nueva campaña | ✅ Funcional | Fechas, anunciante, impressions |
| `/campaigns/[id]` | Detalle de campaña + upload video | ✅ Funcional | Subida a Supabase Storage |
| `/fleet` | Monitor de dispositivos/tablets | ✅ Funcional | Filtros, Broadcast Sync, perfil de nodo |
| `/drivers` | Gestión de choferes y suscripciones | ✅ Premium v4.5 | Data real de DB (13 choferes) + Animaciones |
| `/advertisers` | Base de datos de marcas/clientes | ✅ Funcional | Data real de DB (10 anunciantes) |
| `/finance` | Ingresos, nómina, exportaciones CSV | ✅ Funcional | Liquidación automática RD$500/anuncio |
| `/analytics` | Inteligencia: top taxis, plays/hora | ✅ Funcional | Propagaciones recientes (live feed) |
| `/media` | Galería de archivos subidos | ✅ Operativo | Previsualización vinculada a Supabase Storage |
| `/devices` | Inventario técnico de hardware (STI/SDQ) | ✅ Funcional | CRUD Manual Completo |

---

## 🔌 3. MÓDULOS BACKEND (NestJS)

| Módulo | Controller | Endpoints Principales | Estado |
| --- | --- | --- | --- |
| `AuthModule` | `auth.controller.ts` | `POST /api/auth/login`, `GET /api/auth/profile` | ✅ Funcional |
| `CampaignModule` | `campaign.controller.ts` | CRUD + `/upload` + `/assign` + `/drivers` + `DELETE` | ✅ Funcional |
| `FleetModule` | `fleet.controller.ts` | `/devices`, `/stats`, `/map`, `/finance`, `/:id/command`, `/register` | ✅ Funcional |
| `DriversModule` | `drivers.controller.ts` | `GET /`, `POST /`, `PUT /:id/subscription`, `/check-access` | ✅ Funcional |
| `AdvertisersModule` | `advertisers.controller.ts` | `GET /`, `POST /` | ✅ Funcional |
| `MediaModule` | `media.controller.ts` | `GET /`, `POST /upload`, `GET /:id/status` | ✅ Funcional |
| `FinanceModule` | `finance.controller.ts` | `/payroll`, `/payroll/pay`, `/report/*`, `/export/*`, `/invoice/:id` | ✅ Funcional |
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

- **Choferes**: 13 registrados.
- **Anunciantes**: 10 registrados.
- **Dispositivos**: 100 tablets para Santiago (STI) sincronizadas.
- **Sincronización**: driver.deviceId → device.deviceId.

### Modelos Prisma Principales

`User`, `Device`, `Campaign`, `Driver`, `Advertiser`, `Subscription`, `Media`, `MediaAsset`, `Video`, `PlaybackEvent`, `DeviceCommand`, `DeviceHeartbeat`, `AnalyticsEvent`, `CampaignMetric`, `DeviceCampaign`, `PlaylistItem`, `Playlist`, `Fleet`.

---

## ⚠️ 6. RIESGOS IDENTIFICADOS

| 🔴 10 | **Error 401 en Finanzas** | ALTA | Auth | ✅ **DIAGNOSTICADO**: `SUPABASE_SERVICE_ROLE_KEY` mal configurada con Management Key. Requiere reemplazo por Service Role JWT. |
| 🟡 11 | **Videos grandes > 50MB (Vercel limit)** | Media | ✅ Mitigado con Supabase Storage Direct Upload |
| 🟡 12 | **Muerte de tablet por batería** | Media | ✅ Mitigado con Telemetry Tracking |
| 🔴 13 | **Leak de conexiones Prisma** | Alta | ✅ Mitigado (onModuleDestroy + `$disconnect()` + logging condicional) |
| 🟡 14 | **Sin HTTPS local para PWA/Service Worker** | Media | No aplica en dev; usar `ngrok` para staging |
| 🟢 15 | **BigInt serialization en Prisma** | Resuelto | `toJSON()` override en `main.ts` y `api/index.ts` |
| 🔴 16 | **JWT validación vía red (latencia +200ms)** | Alta | ✅ Resuelto — `SupabaseStrategy` valida localmente con `SUPABASE_JWT_SECRET` |
| 🔴 17 | **Tablets morosas (Falta de pago RD$6k)** | Alta | ✅ Resuelto — `SubscriptionGuard` bloquea `/sync` si no hay pago activo |
| 🟡 18 | **Pago a Conductor (Auditabilidad)** | Media | ✅ Automatizado. Lógica de `PayrollPayment` con restricción de unicidad mensual implementada. RD$500/anuncio activo detectado por dispositivo. |
| 🔴 19 | **Tablet offline (Sin SIM Card)** | Crítica | ✅ Resuelto — Arquitectura "Sync Window" (Hotspot + Service Worker + Cache API) |
| 🟡 20 | **Espacio en Disco (Cache Storage)** | Media | Mitigación: Política de purga en SW por fecha/campaña finalizada. |
| 🔴 21 | **Errores de Tipado en Producción** | Crítica | ✅ Resuelto — Validación estricta en Typescript para `supabaseClient` y eliminación de tipos `any`. |
| 🟢 22 | **Conflictos de Puertos Locales** | Bajo | ✅ Resuelto — Matado forzoso de procesos huérfanos de Node en el puerto 3000/3001. |
| 🟣 23 | **Elementos Desproporcionados (UI)** | MEDIA | UX | ✅ **RESUELTO**: Auditoría v4.5 aplicada. Estandarización de fuentes `text-4xl` y corrección de `animation-delay`. |

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

### Sprint 2: SISTEMAS DE CALLE E INVENTARIO 🔄 EN PROGRESO

- [x] Gestión de Choferes (CRUD Directo con Validaciones)
- [x] Inventario de Pantallas STI (100 registros pre-generados)
- [x] CRUD Manual de Hardware (Devices CRUD)
- [x] Liquidación de Nómina RD$500/Anuncio (Automatizada)
- [x] Generador de Facturas Premium (HTML Print-Ready)
- [x] Telemetría GPS y Batería en tiempo real
- [x] Filtro de Geo-fencing (Ciudad/Global) en Tablets
- [x] Analytics Batch Upload Fix (Robust Object Handling)
- [x] Subscription Grace Period (Development Ease)
- [x] Bloqueo automático de tablets por falta de pago (SubscriptionGuard)
- [x] Tracking de QR Scans con Redirect Proxy (atribución directa)
- [x] Estructura GPS para Geo-fencing (Lat/Lng en PlaybackEvents)
- [x] Lógica de Geo-fencing (Filtrado por ciudad)
- [x] Monitoreo de salud de hardware (Batería/GPS en tiempo real)
- [x] Tracking de ubicación vía celular del chofer (Estrategia Mobile Gateway)
- [x] Sincronización de telemetría externa hacia Device ID
- [x] Tracking de ubicación vía QR (Celular como puente).
- [x] Arquitectura de sincronización de contenido (Hotspot + Service Worker).
- [x] Implementación de IndexedDB en tablet para almacenamiento de logs offline.
- [x] Motor de Ingestión de GPS (Batching 10+1).
- [x] Implementación de Pantalla de Bloqueo (Remote Kill-switch).
- [x] Optimización de Monitoreo (Apertura instantánea de perfiles + Terminología agnóstica "Unidades").
- [x] Estabilización de Entorno Local (Bypass Firewall vía localhost).
- [x] **Auditoría UI/UX Premium v4.5** (Estandarización de fuentes, animaciones y layout).
- [x] Solución de Bug Crítico en contenedores de Flota (Layout Grid Fix).
- [x] Diagnóstico de Auth 401 en API de Finanzas.
- [x] Crear alerta en Dashboard: "Sync Integridad" (Broadcast Realtime).
- [x] Integración de Validación de Suscripción en GPS Gateway.
- [x] Implementación de Layout Responsive nativo (Mobile/Tablet Support).
- [x] Validación de codecs (MP4 Only Logic).

### Sprint 3: PILOTO DE CALLE (FUTURO)

- [ ] Onboarding de tablets en campo
- [x] Dashboard analytics en tiempo real (Dashboard Overview v4.5)
- [ ] Alertas SMS/WhatsApp para choferes
- [ ] Integración con pasarela de pago
- [x] Módulo de Nómina Automática (RD$500/anuncio por taxi)
- [x] Mapa de Calor de Reproducciones (Integrado en Analytics)

---

## 📁 8. ESTRUCTURA DE ARCHIVOS CLAVE

```text
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

---

## 📍 ESTADO DEL SISTEMA DE TRACKING

- **Estrategia:** Mobile Gateway (Celular -> Servidor).
- **Vínculo:** QR dinámico con DeviceID (Generado localmente via `qrcode.js`).
- **Estado:** ✅ Implementado (Backend + Tablet QR).
- **Validación de Negocio:** Bloqueo por falta de pago de RD$6,000 integrado en el flujo de GPS (HTTP 402).

---

## [ACTUALIZACIÓN 11-MAR-2026] - SISTEMA DE TRACKING HÍBRIDO

### ✅ Logros

1. **Controlador de Flota:** Implementado en NestJS con validación de pago (402 Payment Required).
2. **Lógica de Batching:** El celular ahora agrupa 10 puntos de GPS antes de enviar a Vercel (Optimización de costos).
3. **QR de Vinculación:** Generación local en tablet (Agnóstico a internet).
4. **Relación de Datos:** Tabla `driver_locations` creada con índices compuestos para auditoría de rutas.

### ⚠️ Próximo Paso Crítico

- Implementar la **Pantalla de Bloqueo** en la Tablet. Si el API devuelve 402 al celular, el celular debe notificar a la tablet para que deje de mostrar anuncios.
- **Métrica de Pago:** Asegurar que el cálculo de RD$500/mes se base solo en días con tracking GPS activo y anuncios reproducidos.

---

## [ACTUALIZACIÓN 11-MAR-2026] - FIX DE DESPLIEGUE SERVERLESS

- **Incidencia:** Fallo de compilación en Vercel (Errores TS2307, TS1241, TS1206) por falta de soporte de decoradores en el compilador de `@vercel/node` en la raíz del monorepo.
- **Solución Implementada:**
  - Generación de un `tsconfig.json` maestro en la raíz con `experimentalDecorators: true` y `emitDecoratorMetadata: true`.
  - Instalación de dependencias core de NestJS (`@nestjs/core`, `@nestjs/common`, etc.) a nivel raíz para satisfacer las importaciones del Serverless Function (`api/index.ts`).
- **Estado Técnico:** Despliegue CI/CD Vercel estabilizado y adaptado al patrón Monorepo.

---

## [ACTUALIZACIÓN 11-MAR-2026] - CORRECCIÓN DE BUILD FRONTEND (TAILWIND 4)

- **Incidencia:** Fallo en el despliegue del Dashboard (`Error: Cannot find module '@tailwindcss/postcss'`).
- **Causa:** El motor Turbopack de Next.js 16 requiere el puente de PostCSS para procesar `globals.css` bajo el estándar de Tailwind 4, pero la dependencia no estaba declarada en el workspace.
- **Solución Implementada:**
  - Instalación de `@tailwindcss/postcss` en el workspace `admin-dashboard`.
  - Creación del archivo `postcss.config.js` vinculando el plugin.
- **Estado Técnico:** Pipeline de CI/CD para el Dashboard en fase de re-validación.

---

## [ACTUALIZACIÓN 11-MAR-2026 22:15] - FINALIZACIÓN DE PIPELINE

- **Estado Dashboard**: ✅ COMPILADO.
- **Estado Backend**: ✅ PRISMA GENERADO.
- **Error Detectado**: `routes-manifest.json` missing (Path mismatch).
- **Acción**: Implementación de "Output Lifting" para que Vercel reconozca los artefactos del Dashboard desde la raíz.

---

## [ACTUALIZACIÓN 11-MAR-2026 22:25] - MONOREPO PATH FIX

- **Problema**: Desfase de rutas en build (Next.js vs Vercel Root).
- **Solución**: Implementado `distDir: '../.next'` en la config del dashboard.
- **Riesgo**: Next.js 16 detectado; se ha forzado el fallback a la versión estable 15.1.7 para asegurar compatibilidad en Serverless Functions.

---

## [ACTUALIZACIÓN 11-MAR-2026 22:35] - EMERGENCY ROLLBACK NEXT16

- **Incidencia**: Error de resolución de módulos internos en Next.js 16.1.6 durante SSG (`Cannot find module 'next/dist/shared/lib/no-fallback-error.external.js'`).
- **Acción**:
  1. Downgrade forzado a Next.js 15.1.7 (Stable).
  2. Revertido `distDir: '../.next'` — causaba rotura de resolución de módulos fuera del workspace.
  3. Cambio de estrategia a `postbuild copy` (`cp -r`) — mantiene la copia local para SSG y copia a la raíz para Vercel.
- **Estado**: El Dashboard ahora mantiene sus dependencias locales durante la generación de páginas.

---

## [ACTUALIZACIÓN 12-MAR-2026 01:22] - MOBILE GATEWAY (OFFLINE BATCHING)

- **Módulo**: Mobile Gateway (Frontend Chofer).
- **Estado Técnico**: ✅ IMPLEMENTADO.
- **Archivos creados/modificados**:
  - `admin-dashboard/lib/mobile-gateway.ts` (**NUEVO**): Módulo TypeScript con lógica completa de GPS tracking, batching 10:1, persistencia offline en localStorage, rollback en fallo de red, y kill-switch por HTTP 402.
  - `admin-dashboard/pages/check-in.tsx` (**REESCRITO**): PWA premium del chofer con dashboard de estado en tiempo real (buffer, puntos sincronizados, última sync), pantalla de suspensión por impago, e indicador de conectividad.
  - `backend/src/modules/fleet/fleet.controller.ts`: Endpoint `track-batch` marcado como `@Public()` y `driverId` ahora es opcional.
  - `backend/src/modules/fleet/fleet.service.ts`: `trackBatch()` ahora resuelve automáticamente el `driverId` desde la DB usando el `deviceId`.
- **Métricas de Optimización**: Reducción de llamadas al backend de 60 req/min a 1 req/min por taxi mediante algoritmo de Batching (10:1) y retención en `localStorage`.
  - Sin batching: 100 taxis × 60 req/min × 480 min = **2,880,000 req/día**.
  - Con batching: 100 taxis × 1 req/min × 480 min = **48,000 req/día**.
  - **Ahorro: 98.3% de requests eliminados.**
- **Resiliencia Offline**: Si el taxi entra a un túnel o zona sin señal, `navigator.onLine` frena el fetch; el array sigue creciendo en `localStorage` y se despacha completo al recuperar conexión. Si el POST falla a mitad de ejecución, los datos se restauran al inicio del array (rollback).
- **Integración de Negocio**: Kill Switch integrado — destruye el sensor GPS y muestra pantalla de cobro si el backend responde HTTP 402 (Impago de suscripción anual RD$6,000).

| Fecha | Incidencia | Resolución | Estado |
| --- | --- | --- | --- |
| 12/Mar/2026 | Riesgo de cuota excedida en Vercel Serverless por tracking GPS | Implementación de `mobile-gateway.ts` con Batching 10:1 y fallback de 60 seg | ✅ Resuelto / Optimizado |
| 12/Mar/2026 | `track-batch` requería `driverId` explícito del frontend | Backend resuelve `driverId` automáticamente desde `Device → Driver` | ✅ Resuelto |
| 12/Mar/2026 | Endpoint `track-batch` bloqueado por JWT Guard | Decorador `@Public()` aplicado para acceso sin autenticación | ✅ Resuelto |

---

### [ACTUALIZACIÓN 12-MAR-2026] - FIX DE COMUNICACIÓN GATEWAY-API & DASHBOARD GPS

- **Error Detectado**: `CORS Policy Blocked` por el header personalizado `x-device-id`.
- **Acción Backend**: ✅ Se actualizó `main.ts` en NestJS para permitir explícitamente el header `x-device-id` y se formateó la whitelist de headers para mayor estabilidad.
- **Riesgo Crítico**: Se detectó uso de Next.js 16.1.6 (Inestable). Se forzó el **downgrade a v15.1.7** en todo el monorepo para evitar fallos de HMR y errores de compilación de Turbopack.
- **Nueva Funcionalidad**: ✅ **Dashboard de Rastreo GPS Admin** (`/tracking`).
  - **Vista de Resumen**: Lista de choferes con estado "En Ruta" (basado en actividad < 5 min), puntos GPS hoy, velocidad promedio y link directo a Google Maps.
  - **Vista de Log**: Historial detallado de las últimas 500 coordenadas recibidas con vinculación Driver <-> Device.
  - **Auto-Refresh**: La interfaz se sincroniza cada 30 segundos con el backend.
- **Estado Técnico**: El flujo de tracking ahora permite peticiones cross-origin entre el puerto 3001 y 3000 de forma indestructible.

| Fecha | Incidencia | Resolución | Estado |
| --- | --- | --- | --- |
| 12/Mar/2026 | TypeError: Failed to fetch (CORS) | Whitelist de headers en NestJS | ✅ Resuelto |
| 12/Mar/2026 | HMR Crash (Next.js 16) | Downgrade forzado a v15.1.7 | ✅ Resuelto |
| 12/Mar/2026 | Visibilidad de Datos GPS Admin | Creación de pestaña `/tracking` con API dedicada | ✅ Implementado |

### [ACTUALIZACIÓN 12-MAR-2026 17:00] - FINALIZACIÓN DE SESIÓN (GREEN STATUS)

- **Local Dev Environment**: ✅ ESTABILIZADO.
- **Fix Mobile Gateway**:
  - Aumentado timeout a **30s** para redes lentas.
  - Implementado manejo de `AbortError` para evitar logs falsos al refrescar la página.
- **Seed de Pruebas**: Creado `backend/seed-dev.js` para popular la base de datos local instantáneamente.
- **Estado de Datos**: Ahora el dispositivo `TADSTI-001` tiene un chofer real, suscripción activa y 50 ubicaciones de ejemplo.

---

## 🚀 GUÍA DE TRASPASO: CONTINUIDAD DE DESARROLLO

Este proyecto es una plataforma DOOH (Digital Out-Of-Home) monorepo. Estamos en fase de **MVP Funcional** en entorno local para evitar agotar cuotas de Vercel (especialmente por el tracking GPS).

### 📍 Dónde Estamos (Resumen Técnico)

- **Backend (NestJS)**: 100% funcional. Endpoints de tracking batching y dashboard listos.
- **Mobile Gateway (Chofer)**: PWA robusta en `/check-in`. Usa batching 10:1 (ahorra 98% de ancho de banda).
- **Dashboard Admin**: Nueva pestaña `/tracking` para ver la flota en tiempo real con integración de Google Maps.
- **Estabilidad**: Downgrade exitoso de Next.js 16 (Canary) a **15.1.7** para garantizar fiabilidad en calle.
- **Fixes Críticos**:
  - CORS habilitado para headers custom (`x-device-id`).
  - Sincronización de versiones de React (v19.0.0) en todo el monorepo para evitar "Invalid Hook Call".

### 🛠️ Cómo Iniciar el Proyecto (Local)

Para levantar todo el ecosistema en paralelo:

- **Backend**: `npm run dev:backend` (Puerto 3000).
- **Admin/Chofer**: `npm run dev:admin` (Puerto 3001).
- **Preparar Data**: `cd backend && node seed-dev.js` (Si deseas resetear el taxi de prueba).

### 📝 Tareas Pendientes para el Siguiente Agente

- [ ] **Auditoría de Pagos**: Vincular las coordenadas GPS acumuladas con el cálculo de los RD$500/mes por chofer.
- [ ] **Alertas de Offline**: Implementar notificaciones en el dashboard cuando un dispositivo pase más de 12 horas sin sincronizar (Sync Window).
- [ ] **Reportes de Anuncios**: Generar el PDF consolidado para anunciantes basado en los logs sincronizados desde la tablet.
- [ ] **Optimización Vercel**: Evaluar subir el batching a 30:1 si se decide volver a producción pronto.

### 🔑 Credenciales (Entorno de Desarrollo)

- **Admin**: `admin@tad.do` / `TadAdmin2026!`
- **DB (Supabase)**: Conectado vía pool directo.
- **GPS Device Test**: [http://localhost:3001/check-in?deviceId=TADSTI-001](http://localhost:3001/check-in?deviceId=TADSTI-001)

---

*Nota: El sistema está configurado para desarrollo local fluido. No intentes desplegar a Vercel sin monitorear primero los límites de requests gratuitos.*

## ACTUALIZACIÓN DE ESTADO E INFRAESTRUCTURA (12-MAR-2026)

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
