# 🔍 INFORME INTEGRAL DE FALLAS Y ERRORES — TAD DOOH PLATFORM

> **Propósito**: Documentar todos los fallos, vulnerabilidades, riesgos SRE y desviaciones de las reglas de negocio detectados en una auditoría whitebox exhaustiva, para su remediación en orden de prioridad.
> **Fecha**: 2026-08-30
> **Metodología**: Pipeline `agent-autonomous-verification` + skills `tad-mcp-continuous-audit`, `tad-security-auditor`, `tad-qa-engineer`, `tad-database-dba`, `tad-devops-sysadmin`. Auditoría de 5 dominios en paralelo + verificación de compilación real (`tsc --noEmit`).
> **Alcance**: Monorepo completo — `apps/api`, `apps/admin`, `apps/advertiser`, `apps/driver`, `apps/player`, `apps/driver-android`, `apps/driver-flutter`, `apps/tad-remotion`, `apps/tad-simulator`, `packages/*`, Dockerfiles, scripts, CI.
> **Estado**: AUDITORÍA COMPLETA. Ningún archivo modificado.

---

## 1. RESUMEN EJECUTIVO

### 1.1 Conteo por severidad

| Dominio | CRITICA | ALTA | MEDIA | BAJA | TOTAL |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Backend API + DB (`apps/api`) | 5 | 16 | 26 | 10 | 57 |
| Frontends PWA (admin/advertiser/driver) | 3 | 8 | 8 | 4 | 23 |
| Player / Video / Nativos | 5 | 12 | 9 | 4 | 30 |
| Infraestructura / DevOps | 3 | 8 | 8 | 3 | 22 |
| Paquetes compartidos `packages/*` | 8 | 20 | 11 | 6 | 45 |
| **TOTAL (con duplicados inter-dominio)** | **24** | **64** | **62** | **27** | **177** |

> Los hallazgos duplicados entre dominios (p. ej. `sync.service.ts:26` JWT fallback, anon keys en Dockerfiles, defaults del simulator) se consolidaron en una sola entrada; los conteos brutos por tabla son por dominio auditado.

### 1.2 Verificación de compilación (gate `tsc --noEmit`)

| Workspace | Resultado |
| :--- | :--- |
| `apps/api` | ✅ 0 errores |
| `apps/driver` | ✅ 0 errores |
| `apps/admin` | ✅ 0 errores |
| `apps/advertiser` | ✅ 0 errores |
| `apps/tad-simulator` | ❌ TS corrupto (no compila; en runtime usa `index.js`) |
| `apps/driver-flutter` / `apps/driver-android` | ⚠️ No verificado (toolchain nativo no disponible) |

### 1.3 Top 10 peligros inmediatos (remediar PRIMERO)

