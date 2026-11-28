# tad-api — Backend Core (v10.0.0)

> **Clasificación SRE:** Tier-0 (Crítico)
> **Última auditoría:** 2026-04-13
> **Mantenedor:** Equipo TAD Dominicana

---

## Resumen Ejecutivo

`tad-api` es el **núcleo transaccional** de la plataforma TAD DOOH. Opera como el backend monolítico (NestJS) que orquesta la totalidad del flujo de datos entre las tablets offline-first instaladas en los taxis, los portales de conductores/anunciantes, y el panel de administración.

### Rol en el flujo de TAD

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  tad-admin   │     │tad-advertiser│     │  tad-driver   │
│  (Portal     │     │  (Portal     │     │  (PWA 4G     │
│   Admin)     │     │  Anunciante) │     │   Gateway)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │    HTTPS / JWT     │    HTTPS / JWT     │  HTTPS / JWT
       │                    │                    │  (GPS Batch)
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │    tad-api     │  ◄── ESTE SERVICIO
                    │  (NestJS 10)  │
                    │  Puerto: 3000 │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
     ┌────────▼──┐  ┌───────▼──┐  ┌───────▼──────┐
     │ PostgreSQL│  │ Supabase │  │ Supabase     │
     │  (Pooler  │  │   Auth   │  │  Storage     │
     │  :6543)   │  │          │  │ (Signed URLs)│
     └───────────┘  └──────────┘  └──────────────┘
```

**Responsabilidades principales:**

| Dominio | Descripción |
|---------|-------------|
| **Sincronización** | Genera el `DeviceManifest` (playlist + licencia offline) para cada tablet vía Materialized View |
| **Telemetría** | Recibe y persiste batches de GPS cada 5 min desde el celular del conductor (Mobile Gateway) |
| **Finanzas** | Calcula nómina por transacción (`RD$500/anuncio transmitido`), detecta morosidad, genera facturas |
| **Campañas** | CRUD de campañas, segmentación por ciudad/flota/conductor, priorización |
| **Media** | Genera Signed URLs para subida directa a Supabase Storage. **NUNCA recibe archivos de video** |
| **Monitoreo** | CRON cada 30 min para detección de dispositivos offline y alertas WhatsApp |
| **BI / Métricas** | Snapshots diarios de MRR, Yield per Screen, ARPU, Churn Rate |

---

## Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Runtime** | Node.js | 20-alpine | Imagen base Docker (Zero-Waste) |
| **Framework** | NestJS | ^10.3.0 | Inyección de dependencias, guards, pipes, CRON |
| **ORM** | Prisma Client | ^5.22.0 | Acceso tipado a PostgreSQL |
| **Base de Datos** | PostgreSQL (Supabase) | — | Pooler puerto 6543 |
| **Autenticación** | Supabase Auth + Passport JWT | ^2.99.0 / ^4.0.1 | JWT dual (local + network verification) |
| **Storage** | Supabase Storage | — | Signed Upload URLs (media bypass) |
| **Scheduler** | @nestjs/schedule | ^6.1.1 | CRONs de monitoreo y morosidad |
| **Observabilidad** | Winston + Sentry + Logtail | — | Logging estructurado + error tracking |
| **Compilador** | SWC | ^1.3.100 | Build rápido (reemplaza tsc en build) |
| **Validación** | class-validator + Zod | — | DTOs (pipes) + Config validation |
| **PDF** | pdfmake | ^0.3.7 | Generación de facturas de morosidad |
| **Notificaciones** | Nodemailer + WhatsApp Service | — | Alertas operativas |
| **Documentación** | Swagger (solo dev) | ^7.1.17 | Auto-generado en `/docs` |

### Dependencias críticas en runtime

```
@prisma/client    → Conexión pooled a Supabase PostgreSQL
@supabase/supabase-js → Storage (Signed URLs) + Auth verification
@nestjs/schedule  → CRONs (morosidad, offline check, BI snapshots)
@sentry/nestjs    → Error tracking en producción
winston           → Logging estructurado (JSON en prod)
```

---

## Variables de Entorno y Conexiones

### Variables Obligatorias (Producción)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Activa logging mínimo, desactiva Swagger |
| `PORT` | `3000` | Puerto interno del contenedor |
| `DATABASE_URL` | `postgresql://...pooler...supabase.com:6543/postgres?connection_limit=5` | **DEBE usar pooler (:6543) con `connection_limit=5`** |
| `DIRECT_URL` | `postgresql://...supabase.com:5432/postgres` | Conexión directa para migraciones Prisma |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Base URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Service Role Key (JWT format) para Storage admin |
| `SUPABASE_JWT_SECRET` | `your-jwt-secret` | Para verificación local de tokens JWT |
| `JWT_SECRET` | `min-32-chars-string` | Secret para License Tokens del Sync manifest |

### Variables Opcionales