1. **Credenciales de producción commiteadas en git**: `apps/api/prisma-cloud-test.js` y `apps/api/test_db.py` contienen la contraseña real de la BD Supabase (`REDACTED`) y están trackeados → **rotar credenciales YA** + purgar historial.
2. **JWT secret con fallback hardcodeado** (`sync.service.ts:26`, `app.module.ts:54`, `jwt.strategy.ts:25`, `supabase.strategy.ts:38`, `auth.module.ts:21`, `device-token.guard.ts:19`, `device.service.ts:19`) → cualquiera puede forjar OFFLINE_LICENSE, device tokens y sesiones.
3. **Bypass total del Kill-Switch (R3) en la app Flutter de conductores**: `hub_data.dart:95-107` fuerza `subscriptionPaid=true`; `providers.dart:35` suprime el 402; `login_screen_v2.dart:125,165-174` permite entrar como 'dev-driver' con botón BYPASS.
4. **RBAC miserable en el backend**: `device-admin.controller.ts`, `monitoring/fleet-status`, `monitoring/gps-batch`, `media`, `notifications`, `sheets/report`, `telemetry/playback-batch` — endpoints públicos o sin `@Roles` permiten control de flota, leer PII y falsificar playbacks `verified:true` (R8/R9).
5. **Auto-deploy por webhook EasyPanel en push a `main`** viola la política de deploys manuales.
6. **`.dockerignore` raíz NO excluye `.env`** (`COPY . .` en Dockerfile.api) → secrets horneados en la imagen.
7. **OOM en contenedores de 512MB**: `calculateMonthlyPayroll` y `generateReconciliationReport` cargan colecciones enteras en RAM; heatmap con `take:10000` "optimized for 8GB".
8. **Ciclo heartbeat → `notifyMorosidad`**: PDF + WhatsApp + transacción `REGLA-402-*` con ref `@unique` que colisiona (P2002) en cada heartbeat ~1/min.
9. **`JWT_SECRET` generado aleatoriamente si no está en env** (`main.ts:28-30`) → todos los tokens se invalidan en cada reinicio/caída de tablets y sesiones.
10. **`commitment REAL a los nativos**: `player/src/killswitch.ts` TTL local 24h ignorando KILLSWITCH_GRACE de 1h; `playlist-engine.ts` reintento infinito cada 2s offline; `sw.ts` cache de videos sin poda.

---

## 2. BACKEND API + DB (`apps/api`) — 57 hallazgos

### 2.1 CRITICA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| C1 | `device/device-admin.controller.ts:34-372` — Controlador `devices` SIN `@Roles(ADMIN)`: cualquier usuario con JWT de driver (registro público gratis) aprueba dispositivos, asigna driver, pone `subscriptionPaid=true`, borra nodos/telemetría, lee PII (cédula) y hace broadcast REBOOT/SCREEN_OFF/MUTE a toda la flota. R9/R3/R4 | `@Roles(ADMIN)` en clase + restricción por path |
| C2 | `drivers/drivers.controller.ts:64-105` — `POST /drivers` es `@Public` y acepta `subscriptionPaid`/`subscriptionEnd` del body → se crea conductor OPERATIVO pagado sin pagar, saltándose la aprobación admin y el kill-switch. R3/R9 | Sacar esos campos del DTO público; forzar status INITIAL + pago verificado |
| C3 | `analytics/analytics.service.ts:38-55` — `POST /analytics/event` y `/analytics/batch` `@Public` auto-crean el dispositivo OPERATIVO si no existe. R9/R2 | Auto-create solo con status INITIAL o device token verificado |
| C4 | `telemetry/telemetry.controller.ts:124-162` — `POST /telemetry/playback-batch` `@Public` valida solo el primer deviceId y marca `verified:true` en TODOS los eventos → inyección de playbacks verificados que pagan nómina (R8). X-Tablet-Key es opcional (89-95). R8/R9 | Validar cada evento, `verified=false` sin X-Tablet-Key válida, límite por device |
| C5 | `monitoring/monitoring.controller.ts:26-31` — `GET /monitoring/fleet-status` `@Public` + `@Roles` (el guard devuelve true en públicas) → GPS en tiempo real, placas y estado de TODA la flota expuestos. R9 | Quitar `@Public`, dejar solo `@Roles(ADMIN)` |

### 2.2 ALTA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| A1 | `device/device.service.ts:236-246` + `finance/finance.service.ts:57-103` — Por cada heartbeat de moroso, `notifyMorosidad` fire-and-forget: PDF (PDFMake), WhatsApp y transacción `REGLA-402-${deviceId.slice(0,8)}` con `@unique` → P2002 + WhatsApp duplicados con costo real. R1/R6 | Deduplicar por device+día en BD; quitar creación de transacción de este path |
| A2 | `finance/finance.controller.ts:144-154` — `POST payroll/pay` sin `IdempotencyInterceptor` ni `$transaction`; `reference` controlado por el cliente → pagos duplicados. R1 | Interceptor + `$transaction` + reference interno `PAY-YYMM-UUID8` |
| A3 | `finance/finance.controller.ts:336-338` — `emailInvoice` cuenta `play_confirm` GLOBAL sin filtro de campaña ni `verified` → factura con impresiones falsas/ajenas. R8/R1 | Filtrar por campaignId y verified |
| A4 | `campaign/campaign.service.ts:283,327-342` — Chequeo R4 (≤15 campañas) con `_count` leído FUERA de la transacción → TOCTOU; + 1 `findUnique` por device dentro de la tx (N+1). R4/SRE | Mover count dentro de la tx con lock; notificación fuera de la tx |
| A5 | `monitoring/monitoring.controller.ts:16-21` + `service.ts:59,82-94` — `POST /monitoring/gps-batch` `@Public` acepta `driverId` del body (spoofing GPS) y reactiva `status: OPERATIVO` (rompe suspensión/kill-switch). R3/R9 | Usar siempre `device.driverId`; no tocar status |
| A6 | `notifications/notifications.controller.ts:8-36` — Sin `@Roles`: cualquier autenticado lee notificaciones globales y `POST /test-alert` spamea Realtime a toda la flota. R9 | `@Roles(ADMIN)` + scoping por entidad |
| A7 | `media/media.controller.ts:22-86` — Sin `@Roles`: borra media de cualquier campaña, registra publicUrls arbitrarias (`register-bypassed`), upload sin binding. R9/R7 | `@Roles(ADMIN)` + ownership por tenant |
| A8 | `finance/finance.service.ts:142-160` — `calculateMonthlyPayroll` carga en RAM todos los campaigns activos + drivers + media del mes → OOM en 512MB. SRE | Agregación SQL (groupBy+sum), paginación |
| A9 | `drivers/drivers.service.ts:256,315` — Password predecible `Tad-${phone}!` devuelto en claro (`generatedPassword`). R9 | Password aleatorio, entrega única o seteo por usuario |
| A10 | `sync/sync.service.ts:83-85` — Kill-switch R3 ignora `subscriptionEnd`: "pagó hace 6 meses" sigue con OFFLINE_LICENSE. R3 | `subscriptionEnd >= now` + `subscriptionPaid` |
| A11 | `bi/bi.service.ts:252-346` — `generateReconciliationReport` (cron 02:00): todos los drivers en RAM + 3 queries por driver (N+1/OOM). SRE | Chunking limit/offset, agregados por lote |
| A12 | `main.ts:28-30` — Si falta `JWT_SECRET` se genera uno aleatorio por boot → todos los tokens mueren al reiniciar. SRE | Falla al arranque si falta en prod (crash-early) |
| A13 | `sheets/sheets.controller.ts:19-34` — `POST /sheets/sync` y `GET /sheets/report` `@Public`: contabilidad completa (nóminas, cédulas, placas) a Google Sheets y lectura sin auth. R9 | `@Roles(ADMIN)`, bloquear report |
| A14 | `simulation/simulation.controller.ts:6-8` — `@Public` + `@SkipThrottle`, `activeNodes` sin tope; el `@Interval(30s)` inserta batches masivos → DoS almacenamiento/CPU. SRE/R2 | Tope + throttle + deshabilitar en prod |
| A15 | `campaign/campaign.service.ts` (updateCampaign) — findFirst(commission)+create+financialTransaction+wallet.upsert SIN `$transaction` → doble comisión concurrente; bonus en `Wallet.availableBalance` (tabla muerta) no en `Driver.walletBalance`. R1 | `$transaction` + escribir en `Driver.walletBalance` |
| A16 | `analytics/analytics.service.ts:396` — Heatmap `take:10000` "Optimized for 8GB RAM" y agregaciones semanales en RAM sin LIMIT → OOM en 512MB. SRE | Agregar en SQL (groupBy/date_trunc), paginar |

### 2.3 MEDIA (resumen)

- M1 `auth/auth.service.ts:151-175` — cambio de password sin verificar la actual. R9 | `signInWithPassword` antes de `updateUserById`.
- M2 `device-token.guard.ts:19`, `sync.service.ts:26`, `device.service.ts:19`, `jwt.strategy.ts:25` — 4 fallbacks de secret hardcodeados. R9 | Eliminar fallbacks; exif env. *(Cruzado con paquetes, ver común.)*
- M3 `idempotency.interceptor.ts:41-68` — `isLocked` se libera solo en `tap`: si el handler lanza, quedas bloqueado hasta el cleanup 04:00; no valida `expiresAt`. R6 | Liberar en `finalize`, filtrar expiresAt.
- M4 `prisma/views.sql` — `DROP + CREATE MATERIALIZED VIEW` en cada arranque (no CONCURRENTLY): ventana de error en sync en cada deploy. SRE | `REFRESH MATERIALIZED VIEW CONCURRENTLY` con índice único.
- M5 `finance.controller.ts:131-138` — `getPayroll` captura error y responde `{error}` con HTTP 200. R1 | 4xx/5xx reales + log.
- M6 `campaign.controller.ts:550-573` — `deleteCampaign` con 8 `deleteMany` SIN transacción; `POST /campaign/intent` `@Public` con `body:any`. R2/R9 | `$transaction` + proteger intent.
- M7 `campaign` `linkMediaToCampaign`/`getCampaignDevices` — sin ownership: un anunciante maneja campañas ajenas. R9 | Validar `campaign.advertiserId` vs token.
- M8 `drivers.controller.ts:263-279` — `GET hub` `@Public` con `TABLET_HUB_KEY ===` no constant-time. R9 | JWT por tablet + `timingSafeEqual`.
- M9 `device.controller.ts:63-70` — `POST /device/command/:id/ack` `@Public`: terceros marcan comandos EXECUTED ajenos. R9 | Validar X-Device-Token + ownership.
- M10 `device.controller.ts:33-38` — `POST /device/playback` `@Public` crea `play_confirm` (usado en `emailInvoice`) sin throttle ni verified. R8 | Filtrar `verified` en métricas.
- M11 `analytics.controller.ts:21-32` — `shareReportByWhatsApp` sin `@Roles`: spam con cuenta Ultramsg. R9 | Roles + ownership + throttle.
- M12 `analytics.controller.ts:83-162` — `getDeviceAnalytics`/`getWeeklyCampaignAnalytics`/PDF sin `@Roles` → datos de campañas/competidores. R9 | Roles + ownership.
- M13 `analytics.controller.ts:164-170` — `POST /analytics/external-gps` `@Public` actualiza posición de cualquier device. R8 | Validar device+driver.
- M14 `fleet/fleet.service.ts:786`, `controller.ts:102-106` — `POST /fleet/track-batch` `@Public` con `driverId` del cliente; batch sin tope. R2/R9 | `device.driverId` + cap.
- M15 `fleet.service.ts:249,257-272` — tarifa hardcodeada 1.25 (3.ª constante distinta) y play_confirm sin filtrar verified → ingresos inconsistentes. R1/R8 | Centralizar en BUSINESS_RULES + verified.
- M16 `portal-requests.controller.ts:9-45` — `@Public` con `body:any`; GETs IDOR con datos de contacto; PUT/DELETE sin roles. R9 | Roles + ownership.
- M17 `referral.controller.ts:8-21` — Sin `@Roles`: expone red/PII de referidos, genera código de otro chofer. R9 | `@Roles(DRIVER)` + ownership.
- M18 `kyc/kyc.controller.ts:34-38` — `GET /kyc/:id/status` `@Public` IDOR sobre documentos de identidad. R9 | Validar propiedad + throttle submit.
- M19 `payroll-audit.service.ts:24-52` — cron mensual N+1 (`findMany` + `findFirst` por driver). SRE | groupBy/chunking.
- M20 `app.module.ts` / `main.ts` — SIN ValidationPipe global; la mayoría recibe `body:any` → mass-assignment. SRE/R9 | ValidationPipe global whitelist.
- M21 `auth.service.ts:211-264` — `registerDriver` firma JWT para usuario que NO existe en Supabase; token muere si `SUPABASE_JWT_SECRET` falta. R9 | Crear auth user o exigir login.
- M22 `subscription.guard.ts:~55` — `subscriptionPaid=true` + `subscriptionEnd=null` → falso positivo 402. R3 | Tratar null como pago válido.
- M23 `finance.service.ts:109-136` — `checkHighDelinquency` en `onModuleInit` (cada boot) + cron 03:00 → re-envío WhatsApp y P2002 por boot. R6 | Gate por fecha solo cron + dedup.
- M24 `monitoring.service.ts:203-209` — cron SUSPENDED ignora `lastSeen:null` (dispositivos nunca vistos). R6 | Incluir `{ lastSeen: null }`.
- M25 `telemetry.controller.ts:32-58` — comentario "se conserva público" pero SIN `@Public` → exige JWT; solo valida el primer driverId del batch. R2/R9 | Definir `@Public` y validar todo el batch.
- M26 `supabase.service.ts:61-64` / `media.service.ts:61,73-88` — bucket `ads-videos` `public: true` y upload pre-firma sin binding a campaña. R7 | Bucket privado + RLS + ownership.

### 2.4 BAJA (resumen)

- B1 `health.controller.ts:27-40` — `/health/full` `@Public` expone `process.memoryUsage()`. SRE | Restringir.
- B2 `main.ts:54` vs `.env.example` — `CORS_ORIGIN` (singular) vs `CORS_ORIGINS` (plural). SRE | Unificar.
- B3 `prisma.service.ts:19` — regex `/connection_limit=(\d+)/` doble-escape nunca matchea. SRE | `new RegExp`.
- B4 `antigravity.service.ts:45-52` — API key Gemini en query string (`?key=`). SRE | Header API-Key.
- B5 `monitoring.service.ts:11-17` — `PILOT_DEVICE_IDS`/`ADMIN_PHONE` hardcodeados. SRE | Env vars.
- B6 `invoice.service.ts:41,72` — número de factura `Math.random()` y tarifa 1.25. R1 | Secuencia persistida + BUSINESS_RULES.
- B7 `email.service.ts:359-361` — ITBIS 0.18 hardcodeado; templates sin escapar (HTML injection). R1 | Constante + escape.
- B8 `media.service.ts:36` — MIME pasa si campo vacío; `register-mock/bypassed` URLs arbitrarias. R7 | Exigir MIME + validar URL.
- B9 `onboarding.controller.ts:12-16` — `POST /onboarding/advertiser` sin throttle fino. R9 | Throttle 3/min.
- B10 `main.ts:76-99` — CORS por defecto permite requests sin origin; allow-list hardcodeada. SRE | Allow-list a env.

---

## 3. FRONTENDS PWA (admin / advertiser / driver) — 23 hallazgos

### 3.1 CRITICA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| C1 | `admin/components/DirectUpload.tsx:14`, `advertiser/components/DirectUpload.tsx:16`, `driver VideoUpload.tsx:85-94` — Falsa subida de medios: fabrica URL `https://storage.supabase.co/tad-media/<file>` y `mediaId mock-<timestamp>`; las campañas referencian videos inexistentes. R7 | Implementar upload real a Storage firmado o fallar explícitamente |
| C2 | `driver/public/service-worker.js` (manual v12 con BackgroundSync y trimCache) **nunca se registra**; solo corre `sw.js` (workbox). Offline: sin navigation fallback, `reloadOnOnline:false`. R1/R2 | Registrar/mergear el SW v12 o eliminar el muerto |
| C3 | `driver/middleware.ts` — decode JWT con `atob` sin validar `exp` ni firma (solo driver tiene middleware). R9 | Validar firma/exp con `jose`/edge-runtime |

### 3.2 ALTA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| A1 | `driver/hooks/useBackgroundTelemetry.ts:257-275,328,561` — Race en `syncOfflineQueue`: `writeOfflineCoords(remainingQueue)` borra coords nuevas; JSON.parse sin try/catch → bucle de sync si localStorage corrupto. R2 | Snapshots atómicos + try/catch |
| A2 | `driver/lib/offlineQueue.ts` — JWT en localStorage (`tad_driver_token`); listener `online` → `window.location.reload()` (riesgo loop). R1/R2 | Manejar 401/402 sin limpiar cola; evitar reload agresivo |
| A3 | `driver/components/BankForm.tsx:118-127` — Datos bancarios en localStorage "en claro" pese a comentario de cifrado. R9 | Cifrar/cloud storage |
| A4 | `driver/dashboard/WalletTab.tsx:46-74` + `pages/dashboard.tsx` — Transacciones falsas fabricadas si falla la API; página demo "Juan Pérez RD$8,000" servida en `/dashboard`. R1/R8 | Eliminar datos demo/fallback inventado |
| A5 | `admin/pages/admin/dashboard/index.tsx:459-480` — "Fleet Pulse Terminal" genera logs falsos (`Math.random`, "Thermal warning 72°C") cada 3s presentados como Live; `finance/investor.tsx:78-80` UnitStatus mocked. R9/QA | Quitar datos simulados presentados como reales |
| A6 | `advertiser/billing/page.tsx:27,58-63` — Pago hardcodeado (`ad_acc_001_nexpay`, RD$7,080) contra ruta inexistente `/api/payments/nexpay` (solo `/api/proxy`) → 404; `BillingPortal` dice "pending implementation". R1 | Implementar/eliminar; conectar al proxy real |
| A7 | `admin/login.tsx:67-69`, `advertiser/login.tsx:41-43`, `driver/login.tsx:68-70` — JWT+refresh en localStorage y cookie `sb-access-token` sin HttpOnly. R9 | Cookies HttpOnly httpOnly+secure o refresh en memoria |
| A8 | `admin/next.config.ts:8-9` vs `proxy/[...path].ts:28` vs `services/auth.service.ts` — Fallbacks inconsistentes de URL API (`tad-api...` vs `proyecto-ia-tad-api...`). R9 | Centralizar en una constante/env |