| Variable | Default | Descripción |
|----------|---------|-------------|
| `CORS_ORIGIN` | `*` | Orígenes permitidos (CSV). Auto-acepta `*.easypanel.host` |
| `CDN_URL_PREFIX` | `SUPABASE_URL` | Prefijo para URLs públicas de media assets |
| `SENTRY_DSN` | — | DSN de Sentry para error tracking |
| `ADMIN_WHATSAPP_PHONE` | `18098001234` | Teléfono para alertas WhatsApp del piloto |
| `REDIS_URL` | `redis://localhost:6379` | Cache / Queue (Bull) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | — | Configuración de email saliente |
| `LOG_LEVEL` | `debug` (dev) / `error` (prod) | Nivel de logging Winston |
| `NODE_OPTIONS` | `--max-old-space-size=850` | Límite de heap para el contenedor Docker |

### Puertos y Endpoints Internos

| Recurso | URL / Puerto | Notas |
|---------|-------------|-------|
| API REST | `:3000/api/v1/*` | Prefijo global `api/v1` |
| Health Check | `:3000/health` | Sin auth, sin prefijo. Retorna `{ status, uptime, memory }` |
| Swagger (solo dev) | `:3000/docs` | Desactivado en `NODE_ENV=production` |
| Supabase Pooler | `:6543` | Connection pooling (PgBouncer) |

---

## Arquitectura de Módulos

```
src/
├── main.ts                  # Bootstrap: CORS, ValidationPipe, Health, Swagger
├── app.module.ts            # Registro global de módulos + SupabaseAuthGuard + RolesGuard
├── common/
│   ├── constants/
│   │   └── business-rules.ts   # ⚠️ FUENTE DE VERDAD para tarifas y umbrales
│   ├── filters/
│   │   └── prisma-exception.filter.ts
│   └── interceptors/
│       └── sentry.interceptor.ts
├── middleware/
│   └── logger.middleware.ts     # Request logging en todas las rutas
├── modules/
│   ├── auth/                # Supabase JWT guard (global) + RBAC RolesGuard
│   ├── prisma/              # PrismaClient singleton con retry y pool validation
│   ├── supabase/            # Cliente Supabase (Storage admin)
│   ├── sync/                # DeviceManifest + Materialized Views (mv_active_campaigns)
│   ├── monitoring/          # GPS batch + CRONs offline/connectivity
│   ├── campaign/            # CRUD campañas + segmentación multi-canal
│   ├── media/               # Signed URL generator + metadata registry (NO file upload)
│   ├── device/              # Gestión de dispositivos (tablets)
│   ├── drivers/             # CRUD conductores + onboarding + level system
│   ├── advertisers/         # CRUD anunciantes + portal requests
│   ├── finance/             # Nómina por transacción + morosidad + facturación
│   ├── fleet/               # Tracking summary + distribución geográfica
│   ├── analytics/           # Eventos de playback + métricas de campaña
│   ├── notifications/       # Push, Email, WhatsApp service
│   ├── bi/                  # BI Dashboard snapshots + métricas de inversión
│   ├── sheets/              # Integración Google Sheets
│   ├── portal-requests/     # Solicitudes de portal (driver/advertiser)
│   └── assets/              # Gestión de media assets legacy
└── utils/
    ├── winston.logger.ts    # Configuración Winston (JSON prod / colored dev)
    ├── sentry.ts            # Inicialización Sentry
    └── throttler.util.ts    # throttledMap() — procesamiento controlado de arrays
```

---

## Reglas de Negocio / Guardrails

> **⚠️ Las siguientes son Directivas Cero. Violarlas constituye un incidente P0.**

### 1. Finanzas y Nómina — Modelo Transaccional Puro

```typescript
// Fuente: src/common/constants/business-rules.ts
DRIVER_RATE_PER_CAMPAIGN_RD: 500   // RD$500 por anuncio TRANSMITIDO
DRIVER_REFERRAL_BONUS_RD: 500      // RD$500 por conductor referido activo
ADVERTISER_REFERRAL_BONUS_RD: 500  // RD$500 por anunciante referido
STARTER_KIT_ANNUAL_FEE_RD: 6000   // Costo reemplazo/anualidad equipo
```

| Regla | Enforcement |
|-------|------------|
| **NO existe pago por desempeño general ni por tiempo de conexión** | `FinanceService.calculateMonthlyPayroll()` calcula basado en `playedCampaigns.size * PAY_PER_AD` |
| **Solo se paga por anuncios con Proof-of-Play (PoP)** | Se cruzan `PlaybackEvent` (eventType: `play_confirm`) con `Media → Campaign` |
| **Suscripción impaga = RD$0 en nómina** | `isSubPaid` debe ser `true` para que `activeAdsCount > 0` |
| **Factura de morosidad = exactamente RD$6,000** | `STARTER_KIT_ANNUAL_FEE_RD` es la constante única |
| **Idempotencia de nómina** | `triggerMonthlyBilling()` verifica `findFirst({ month, year })` antes de generar |

### 2. Infraestructura EasyPanel — Límites de Memoria

```dockerfile
# Dockerfile.api — Línea 39
ENV NODE_OPTIONS="--max-old-space-size=850"
```