### 3.3 MEDIA (resumen)

- M1 `admin/components/MapView.tsx:146` — center default Buenos Aires para flota en Santiago DR; tiles externos CARTO/OSM; `driver MapView:17-18` iconos desde `unpkg.com` (rompe offline). R1/R9 | Center por env + assets locales.
- M2 `packages/ui/hooks/useAntigravity.ts` — `BroadcastChannel('tad_sync')` por payload sin `close()`; suscripción postgres_changes `*` con anon key. R9 | Singleton cerrado + scoping.
- M3 `player/src/playlist-engine.ts:265,295` — QR con `api.qrserver.com` (runtime offline roto); `killswitch.ts:91-109` intercepta `window.fetch` y `restoreFetch()` nunca se llama. R1/R3 | QR local + intercept acotado.
- M4 `player/src/sw.ts` — `VIDEO_CACHE` sin límite; nombre de caché inconsistente. R1 | Quota + poda.
- M5 Admin/advertiser **sin middleware** de protección de rutas (client-side only). R9 | Añadir middleware/middlewares.
- M6 `config.ts:14` fallback hardcodeado `api.tad.dooh.cloud`. R9 | Env obligatorio.

### 3.4 BAJA (resumen)

- B1 `driver/swrConfig.ts` sin manejo de 401/402. R3 | Centralizar.
- B2 `driver/.env.local:5` `NEXT_PUBLIC_PORTAL_TYPE=ADMIN` en app driver. Config | Corregir.
- B3 `MonitoringMap.tsx` iconos `/markers/*` inexistentes. R1 | Assets locales.
- B4 `apps/tad-simulator` usa sintaxis Tailwind v3 — única con Tailwind v4 en las apps. Nota.

---

## 4. PLAYER / VIDEO / NATIVOS — 30 hallazgos

### 4.1 CRITICA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| C1 | `driver-flutter/models/hub_data.dart:95-107` — `subscriptionPaid:true` / `contractAccepted:true` / `onboardingStatus:'READY'` FORCEADOS, ignorando al servidor. R3 | Usar valores del backend + log de discrepancias |
| C2 | `driver-flutter/features/auth/login_screen_v2.dart:125,165-174` — Botón "ENTRAR (BYPASS)" y `_doLogin` con bypass total a 'dev-driver' en builds prod. R3/R9 | Enjaular en `kDebugMode` o eliminar |
| C3 | `driver-flutter/core/di/providers.dart:35` — 402 kill-switch "suppressed for development" → overlay nunca activo en prod. R3 | Activar salvo debug real |
| C4 | `player/src/playlist-engine.ts:~195-290` — Reintento cada 2s sin límite + fallback CDN inalcanzable offline → loop infinito y spam de PoP. R1 | Skip con máx 3 intentos + backoff |
| C5 | `player/src/killswitch.ts:~90-140` — TTL local 24h vs KILLSWITCH_GRACE 1h del servidor; tras >24h offline auto-levanta el bloqueo → evasión R3. R3 | Persistir `expiresAt` del servidor y no auto-levantar |

### 4.2 ALTA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| A1 | `player/src/playlist-engine.ts:~195,280` — Race watchdog/`ended` y timers de intermisión no cancelados → doble avance y doble PoP `play_confirm`; arriesga el bench 10x10. R7 | Token de transición + cancelación |
| A2 | `player/src/sw.ts:~30-100` — Cache API `VIDEO_CACHE` sin poda + IndexedDB en paralelo → ~1.6GB potencial en la tablet. R1/R8 | Quota máx + poda + copia única |
| A3 | `player/src/workers/video-downloader.worker.js:~30-60` — Descarga blobs sin enforce de `MAX_VIDEO_SIZE_BYTES` (55MB) y sin reuso del CacheManager. R8/R9 | Abortar >55MB + reutilizar viaje IDB |
| A4 | `player/src/cache-manager.ts:~100-140` — Blob URLs previas no se revocan al transicionar. R7 | Revoke del asset saliente en `playNext` |
| A5 | `driver-flutter/core/network/kill_switch_interceptor.dart:29-34` — 401 con re-login exitoso nunca llama `handler.next()/resolve()` → request colgado para siempre. R3/R7 | Siempre resolver con request renovado |
| A6 | `tad-remotion/src/index.ts:23,313` — `cors()` abierto sin auth/rate-limit/timeouts y cola ilimitada → DoS. R9 | Token + rate-limit + límite de cola + memoria 1024MB |
| A7 | `tad-remotion/src/index.ts` (output) — `ad-${campaignId}-${Date.now()}.mp4` con campaignId sin saneo → path traversal. R9 | Whitelist regex + `path.basename` |
| A8 | `driver-flutter/core/auth/auth_helpers.dart` — password en SharedPreferences sin cifrar. R9 | `flutter_secure_storage` |
| A9 | `player/src/sync-manager.ts:~288-330` — OFFLINE_LICENSE validado solo por `expiresAt` client-side, sin firma JWT. R3 | Validar firma (HMAC) en sync + cachear hash |
| A10 | `Dockerfile.driver.app:19`, `Dockerfile.driver:22`, `Dockerfile.advertiser:22` — anon key Supabase real commiteada. R9 | `--build-arg`/env → *(cruzado con infra)* |
| A11 | `api/src/modules/sync/sync.service.ts:26` — JWT secret predecible permite forjar OFFLINE_LICENSE/licenseToken. R9 | Rotar secreto + fallback que falle en prod → *(cruzado con backend)* |
| A12 | `tad-simulator/src/*.ts` — TS corrupto que no compila (imports inexistentes, sintaxis rota). Higiene | Eliminar o reescribir |

### 4.3 MEDIA (resumen)

- M1 `player/src/config.ts:14` — `PLAYBACK_FLUSH_INTERVAL_MS` default 30s vs R2 (debounce 5min). R2 | Default 5min.
- M2 `player/index.html` — QR `api.qrserver.com` roto offline. R1 | QR local/cache.
- M3 `player/src/fullykiosk-bridge.ts` — REBOOT/LOAD_URL en localhost:1312 sin auth. R9 | Token + canal firmado.
- M4 `player/src/playback-queue.ts` — flush sin `X-Tablet-Key` (el batch "no lo exige") y fetch sin timeout → pérdida de batch. R2/R9 | Timeout + batch idempotente.
- M5 `driver-flutter/core/sync/sync_queue.dart` — cola offline solo en memoria → pérdida de GPS al matar el proceso. R2 | Persistir (Hive).
- M6 `driver-flutter/core/sync/sync_engine.dart` — sin flush inmediato al reconectar (solo timer 5min). R2 | Listener de conectividad.
- M7 `driver-android/.../KillSwitchInterceptor.kt:169-171` — password en claro en Room. R9 | Refreshtoken, nunca password.
- M8 `tad-simulator/src/metrics.ts:15`/`generators.ts:15` — default `'tad-tablet-key-2026'` si no hay env. R9 | Env obligatorio.
- M9 `tad-remotion/src/index.ts:~330` — cleanup 30min con `fs.*Sync` bloqueante. SRE | Async.

### 4.4 BAJA (resumen)

- B1 `player/src/sw.ts:~92` — cachea POST `/telemetry/` en Cache API (inútil). R2 | Solo GET.
- B2 `driver-flutter/core/network/api_constants.dart:11` — URL prod hardcodeada. R9 | `--dart-define`.
- B3 `player/tests/e2e/player.spec.ts` — bench 10x10 no cubre caché frío/offline ni kill-switch >24h (justo los bugs R1/R3). QA | Ampliar casos.
- B4 `tad-remotion` sin S3/Storage activo en código (módulo pendiente). R7 | Adjuntar storage.