| Regla | Enforcement |
|-------|------------|
| **Límite estricto de 512MB RAM en EasyPanel** | `NODE_OPTIONS` restringe el heap de V8. El contenedor tiene overhead adicional en alpine |
| **Prisma max 5 conexiones** | `DATABASE_URL` DEBE incluir `?connection_limit=5`. `PrismaService` emite warning si falta |
| **ThrottlerModule DESACTIVADO** | Comentado en `app.module.ts` — causa memory leaks en free tier |
| **Processing controlado** | Toda iteración masiva usa `throttledMap(items, fn, concurrency)` |
| **Logging mínimo en producción** | Prisma: `['error']` solo. Winston configurable via `LOG_LEVEL` |

### 3. Gestión Multimedia — Anti-OOM (Out of Memory)

| Regla | Enforcement |
|-------|------------|
| **PROHIBIDO recibir archivos .mp4 en el backend** | `MediaService.generateUploadUrl()` genera Signed URLs; el cliente sube directo a Supabase Storage |
| **File size limit: 55MB** | `MAX_VIDEO_SIZE_BYTES: 57671680` — validado en `uploadFile()`, `registerBypassedMedia()`, y `registerFileMock()` |
| **Flujo correcto** | Cliente → `POST /media/upload-url` → Signed URL → `PUT` directo a Supabase → `POST /media/register` (solo metadata) |
| **Multer presente pero limitado** | Solo para imágenes pequeñas (thumbnails). Video = Signed URL siempre |

### 4. Kill-Switch (402 Payment Required)

```
Tablet (FullyKiosk, offline) ←→ Celular (4G Gateway) ←→ tad-api
                                        ↑
                                   El 402 llega AQUÍ
                                   El celular corta la comunicación
                                   La tablet NO recibe el 402
```

| Regla | Enforcement |
|-------|------------|
| **Las tablets operan 100% offline** | No tienen conexión directa al API |
| **El celular (Gateway) recibe el 402** | `SyncService.getDeviceManifest()` valida suscripción y retorna playlist vacía si no hay pago |
| **Ghost Kill-Switch** | Sin suscripción: solo recibe campañas `isGlobal: true` (demo/promo interna) |
| **License Token de 24h** | JWT `OFFLINE_LICENSE` con TTL de 24 horas firma el manifest |
| **Protocolo de morosidad automático** | CRON diario (3AM) en `FinanceService.checkHighDelinquency()` detecta suscripciones vencidas |

### 5. Seguridad y Autenticación

| Regla | Enforcement |
|-------|------------|
| **Guard global `SupabaseAuthGuard`** | Registrado como `APP_GUARD` — protege TODAS las rutas por defecto |
| **`@Public()` decorator** | Rutas de tablet/sync deben decorarse con `@Public()` para bypass |
| **RBAC con `RolesGuard`** | Segundo APP_GUARD — evalúa roles después de JWT |
| **Validación estricta de payloads** | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` rechaza campos extra |

---

## Despliegue

### Docker Build (Multi-Stage Zero-Waste)

```
Phase 1 (builder):  npm ci → prisma generate → nest build
Phase 2 (deps):     npm ci --omit=dev (solo producción)
Phase 3 (runner):   Copia dist/ + prisma/ + node_modules prod → EXPOSE 3000
```

### Comandos de operación

```bash
# Desarrollo local
npm run start:dev          # NestJS watch mode (hot reload)

# Producción (la imagen oficial usa docker-entrypoint.sh)
npm run start:prod         # Ejecuta dist/main.js; no migra

# Solo con aprobación operativa, backup y revisión del destino Supabase:
TAD_APPROVE_MANUAL_MIGRATION=YES npm run deploy:migrate  # Validación de destino + migraciones versionadas
TAD_APPROVE_MANUAL_MIGRATION=YES npm run start:migrate   # Igual + inicio (NO db push)
# Nunca ejecutar sobre un esquema distinto por suposición.

# Build
npm run build              # nest build

# Prisma
npm run prisma:generate    # Generar Prisma Client
npm run prisma:studio      # UI visual de la BD
```

### Health Check

```bash
curl http://localhost:3000/health
# → status: "up" (liveness, no verifica DB)
curl -i http://localhost:3000/health/ready
# → HTTP 200 si DB y vista master-sync están listas; HTTP 503 si no.
```

---

## CRONs Activos

| CRON | Frecuencia | Módulo | Acción |
|------|-----------|--------|--------|
| `checkOfflineDevices` | Cada 30 min | MonitoringService | Marca offline (15min), connectivity_issue (48h), push (12h), WhatsApp (piloto) |
| `checkHighDelinquency` | Diario 3AM | FinanceService | Escanea suscripciones vencidas → Protocolo morosidad + factura PDF + WhatsApp |

Ambos CRONs ejecutan un **recovery check** en `onModuleInit()` al arrancar para compensar períodos donde el contenedor estuvo apagado.

---

## Vistas Materializadas SQL

| Vista | Propósito | Refresh |
|-------|----------|---------|
| `mv_active_campaigns` | Pre-calcula segmentación de campañas (targeting por ciudad, flota, conductor, device) | `REFRESH MATERIALIZED VIEW CONCURRENTLY` en `PrismaService.refreshActiveCampaignsView()` |

Se carga automáticamente desde `prisma/views.sql` al iniciar el módulo Prisma.