---

## 5. INFRAESTRUCTURA / DEVOPS — 22 hallazgos

### 5.1 CRITICA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| C1 | `apps/api/prisma-cloud-test.js:5` — connection string de producción con contraseña real `REDACTED` **commiteada en git**. SRE | Borrar del historial (git filter-repo/BFG) + **ROTAR la contraseña** + env vars |
| C2 | `apps/api/test_db.py:17-19` — 3 variants del pooler de prod con la misma password **commiteada**. SRE | Borrar + rotar; no mantener scripts de diagnóstico con credenciales |
| C3 | Auto-deploy webhook EasyPanel en push a `main` (evidencia en `16_cicd_...md:123,129`, `DOCKERFILE_ERROR_SOLUTION.md:185,202`, `DEVOPS_AUTODEPLOY.md`) — viola política de deploys manuales. SRE | Desactivar webhook; deploys explícitos manuales |

### 5.2 ALTA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| A1 | `.dockerignore` raíz (21-22) solo excluye `.env.local`/`.env.*.local`, NO `.env`; `Dockerfile.api:18` hace `COPY . .` → **secrets horneados en la imagen**. SRE | Añadir `.env`, `.env.*`, `!*.env.example`; usar `Dockerfile.api.dockerignore` (sí excluye) |
| A2 | Docs apuntan a Dockerfiles inexistentes: `DOCKERFILE_ERROR_SOLUTION.md:63-68`, `DEPLOYMENT_GUIDE.md:233-240` dicen `apps/admin/Dockerfile` etc. — NO existen (solo raíz). SRE | Corregir a rutas reales (`Dockerfile.admin`, ...) |
| A3 | `apps/driver/Dockerfile.driver:30`, `Dockerfile.advertiser:30`, `Dockerfile.admin:30` — heap `--max-old-space-size=1024` en copias duplicadas (contenedor 512MB → OOM crash-loop); además `node:22` vs `node:20`. SRE | Eliminar duplicados; usar raíz con 384MB |
| A4 | `apps/api/Dockerfile:2,11` y `apps/driver/Dockerfile.advertiser:2,26` usan `node:22-alpine` vs baseline Node 20. SRE | Unificar node:20-alpine |
| A5 | `docker-compose.remotion.yml` + `apps/tad-remotion/Dockerfile` — SIN Chromium (remotion no puede renderizar). SRE | Unificar a `Dockerfile.remotion` raíz que instala chromium |
| A6 | Healthcheck de Remotion: `Dockerfile.remotion:45` hace `GET /api/render` (endpoint solo POST) → siempre unhealthy; no existe `/health` aunque la doc lo cita. SRE | Endpoint real `/health` + usarlo en Dockerfile/compose |
| A7 | `CORS_ORIGIN=true` hardcodeado (`apps/api/.env:3`) y doc lo marca como "rompe allowlist". SRE | Eliminar; prohibir valor `true` |
| A8 | `apps/api/package.json:15-16` — `start:migrate`/`deploy:migrate` = `prisma db push --accept-data-loss` (destructivo); usado contra pooler en el changelog. SRE | Eliminar scripts; `prisma migrate deploy` contra DIRECT_URL/5432 |

### 5.3 MEDIA (resumen)

- M1 `.github/workflows/docker-image.yml:18` — CI stub construye `Dockerfile` raíz (busybox error) con tag fake; sin gates lint/test/build. SRE | Gates reales o eliminar stub; deploy manual.
- M2 `apps/api/src/utils/sentry.ts` — `initializeSentry()` nunca se invoca; `tracesSampleRate:1.0`. SRE | Llamar en `bootstrap()` antes de crear app; bajar sample rate.
- M3 `Dockerfile.agents:49` — heap 512MB = límite del contenedor (sin headroom). SRE | ~384-448MB.
- M4 `apps/tad-remotion/Dockerfile` — sin `NODE_OPTIONS` ni `CHROMIUM_PATH`. SRE | Alinear con Dockerfile.remotion.
- M5 `Dockerfile.tablet-player:8` — `COPY apps/tablet-player` inexistente → build falla; `package.json:18` `dev:tablet` también apunta ahí. SRE | Apuntar a `apps/player` o eliminar.
- M6 Docs de memoria divergentes: runbook dice 256/512, Dockerfiles usan 384. SRE | Unificar con valores reales.
- M7 `apps/api/.env.local:2` — `DATABASE_URL` + `VERCEL_OIDC_TOKEN` reales en el working tree (gitignored pero en disco). SRE | Purgar.
- M8 `apps/api/.dockerignore:9` — patrón `*.js` con excepciones contradictorias → build inconsistente (MODULE_NOT_FOUND). SRE | Simplificar.

### 5.4 BAJA (resumen)

- B1 `Dockerfile.admin/advertiser/driver/driver.app` + `driver-flutter/Dockerfile` — anon/publishable keys horneadas (no rotables sin rebuild). R9 | `--build-arg`/secrets.
- B2 `.env` frontends con `SENTRY_AUTH_TOKEN`/DSN reales (gitignored pero en disco). R9 | CI secrets.
- B3 `*.env.example` con ID real de cliente Google (`1081552204265-...`) y varios secrets de muestra. R9 | Placeholders.

---

## 6. PAQUETES COMPARTIDOS (`packages/*`) — 45 hallazgos

### 6.1 CRITICA

| # | Hallazgo | Fix |
| :--- | :--- | :--- |
| C1 | `apps/api/src/modules/sync/sync.service.ts:26` — `JWT_SECRET || 'tad-default-secret-2026'` usado para **firmar OFFLINE_LICENSE/KILLSWITCH**. R9 | Rotar + requerir env *(duplicado inter-dominio)* |
| C2 | `apps/api/src/app.module.ts:54` — `JWT_SECRET: zod.string().default('tad-secret-2026')`. R9 | Quitar default |
| C3 | `apps/api/scripts/fix-admin.ts:7,17` y `fix-adv.ts:7,12` — passwords `'tad2026admin'`/`'tad2026'` hardcodeados Y logueados en consola. R9 | Eliminar scripts o leer de env sin log |
| C4 | `apps/api/prisma/simulate-data.ts:9,34,70,318` — `DEFAULT_PASSWORD='Tad2026!'` logueado en consola. R9 | Env + sin log |
| C5 | `apps/admin/pages/admin/fleet/index.tsx:61,881-883` — **JWT en query string** de una URL de página | Enviar vía postMessage/sessionStorage, nunca por query |
| C6 | `apps/api/src/modules/auth/strategies/supabase.strategy.ts:38` — fallback `'tad-default-secret-change-me'`. R9 | Eliminar fallback |
| C7 | `packages/types` — carpeta VACÍA: el paquete `@tad/types` no existe, todos los tipos de dominio se duplican manualmente por app. Arquitectura | Crear `@tad/types` re-exportando Prisma + tipos compartidos |
| C8 | `apps/api/src/modules/auth/strategies/jwt.strategy.ts:25`, `auth.module.ts:21` — fallback de secret adicional. R9 | Eliminar fallback |

### 6.2 ALTA

- A1 `packages/services/package.json:4` — solo `main: index.ts`, sin `exports`/`types`; subpath imports frágiles. Fix: añadir `exports`.
- A2 `packages/store`, `packages/ui`, `packages/services` sin `tsconfig.json` propio. Fix: añadir.
- A3 `apps/driver/package.json:23-25` NO declara `@tad/logging`, pero `_app.tsx:11` lo importa → **dependencia fantasma**. Fix: declarar.
- A4 `apps/advertiser/tsconfig.json` sin `paths` para `@tad/*`; `apps/driver/tsconfig.json:21-22` solo mapea `@tad/logging`. Fix: tsconfig.base.json compartido.
- A5 `apps/admin/next.config.js` + `next.config.ts` COEXISTEN y son conflictivos (transpilePackages y redirects distintos). Fix: borrar uno.
- A6 No existe `tsconfig.base.json` raíz para centralizar `paths`. Fix: crear.
- A7 Interfaces de dominio duplicadas: `Advertiser` en 3× `pages/p/index.tsx`, `Device`/`Campaign` en 5+ archivos. Fix: derivar de Prisma vía `@tad/types`.
- A8 `packages/services/auth.service.ts:203-205` — `API_BASE_URL` fallback hardcodeado a prod. Fix: fallar si falta env.
- A9 `packages/store/useTabletStore.ts:5-16` — `gpsBuffer: any[]` sin límite persistido en localStorage (zustand persist) → cuota y pérdida de datos. Fix: acotar + IndexedDB.
- A10 `useTabletStore` sin `version`/`migrate` de zustand persist → cambio de forma corrompe el estado. Fix: versionar.
- A11 `packages/ui` — NINGÚN componente con `'use client'` (usa hooks de estado). Fix: añadir directiva.
- A12 `packages/ui/hooks/useAntigravity.ts:37-42` — `new BroadcastChannel('tad_sync')` POR evento sin `close()`; canal `'tad_sync'` vs `sync-channel.ts` `'tad_dashboard_sync'` → sync cross-tab rota. Fix: singleton cerrado + mismo canal.
- A13 `packages/logging` — `log(...)` vuelca `data` completo sin sanitizar secrets (password/token). Fix: sanitización.
- A14 `apps/advertiser` — imports de `axios`, `@supabase/supabase-js`, `tailwind-merge` que NO están en su package.json (fantasma). Fix: declarar o dedup.
- A15 Página `AdvertiserHub`/`CATEGORY_ICONS` duplicada 3× (admin/advertiser/driver `pages/p/index.tsx`). Fix: centralizar en `@tad/ui`.
- A16 `p/[id].tsx` duplicado admin/advertiser. Fix: centralizar.
- A17 Modales de negocio duplicados/divergentes: `DeviceModal`, `DriverModal`, `AdvertiserModal`, `DeviceSelectorModal`, `DirectUpload`. Fix: centralizar en `@tad/ui`.
- A18 `packages/services/types.ts:5-12` vs `auth.service.ts:207-216` — dos representaciones del mismo dominio. Fix: fuente única.
- A19 `apps/api/scripts/audit-credentials.ts:11,14` — imprime emails/IDs (PII). Fix: no loggear PII.
- A20 `useTabletStore` duplicada en `@tad/store` y `@tad/ui/hooks`. Fix: una sola fuente.

### 6.3 MEDIA (resumen)

- M1 `@tad/services` sin `exports`/`types`. 
- M2 Paquetes sin tsconfig.
- M3 `@tad/store` declarado-no-usado en advertiser.
- M4 `packages/services/supabase.ts:3-4` — credenciales placeholder hardcodeadas.
- M5 `api.ts:96` — idempotency key no criptográfica (Math.random).
- M6 `api.ts:400` — `getProxyBase()` devuelve `localhost:3000` (contradice regla "nunca localhost en prod").
- M7 logger solo a `console.log`, sin transporte/formato JSON.
- M8 `useTabletStore` duplicada en dos paquetes.
- M9 Versiones `@tad/*` inconsistentes (`0.1.0` vs `"*"`); `sonner`, `next`, `@tanstack/react-query` divergentes entre apps.
- M10 `useAntigravity.ts:20` — `console.log` de payloads completos de BD.
- M11 `apps/admin` `next.config.js` + `.ts` conflictivos (ver A5).

### 6.4 BAJA (resumen)

- B1 Timeout global 60s.
- B2 `perf` logger condicional.
- B3 `apps/driver/apps/driver` — carpeta anidada obsoleta con `_app.tsx` duplicado (código muerto).
- B4 `logger` guarda `tad_logs` en localStorage sin límite.
- B5 Colores custom `tad-yellow` no estándar entre apps.
- B6 proxy `[...path].ts:206` log `[PROXY 401 DEBUG]` con estructura de auth.
- B7 root `package.json:18-19` — scripts `dev:tablet`/`dev:driver-native` a directorios inexistentes.

---

## 7. HALLAZGOS TRANSVERSALES DE REGLAS DE NEGOCIO (R1-R9)

| Regla | Estado | Hallazgos clave |
| :--- | :--- | :--- |
| **R1 — Offline 48h** | ⚠️ Débil | SW v12 sin registrar (driver), QR externo, fallback CDN offline, cola telemetría volátil, race en sync |
| **R2 — Batching telemetría 5min** | ⚠️ Débil | Player default 30s, flush sin flush inmediato al reconectar, cola solo en memoria (Flutter), JSON.parse sin try |
| **R3 — Kill-Switch** | ❌ **ROTO** | Bypasses en Flutter (FORCED ACTIVE / 402 suprimido / BYPASS login), TTL 24h local, sync ignora subscriptionEnd, gps-batch reactiva OPERATIVO |
| **R4 — Límite 15 slots** | ⚠️ Débil | TOCTOU en count fuera de tx + N+1 en asignación |
| **R5 — Realtime Wake-up** | ⚠️ Débil | Suscripciones con anon key, BroadcastChannel roto/duplicado sin close |
| **R7 — Multimedia ≤55MB H.264** | ⚠️ Débil | Upload mock, video-downloader sin enforce de 55MB, MIME opcional |
| **R8 — Idempotencia financiera** | ❌ **ROTO** | payroll/pay sin interceptor ni tx, playbacks `verified:true` falsos, facturas globales, bonus fuera de tx |
| **R9 — Seguridad/RBAC** | ❌ **ROTO** | Numerosos @Public sin roles, secrets commiteados, JWT en query string |

> ⚠️ **ATENCIÓN**: R3 y R8 — las dos reglas más críticas para el negocio (ingresos y playback) — están comprometidas en producción tal como está el código.

---

## 8. ORDEN DE REMEDIACIÓN SUGERIDO

### Fase 0 — Incidente de seguridad (URGENTE, horas)
1. **Rotar credenciales** de Supabase/Postgres (la password `REDACTED` está en git). Después purgar el historial (filter-repo).
2. Rotar `JWT_SECRET`, `SUPABASE_JWT_SECRET`, `SENTRY_AUTH_TOKEN`.
3. Eliminar fallbacks de secrets hardcodeados en código.
4. Desactivar el webhook de auto-deploy en EasyPanel.

### Fase 1 — Cerrar la sangría de acceso (RBAC)
5. Añadir `@Roles(ADMIN)` a: device-admin, monitoring (fleet-status, gps-batch), media, notifications, sheets, referral, telemetry playback-batch, analytics WhatsApp/PDF, portal-requests, kyc.
6. Quitar `subscriptionPaid`/`subscriptionEnd` del POST /drivers público; auto-create INITIAL.

### Fase 2 — Integridad financiera y de flota (R3/R4/R8)
7. `payroll/pay`, bonus de referidos y `emailInvoice`: `$transaction` + Idempotency-Key + verified.
8. Kill-switch: corregir sync (subscriptionEnd), eliminar bypasses Flutter, TTL servidor en player.
9. Count de 15 slots dentro de la tx (advisory lock).
10. Detener `notifyMorosidad` heartbeat-loop.

### Fase 3 — Estabilidad SRE (RAM 512MB)
11. Payroll y reconciliación BI → agregación SQL + paginación; heatmap con límites reales.
12. `JWT_SECRET` → crash-early si falta; `enableShutdownHooks`.
13. Dockerfiles: unificar Node 20, heap 384MB, `.dockerignore` excluye `.env`, eliminar duplicados 1024MB.
14. Remotion: Chromium, `/health`, auth en API de render.

### Fase 4 — Offline-first y calidad (R1/R2/R7)
15. Registrar/mergear SW v12; cache de videos con poda+quota; enforce 55MB.
16. Telemetría: flush al reconectar, persistencia (Hive), default 5min, try/catch.
17. Upload real de media o fallo explícito (eliminar mocks).
18. Ampliar e2e player: caché frío/offline + kill-switch >24h (bench 10x10).

### Fase 5 — Higiene de monorepo
19. `packages/types` real, `tsconfig.base.json`, `'use client'` en `@tad/ui`, centralizar componentes duplicados.
20. Eliminar código muerto: `apps/driver/apps`, simulator TS corrupto, `next.config.js` conflicto, scripts a dirs inexistentes.

---

## 9. REGLAS PROTEGIDAS DURANTE ESTA AUDITORÍA

- **R3 / R8**: Se detectaron bypases pero NO se ejecutó ninguna mutación contra producción (no se probaron kill-switch, no se hizo POST de pago, no se inyectó telemetría). El único acceso a datos de producción fue la lectura de archivos local commitados.
- **R1 / R2**: No se alteró ningún Service Worker, hook de telemetría ni cola IndexedDB.
- **SRE**: No se ejecutó `prisma db push`, migraciones, ni ninguna mutación de esquema. No se reinició/desplegó ningún contenedor de EasyPanel.
- **Secrets**: Ninguna credencial nueva fue creada, expuesta ni escrita. Las credenciales ya presentes en el repo (fallbacks y archivos de test) se reportaron con ruta y línea exacta para su rotación.
- Verificación con `tsc --noEmit` (API, driver, admin, advertiser) = 0 errores; no se hizo build de producción.

---

*Fin del informe — siguiente paso sugerido: asignar prioridades por equipo (seguridad → finanzas → SRE → offline) y abrir issues de remediación por hallazgo.*