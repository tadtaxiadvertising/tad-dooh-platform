# 📜 CHANGELOG & LOGS - TAD DOOH PLATFORM

> **Última Actualización**: 2026-07-12

---

### 🔧 FIX: Restauración de Telemetría en Vivo (Admin Map) — ALL-SEEING EYE v12.1.3

- **Cambio**: Tres correcciones quirúrgicas para devolver la telemetría en vivo al mapa de `/admin/dashboard/realtime` y `/admin/tracking`, sin violar el debounce de 5 min, el Kill-Switch V12 (402) ni la transacción atómica del `WalletService`.
  1. **Root Cause #1 (BACKEND-AWARE BROADCAST)**: El hook canónico `useTelemetry.ts` (montado en `apps/driver/pages/dashboard.tsx`) no publicaba `telemetry_ping` al canal Supabase `fleet_tracking_live`. Esa responsabilidad vivía sólo en el hook `@deprecated` `useBackgroundTelemetry.ts`, nunca instanciado. Resultado: el Admin Map quedaba "ciego" entre los refrescos de 30s del `setInterval(fetchData)`, ignorando posiciones frescas del GPS. Se añadió un canal realtime con `ack:true`, throttle de 30s, setup en `startTracking()` y teardown sincronizado con `stopTracking()` (lo cual se alinea con `triggerKillSwitch` para que el 402 también apague el broadcast y no queden canales zombie).
  2. **Root Cause #2 (SNAPSHOT IDEMPOTENTE)**: `FleetService.ingestTelemetryBatch()` seleccionaba `data.points[data.points.length - 1]` como "último punto" para actualizar `Device.lastLat/lastLng/lastSeen`. Tras un período offline el buffer de IndexedDB reordena el orden de inserción, dejando el snapshot apuntando a un punto intermedio y haciendo que el Admin mostrara posiciones congeladas o retrocedidas. Se reemplaza por un `reduce` que busca el timestamp máximo; `createMany` no se ve afectado, `skipDuplicates` se mantiene, y el `Device.update` queda blindado con `try/catch` + `logger.error` (nunca rompe el ack del batch).
  3. **Root Cause #3 (BINDING MAP-SPEC-2026)**: El componente `apps/admin/components/MapView.tsx` evaluaba `item.status === 'online'` para decidir el color del marker, pero `FleetService.getFleetMap()` devuelve `isOnline: boolean` y `status: SystemStatus` (`OPERATIVO`/`PENDIENTE_PAGO`/`BLOQUEADO`) — nunca `status: 'online'`. Por eso TODOS los marcadores pintaban rojo. La nueva evaluación lee `isOnline` directo del backend y conserva el fallback `status === 'online'` para data legacy (TaxiData) — colores TAD preservados: `#22c55e` online, `#ef4444` offline.
- **Archivos tocados**:
  - `apps/driver/hooks/useTelemetry.ts`
  - `apps/api/src/modules/fleet/fleet.service.ts`
  - `apps/admin/components/MapView.tsx`
- **Nota Infraestructura**: No se requiere migración Prisma ni cambios en Supabase Realtime policies — el canal `fleet_tracking_live` ya existe y está autorizado para broadcast (sin RLS ya que es Realtime Broadcast, no Postgres Changes). Tras el redeploy del driver y de la API, los marcadores refrescan en ≤30s sin necesidad de tocar EasyPanel.

---

### 🚀 FEATURE / 🔧 FIX: Resolución de Nginx Crash-Loop y 404 Assets en Player

- **Cambio**: Ajuste en la configuración de Nginx y rutas de build para mapear correctamente los assets estáticos solicitados por el Service Worker, y estabilización del daemon para evitar reinicios constantes de Easypanel.
- **Archivos tocados**:
  - `Dockerfile.player`
  - `apps/player/src/sw.ts`
- **Nota Infraestructura**: Configuración de Nginx adaptada para despliegue en contenedor bajo Easypanel (Nixpacks/Docker).

---

### 🚀 FEATURE / 🔧 FIX: Estabilización Definitiva del Sync Engine y Player PWA (v12.2.0)

- **Cambio**: Auditoría SRE completa del pipeline de sincronización Backend ➔ Supabase Realtime ➔ Player PWA. Refactorización en 6 puntos críticos para eliminar saturación del API Gateway, memory leaks del blob cache, validar el JWT offline (anti-ghosting), y aplicar `LIMIT 15` defensivo en SQL:
  1. **Fix #5 — Anti-OOM (Backend)**: Añadido `LIMIT 15` directamente en los `$queryRaw` de `mv_active_campaigns` en `sync.service.ts:178` y `campaign.service.ts:448`. El slice en JS (`.slice(0, 15)`) queda como defensa en profundidad. Reduce uso de RAM en el contenedor de 512MB.
  2. **Fix #1 — Filtrado de WAKE_UP_CALL por targets (Player)**: El listener del canal `fleet_sync` ahora inspecciona `payload.targets` y lo descarta silenciosamente cuando la lista está presente pero este `deviceId` no está incluido. Esto evita que las 100 tablets de la flota ejecuten `executeFullSync` simultáneo cuando solo 5 fueron el verdadero destino de un `campaign_updated`/`media_asset_added`.
  3. **Fix #2 — Debounce 5s en WAKE_UP_CALL (Player)**: Cuando eventos legítimos pasan el filtro y llegan en ráfagas, `sync-manager.ts:230` aplica un timer de 5s (`WAKE_UP_DEBOUNCE_MS`). Solo el último dispara `executeFullSync()`, previniendo peticiones duplicadas a `/api/v1/device/sync`.
  4. **Fix #4 — JWT Offline Self-Destruct (Player)**: Nuevo método `persistOfflineLicense()` (línea 281) guarda `licenseToken` + `expiresAt` en `localStorage` cada vez que llega un sync exitoso. Nuevo `startOfflineLicenseValidator()` (línea 297) evalúa cada 5 min si el JWT expiró: si está offline y expiró → activa KillSwitch con motivo `OFFLINE_LICENSE_EXPIRED` (pantalla negra "Conecte a Internet para Validar"), cerrando la ventana de evasión por morosidad que existía (un chofer podía apagar datos y seguir reproduciendo indefinidamente).
  5. **Fix #6 — revokeObjectURL en eviction (Player)**: `cache-manager.ts` ahora mantiene un `Map<url, objectUrl>` de blob URLs activos. Cada llamada a `getVideoSource()` revoca el URL anterior antes de crear uno nuevo y el método `evict()` libera el blob antes de borrar el registro — eliminando el memory leak gradual que acumulaba RAM de la tablet tras múltiples syncs.
  6. **Fix #3 — Documentación de consistencia kill-switch (Backend)**: Comentarios actualizados en `device.service.ts:checkSubscriptionStatus()` clarificando que el bloqueo real vive en el `SubscriptionGuard` HTTP (`device.controller.ts:41` que devuelve 402). El service queda como defensa en profundidad sin cambiar el comportamiento de negocio.
- **Archivos tocados**:
  - `apps/api/src/modules/sync/sync.service.ts`
  - `apps/api/src/modules/campaign/campaign.service.ts`
  - `apps/api/src/modules/device/device.service.ts`
  - `apps/api/src/modules/prisma/prisma.service.ts` (Fix rutinario: `splitSqlStatements()` respeta `$$` dollar-quoted blocks; el `split(';')` simple causaba `ERROR: unterminated dollar-quoted string` en PgBouncer al arrancar)
  - `apps/player/src/sync-manager.ts`
  - `apps/player/src/cache-manager.ts`
  - `apps/player/src/env.d.ts` (poblado con `declare global` para `ImportMetaEnv` + `Window.tadKillSwitchActive` — resuelve 11 errores TS2339 preexistentes)
  - `implementation_plan_sync_engine.md` (nuevo, en raíz)
- **Nota Infraestructura**: El fix #4 introduce persistencia del JWT en `localStorage` (clave `TAD_OFFLINE_LICENSE`). Si la fecha del sistema del tablet se adelanta manualmente podría disparar el SELF_DESTRUCT espuriamente — la primera vez que se reinicie vía EasyPanel deploy se refrescará la licencia y se corregirá. El `LIMIT 15` en SQL requiere la materialized view `mv_active_campaigns` inicializada (ver `13_prisma_schema_database_architecture.md §7`); si el primer deploy tras este cambio da error, ejecutar manualmente `REFRESH MATERIALIZED VIEW mv_active_campaigns;` en Supabase SQL Editor.
- **Validación SRE**: `apps/api/node_modules/.bin/tsc --noEmit -p tsconfig.json` → **0 errores** + `nest build` → exit 0. `apps/player/tsc --noEmit` → **0 errores** + `vite build` → 53 módulos, 25.23 KB JS. Un error runtime post-deploy (`split(';')` rompía `$$`) corregido en `prisma.service.ts`. Criterios de éxito cumplidos: Offline-First Resilience (Fix #4), Anti-OOM (Fix #5), Sincronización sin saturación (Fix #1+#2), Regla de 15 Slots SQL-enforced (Fix #5 + slice preexistente).

---

### 🚀 FEATURE / 🔧 FIX: Implementación de Cache ETag y Telemetría GPS Resiliente en Batch

- **Cambio**: Refactorización del flujo de sincronización para soportar cabeceras HTTP 304 (If-None-Match), previniendo consultas redundantes a la base de datos en NestJS. Reescritura del hook de telemetría del driver para persistir coordenadas localmente en IndexedDB ante caídas de red 4G y envío masivo (batching) saltándose el gateway API directo hacia las funciones RPC de Supabase (PostgREST). Implementación estricta de reescritura de URLs hacia Cloudflare (media.tad.do) y límite duro de 15 slots de reproducción simultánea en el manifiesto.
- **Archivos tocados**:
  - `apps/api/src/modules/sync/sync.service.ts`
  - `apps/api/src/modules/sync/sync.controller.ts`
  - `apps/driver/hooks/useBackgroundTelemetry.ts`
- **Nota Infraestructura**: Requiere la creación previa de la función almacenada `bulk_insert_telemetry` en PostgreSQL (Supabase) detallada en el plan de arquitectura para recibir arrays estructurados vía PostgREST RPC.

---

## [PLAYER-V2-CONT] - 2026-06-28

### 🔄 PLAYER+BACKEND: Scheduling, Weighted Rotation, Payload Fix, SW Build, FullyKiosk Bridge

- **PlaybackQueue payload fix**: Cambiado formato de `/telemetry/playback-batch` para coincidir con backend — `deviceId/videoId/eventType/clientTimestamp` (camelCase, bare array)
- **Service Worker build**: Vite config con `rollupOptions.input` dual — `sw.js` emitido en dist root (1.44 KB)
- **GAP #6 — Day-of-Week & Hour-of-Day Scheduling**:
  - Prisma schema: `Campaign.scheduleDays`, `Campaign.scheduleHours`, `Campaign.frequencyCap`
  - Migration SQL: `20260628_add_schedule_and_weight_fields/migration.sql`
  - Backend: SyncService incluye `schedules[]` en manifest response
  - Player: `PlaylistEngine.rebuildActivePlaylist()` — filtra por scheduleDays/scheduleHours cada 60s, soporta "HH:MM-HH:MM" ranges
- **GAP #7 — Weighted Rotation + Frequency Capping**:
  - Prisma schema: `MediaAsset.weight` (int 1-10), `Playlist.loopType` expanded (SEQUENTIAL | WEIGHTED | SHUFFLE | PRIORITY)
  - Player: `applyWeightedOrder()` — Fisher-Yates shuffle con weight-based repetition
  - Backend: `mediaAssetSafeSelect` actualizado con `weight: true` en 5 archivos
- **GAP #10 — FullyKiosk Bridge**:
  - Player: `fullykiosk-bridge.ts` — REST API client para localhost:1312, soporta 13 commandTypes (SCREEN_ON/OFF, SET_BRIGHTNESS, SET_VOLUME, MUTE/UNMUTE, LOCK/UNLOCK_KIOSK, REBOOT, RESTART_APP, ENABLE/DISABLE_MOTION)
  - Backend: `DeviceAdminController` — `POST /:deviceId/command` + `POST /broadcast` para enviar DeviceCommands de kiosk management
  - Auto-detect kiosk availability + motion sensor enable + screen wake lock on init
- **Player build final**: 0 TS errors, 23.30 KB JS (7.12 KB gzip) + 2.16 KB CSS + 1.44 KB SW + 3.86 KB HTML

---

## [PLAYER-V2-REBUILD] - 2026-06-28

### 🎬 PLAYER: Reconstrucción completa del Tablet Player desde zero (TypeScript/Vite)

- **Cambio**: El player (`apps/player/`) solo contenía `dist/` compilado y minificado — sin código fuente. Se reconstruyó completamente como TypeScript/Vite SPA con source modules, cerrando 10 gaps críticos identificados en la auditoría.
- **Archivos Creados** (`apps/player/src/`):
  - `config.ts` — Env vars (VITE_API_URL, VITE_SUPABASE_URL, intervals, sizes)
  - `types.ts` — MediaAsset, SyncManifest, DeviceSyncPayload, PlaybackEvent, CachedVideo, PlayerStatus
  - `cache-manager.ts` — IndexedDB video blob cache con 3-layer fallback (IDB → Cache API → Network), integrity check por checksum, stale asset eviction
  - `playback-queue.ts` — Fire-and-forget queue con IndexedDB persistence, batch flush vía `/telemetry/playback-batch` (PoP validated, no deprecated `/device/playback`)
  - `sync-manager.ts` — Full sync + delta (POST /device/sync + GET /sync/:id), heartbeat loop (5 min), network online/offline listeners, Supabase Realtime `WAKE_UP_CALL` subscription dinámica
  - `playlist-engine.ts` — Sequential loop con intermission transitions (5s QR screen), watchdog timer, fallback behavior, Screen Wake Lock
  - `killswitch.ts` — Fetch intercept para detectar killSwitch en sync responses, localStorage persistence (24h), overlay display/pause
  - `sw.ts` — Service Worker: cache-first para videos, stale-while-revalidate para shell, network-first para API
  - `main.ts` — Orchestration: init all subsystems, resolve deviceId from URL/localStorage, register SW, request Wake Lock, visibilitychange re-sync
  - `index.html` — Shell HTML (video element, intermission, killswitch overlay, toast)
  - `assets/player.css` — Kiosk-mode CSS (scroll lock, touch-action none, glassmorphism QR frame)
  - `env.d.ts` — Vite client type declarations + Window.tadKillSwitchActive
- **Archivos de Config**:
  - `package.json` — Vite + TypeScript + @supabase/supabase-js
  - `tsconfig.json` — ES2022, bundler moduleResolution, strict
  - `vite.config.ts` — root=src, outDir=../dist, port=3006
  - `.env.example` — Todas las VITE_ vars documentadas
- **Gaps Cerrados**:
  - ✅ GAP #1: Source code reconstruido — ahora es modificable y rebuildable
  - ✅ GAP #2: Playback usa `/telemetry/playback-batch` (PoP validated) — no deprecated endpoint
  - ✅ GAP #3: Service Worker registrado en main.ts — offline resilience en background thread
  - ✅ GAP #4: Supabase Realtime subscription en SyncManager — WAKE_UP_CALL instant push
  - ✅ GAP #5: Integrity check por checksum + stale eviction (delta-like via checksum comparison)
  - ✅ GAP #8: PlaybackQueue con IndexedDB + anti-OOM trimming (max 50 events)
  - ✅ GAP #9: KillSwitch TypeScript module (no inline JS hack)
- **Gaps Pendientes (v13 evolution)**:
  - 🔲 GAP #6: Scheduling por hora/día (requiere backend changes en Campaign model)
  - 🔲 GAP #7: Weighted playback / frequency capping (requiere Playlist rotation logic)
  - 🔲 GAP #10: FullyKiosk bridge (requiere REST API integration)
- **Dockerfile.player** actualizado: COPY específico de `src/`, `vite.config.ts`, `tsconfig.json`
- **Constraints respetadas**: Offline-first (IDB + SW + Cache API), GPS batching (PlaybackQueue batch), Easypanel Free Tier (nginx static, no Node runtime), RD$6,000 subscription (KillSwitch enforcement)

---

## [DOC-14-16-AUDIT] - 2026-06-05

### 📚 DOC: Comprehensive Audit & Correction of Docs 14-16

- **Cambio**: Auditoría exhaustiva de 3 documentos de referencia con corrección de errores críticos y adición de secciones nuevas basadas en el estado actual del código.
- **DOC 15 (API Endpoints) — Correcciones Críticas**:
  - Añadido módulo Telemetry completo (3 endpoints: `/telemetry/sync`, `/telemetry/playback`, `/telemetry/playback-batch`) con anti-fraud validation de 5 puntos (REVENUE SHIELD v12.2.5)
  - Corregido `POST /advertisers` auth: `@Public` (Throttle: 3/min), no ADMIN — es self-registration
  - Añadido `POST /advertisers/reset-password` endpoint
  - Corregido ruta de campaign distribution: `/campaigns/stats/:id/distribution` (no `/campaigns/:id/distribution`)
  - Corregido Health module: 3 endpoints (`/health`, `/health/db`, `/health/full`), no solo 1
  - Corregido App Controller: 4 root routes (`/`, `/api`, `/api/v1`, `/api/health`)
  - Añadida §28: Endpoint overlap routing table — define qué endpoint usar para GPS, playback, analytics
  - Añadida §29: SubscriptionGuard nuance — Device module ENFORCED, Driver module STUB (`return true`)
- **DOC 14 (Testing) — Correcciones Críticas**:
  - Corregido Playwright config: `testDir: './tests/e2e'` (no `./tests`), `fullyParallel: false`, `workers: 1`, `baseURL: localhost:3004`, 3 projects (android-kiosk, admin-desktop, offline-resilience)
  - Corregido seed credentials: `admin@tadtaxi.do` / `tad12345` (seed script), `admin@tad.do` / `TadAdmin2026!` (production)
  - Corregido simulation routes: `/simulation/scenario` (no `/simulation/start`), `/simulation/state` (no `/simulation/status`), `/simulation/purge` added, port 3000 (no 3001)
  - Reemplazada sección aspiracional CI con honest status: "NO CI pipeline exists, no quality gates"
  - E2E status corregido: 4/6 (2 specs outside testDir), no 6/6
  - Unit test coverage: 0% (no tests exist), no "PENDIENTE"
- **DOC 16 (CI/CD Pipeline) — Correcciones Críticas**:
  - Corregido port mapping: todos los frontends corren en 3000 internamente, dev ports: Admin=3002, Driver=3004, Advertiser=3000/3001
  - Corregido API CMD: `node dist/main.js` (migrations NO run on startup)
  - Corregido migration procedure: actual script es `db push --accept-data-loss` (dangerous), recommended is `migrate deploy`
  - Corregido health check path: `/api/health` (no `/api/v1/health`)
  - Corregido Remotion base image: `node:20-bullseye` (no node:18)
  - Añadidos 2 servicios: tad-simulator, tad-player
  - Añadida §13: CORS configuration (allowed origins, env override)
  - Añadida §14: Honest CI status — "No pipeline exists, no quality gates"
  - Añadida §15: API shutdown hooks (SIGTERM handling, Prisma cleanup)

---

## [DOC-13-v13.1] - 2026-06-05

### 📚 DOC: Major Audit & Expansion of Doc 13 — Prisma Schema & Database Architecture

- **Cambio**: Reescritura comprehensiva del documento 13 (1,010→1,577 líneas). Corrección de errores críticos y adición de 8 nuevas secciones que representan brechas significativas entre la documentación original y el estado actual del código.
- **Correcciones Críticas**:
  - Model count corregido: 36 modelos + 1 enum (no 32 como indicaba)
  - Wallet `onDelete` corregido: **RESTRICT** (no Cascade — era un error que implicaba que se podía borrar drivers con wallets)
  - `FinancialTransaction.reference` corregido: **nullable** (no required — cambia la semántica de idempotencia)
  - `Campaign.status` default en embedded client: `"DRAFT"` vs `"PENDING_PAYMENT"` en schema (staleness risk documentado)
- **Campos Faltantes Documentados (56+)**:
  - Driver: 24 campos (legal compliance gate, level/tier system, penalty escalation, self-ref relations, identidadVehicular, hardwareConfig)
  - Campaign: 17 campos (dual-status active+status, 5 targeting modes, social/delivery links, createdById, version, category)
  - Device: 15 campos (storageUsed/Total/Free, authToken, appVersion, lastSyncSuccess, lastPlayback, lastOnline)
  - PayrollPayment: penaltyPercentage, referenceNum, paidAt, indexes
  - Subscription: plan (required!), paymentMethod, notes
  - Advertiser: phone, status, pedidosYaUrl, uberEatsUrl, 5 outbound relations
  - PortalRequest: onDelete Cascade, 4 indexes, timestamps
  - ContractAcceptance: driverId index, compliance gate reference
- **8 Nuevas Secciones**:
  - §7: `mv_active_campaigns` materialized view + 6-channel targeting SQL + refresh lifecycle
  - §8: RLS policies (8 tables, 17 policies) + advertiser geofence dependency cycle
  - §9: Shadow indexes (production + simulation) + cleanup procedure
  - §10: Raw SQL patterns (Wallet SELECT FOR UPDATE, Analytics hourly aggregation, Health check)
  - §11: Migration history (7 migrations documented) + zero-downtime strategy + rollback procedures + PostGIS lifecycle
  - §12: onDelete behavior map (20 Cascade + 4 Restrict, with Prisma vs DB contradiction documented)
  - §13: Generated client staleness risk (5 divergences between inlineSchema and schema.prisma)
  - §14: @@map convention (13 model-to-table mappings for raw SQL)

---

## [DOC-13-16] - 2026-06-05

### 📚 DOC: Expansión de Documentación Técnica — 4 Nuevos Documentos de Referencia
- **Cambio**: Creados 4 documentos de referencia técnicos faltantes en la secuencia de documentación del proyecto (13-16), llenando brechas críticas entre los docs existentes (01-12) y el estado actual del código.
- **Archivos tocados**:
  - `13_prisma_schema_database_architecture.md` — Referencia completa del schema Prisma (32 modelos), índices, relaciones, patrones de query, connection pooling, y glosario.
  - `14_testing_strategy_qa_protocol.md` — Pirámide de testing, E2E (Playwright), Unit (Jest), Integration (Supabase Local), Load Testing, QA checklist, bug template.
  - `15_api_endpoints_reference.md` — ~135 endpoints documentados con método, ruta, auth level, parámetros, guards, interceptors, y respuesta structure.
  - `16_cicd_pipeline_deployment_runbook.md` — EasyPanel config, secrets, deploy procedures, rollback, health checks, disaster recovery, troubleshooting.
- **Nota Infraestructura**: Los documentos 13 y 16 contienen referencia directa a la configuración de Supabase (connection pooling), Docker (RAM limits), y Prisma (migraciones) — son complementarios a los docs 05, 07, y 12 existentes.

---

## [v12.2.5] - 2026-06-05

### 🚀 FEATURE / 🔧 FIX: Implementación Completa del Plan de Auditoría, Consolidación y Optimización de Telemetría
- **Finance Consolidation**: Corregida la inyección de dependencias en `FinanceModule` importando `NotificationsModule`, asegurando que el job CRON de cobros automáticos/morosidad no falle al enviar WhatsApps y correos.
- **Telemetry Security**: Endurecido `/telemetry/playback` mediante validación estricta de firmas HMAC y `deviceId` para evitar inyecciones maliciosas de reproducciones falsas.
- **IndexedDB Sync Engine**: Añadido motor de colas de telemetría persistente usando IndexedDB en el portal del conductor (`apps/driver/utils/indexedDb.ts`), garantizando que los datos no se pierdan al reiniciar el navegador en tablets Android.
- **Optimización y Limpieza**: Eliminados artefactos de Vercel innecesarios en un entorno autohospedado en Easypanel, y añadidas migraciones de base de datos para índices de telemetría de alta performance.
- **Archivos tocados**:
  - `package.json`
  - `apps/api/prisma/schema.prisma`
  - `apps/api/prisma/migrations/v12_2_5_indexes_and_cleanup.sql`
  - `apps/api/src/modules/finance/finance.module.ts`
  - `apps/api/src/modules/finance/finance.service.ts`
  - `apps/api/src/modules/telemetry/telemetry.controller.ts`
  - `apps/api/src/modules/telemetry/telemetry.module.ts`
  - `apps/api/src/modules/telemetry/telemetry.service.ts`
  - `apps/driver/utils/indexedDb.ts`
  - `apps/driver/hooks/useTelemetry.ts`
  - `apps/driver/hooks/useBackgroundTelemetry.ts`
  - `apps/driver/pages/check-in.tsx`
  - `apps/tad-simulator/package.json`

---

## [v12.2.4] - 2026-05-31

### 🚀 FEATURE / 🔧 FIX: Corrección de Scripts Raíz y Mitigación TypeScript 6.0
- **Cambio**: Normalización de los scripts raíz del monorepo para usar `--workspaces` en lugar del shorthand `-ws`, y alineación de `ignoreDeprecations` a `5.0` en las configuraciones TypeScript de Admin y API para usar un valor válido con los compiladores TypeScript 5.x durante los builds Docker.
- **Archivos tocados**:
  - `package.json`
  - `apps/admin/tsconfig.json`
  - `apps/api/tsconfig.json`
  - `03_changelog_logs_tad.md`
- **Nota Infraestructura**: La validación completa de instalación/build en el contenedor actual queda condicionada por la política de registry que devuelve `403 Forbidden` al resolver `@ducanh2912/next-pwa`; la corrección aplicada es estática y compatible con Easypanel/NPM moderno.

---

## [v12.2.3] - 2026-05-26

### 🚀 FEATURE / 🔧 FIX: Corrección Quirúrgica de Telemetría Realtime y Proof of Play
- **Cambio**: Unificación del pipeline de telemetría entre baseline REST histórico y Supabase Broadcast efímero. Admin hidrata todas las unidades registradas, escucha `fleet_tracking_live` y degrada a offline después de 90s sin borrar marcadores. El portal del anunciante hidrata exclusivamente sus pantallas contratadas desde `/advertisers/:id/portal`, construye sets inmutables de `driverId/deviceId`, descarta pings externos y mantiene el contador `Pantallas Contratadas: X (N activas ahora mismo)`.
- **Backend**: `/fleet/map` y `/fleet/tracking/baseline` devuelven `driverId`, `deviceId`, última coordenada histórica y estado online de 90s. `/advertisers/:id/portal` expone `telemetry.contractedScreens`, `driverIds` y `deviceIds` solo para campañas activas vigentes del anunciante.
- **Infraestructura**: Los pings de 30s siguen siendo efímeros por Broadcast; la persistencia en `DriverLocations` continúa aislada al batch de 5 minutos del dispositivo. CORS ahora registra orígenes bloqueados y permite headers operativos de tablet/admin.
- **Archivos tocados**:
  - `apps/admin/pages/admin/tracking/index.tsx`
  - `apps/admin/components/MapView.tsx`
  - `apps/advertiser/components/bi/BiHeatmapInner.tsx`
  - `apps/advertiser/components/MapView.tsx`
  - `apps/api/src/modules/fleet/fleet.service.ts`
  - `apps/api/src/modules/fleet/tracking.controller.ts`
  - `apps/api/src/modules/advertisers/advertisers.service.ts`
  - `apps/driver/hooks/useBackgroundTelemetry.ts`

---

## [v12.2.2] - 2026-05-25

### 🔧 FIX / 🧱 ARCH: Unificación SaaS Advertiser + Erradicación de Mock Data
- Se eliminaron fallbacks mock en facturación, reports y métricas del portal advertiser.
- Se estandarizó el cálculo real de CPM, balanceRD e invoices desde backend (`getPortalData` + endpoint dedicado `GET /advertisers/:id/invoices`).
- Se agregaron componentes reutilizables `SkeletonCard` y `ZeroState` para cargas y estados vacíos premium.
- Se incorporó la arquitectura `11_advertiser_data_flow_v12.md` con diagrama Mermaid y mapa de endpoints.

---

## [v12.2.1] - 2026-05-24

### 🔧 FIX / 🚀 FEATURE: Unificación y Consolidación del Portal del Anunciante (Advertiser V12)
- **Cambio**: Centralización de la lógica de facturación, gestión de campañas y analíticas desde el dashboard general hacia el portal SaaS independiente `apps/tad-advertiser`. Implementación de UI/UX Premium con Glassmorphism en Tailwind 4 y eliminación de redundancias de código.
- **Archivos tocados**:
  - `apps/advertiser/pages/advertiser/dashboard.tsx`
  - `apps/advertiser/pages/advertiser/campaigns/index.tsx`
  - `apps/advertiser/pages/advertiser/requests.tsx`
  - `apps/advertiser/pages/advertiser/billing.tsx`
  - `apps/admin/pages/p/advertiser/[id].tsx`
- **Nota Infraestructura**: Configuración de redirecciones seguras y validación del JWT/Supabase con RolesGuard para accesos cruzados de Administradores sin duplicar endpoints.

---

## [v12.2.0] - 2026-05-22

### 🚀 FEATURE: Autenticación Unificada y Onboarding Radial (UX Sprint)

#### Portal de Anunciantes (Demand Gate)
- **Login Unificado Glassmorphic**: Refactorizado `apps/advertiser/pages/advertiser/login.tsx` con selector de pestañas deslizante (Iniciar Sesión / Registrar Empresa), inputs optimizados para touch, y toggle visual de contraseña (Eye/EyeOff). Estética Industrial Terminal oscura con resplandores `#FFD400`.
- **Wizard de Onboarding de 3 Pasos** en `apps/advertiser/pages/advertiser/dashboard.tsx`:
  - **Paso 1**: Selección táctil de ciudad objetivo (Santo Domingo vs Santiago).
  - **Paso 2**: Slider de presupuesto (RD$5,000–RD$150,000) con simulación en vivo contra `/api/proxy/campaigns/simulate-budget` y fallback matemático client-side.
  - **Paso 3**: Proyección de impacto (Alcance único, Impresiones, Pantallas asignadas).
  - Persistencia con `localStorage` key `tad_adv_onboarded_${advertiserId}`. Sesiones subsecuentes omiten el modal.

#### Portal de Conductores (Mobile Gateway)
- **Touch-Native Inputs**: Campo de cédula/teléfono migrado a `type="tel"` en `apps/driver/pages/driver/login.tsx` para activar teclados numéricos nativos en tablets Android.
- **Onboarding Bancario Offline-First** en `apps/driver/pages/driver/dashboard.tsx` (3 pasos):
  - **Paso 1 – Contrato v2.0**: Aceptación formal del servicio HaaS, membresía RD$6,000 + ITBIS 18%, y Fórmula V12: `RD$ = (min(Ads, 15) × 500) + (CPA_Sales × 500)`.
  - **Paso 2 – Banco Dominicano**: Botones táctiles grandes para Banco Popular, BHD León y Banreservas.
  - **Paso 3 – Cuenta Bancaria**: Inputs `type="tel"` para número de cuenta y nombre del titular.
- **Estrategia Offline-First**: Datos persisten en `localStorage` (`tad_offline_bank_details`, `tad_drv_bank_setup_done`). Si `navigator.onLine === false` activa `tad_pending_bank_sync = true` y banner naranja sticky. Listener `window.addEventListener('online', ...)` auto-sincroniza con `POST /drivers/me/bank-details` al recuperar conexión.

#### Portal Administrativo (Master Console)
- **Tour de Inducción de 3 Pasos** (primera sesión) en `apps/admin/pages/admin/dashboard/index.tsx`:
  - **Paso 1**: Bienvenida al Command Center TAD.
  - **Paso 2**: GPS en vivo → ruta `/admin/tracking` con CTA directo.
  - **Paso 3**: Semáforos de salud (Verde/Amarillo/Rojo) de conectividad y batería → ruta `/admin/monitoring`.
  - Detección via `localStorage` key `tad_admin_onboarded`. Botón para re-activar el tour en la sidebar.
- **Procesador de Nómina por Lotes Secuenciales** (`PayrollBatcher` component):
  - 15 conductores simulados divididos en **3 lotes secuenciales de 5** con pausa de 800ms entre lotes (RAM Safeguard para VPS de 512MB).
  - Barra de progreso global con indicadores por lote (Lote 1/2/3).
  - Grid de 15 mini-cards de conductores con estados `pending → processing → done` animados.
  - Terminal de logs en tiempo real con timestamps, mensajes de éxito y advertencias de pausa inter-lote.
  - Resumen final con total desembolsado calculado con Fórmula V12.

---

## [v12.1.3] - 2026-05-21

### 🛡️ SECURITY / 🎨 UI: Driver Onboarding Hardening & BankForm Premium Redesign

- **Fix CRÍTICO — Bypass de Onboarding (CVE-interno TAD-001)**:
  - El botón X del `DriverOnboardingModal` ahora es **no-operable** cuando el `stage` es `'contract'` o `'bank'`. Los pasos obligatorios muestran un ícono X gris inactivo con tooltip informativo.
  - `closeOnboarding()` valida el estado actual del stage antes de ejecutar el cierre; retorna sin efecto si el conductor intenta cerrar un paso obligatorio desde el cliente.
  - El `useEffect` de control del modal ahora incluye `hubData?.contractAccepted` y `hubData?.bankAccountConfigured` en sus dependencias, garantizando que el modal se **re-abra automáticamente** si los pasos mandatorios están incompletos, aunque el conductor haya marcado `hasSeenOnboarding='1'` en `localStorage`.
- **Fix — Divulgación ITBIS**: El paso `payment` del modal ahora muestra explícitamente `(ITBIS 18% incluido)` junto al monto de RD$6,000.
- **Fix — Versión**: Footer del Driver Dashboard corregido de `v11.0.0` a `v12.0.0`.
- **UI PREMIUM — BankForm.tsx** (Rediseño completo):
  - Nuevo diseño glassmorphic-industrial coherente con el resto del portal de conductores.
  - Selector de banco con **tarjetas interactivas** (BPD, BHD, BR, Scotiabank, APAP) en lugar de `<select>` genérico. Acentos amarillo TAD al seleccionar.
  - **Step track indicator** de 5 pasos con colores de estado (amarillo = activo, verde = completado, gris oscuro = pendiente).
  - Inputs con `inputMode="numeric"` / `type="tel"` para mejor UX en tablets Android.
  - **Pantalla de confirmación offline** con animación de éxito cuando el formulario se encola sin red.
  - Spinner de loading en el botón "Guardar" durante el submit.
  - Banner de alerta `WifiOff` cuando el dispositivo está sin conexión.
- **Archivos tocados**:
  - `apps/driver/pages/driver/dashboard.tsx`
  - `apps/driver/components/BankForm.tsx`

## [v12.1.2] - 2026-05-20

### 🎨 UI/UX & AUTH: Refactorización Premium de Portales (Glassmorphism)
- **Cambio**: Rediseño completo de las pantallas de login (Admin, Anunciante y Conductor) unificando la identidad visual hacia un Glassmorphism Oscuro con acentos en TAD Yellow (#facc15).
- **Mejoras UX/UI**: Detección de Bloqueo de Mayúsculas, Toggle de visibilidad de contraseña, protección *double-submit* mediante loaders nativos, y banners de error explícitos.
- **Lógica de Autenticación**:
  - `Dashboard Admin` y `Portal Anunciante` centralizados en `PortalAuth` asegurando el flujo nativo JWT/Cookies de Supabase (uso estricto de `email`).
  - `Portal Conductor` refactorizado en un componente dedicado sin dependencias de `PortalAuth`, garantizando el uso exclusivo de `phone` (tipo `tel`) y enrutando correctamente a `/api/proxy/drivers/login`.
- **Archivos tocados**:
  - `packages/ui/components/PortalAuth.tsx`
  - `apps/driver/pages/driver/login.tsx`
  - `apps/advertiser/pages/login.tsx`

## [v12.1.1] - 2026-04-27


### 🛡️ Driver Critical Patch (Easypanel + Offline-First)

- **Networking/CORS (403 Fix):**
  - Endurecido `apps/api/src/main.ts` con allow-list estricta de orígenes y `credentials: true`.
  - Incluido explícitamente `https://proyecto-ia-tad-driver.rewvid.easypanel.host` en validación CORS productiva.
- **Proxy Contract (Docker/Easypanel):**
  - Refactor de `apps/driver/next.config.ts` para rewrite estable de `/api/proxy/:path*` hacia `BACKEND_URL` normalizada.
  - Refuerzo de `apps/driver/pages/api/proxy/[...path].ts` con forwarding de `cookie`, `x-forwarded-host`, `x-forwarded-proto` y respuesta CORS con credenciales.
  - Eliminadas rutas directas al backend en cliente (`packages/services/api.ts` y hook de telemetría), consolidando `/api/proxy` como única vía.
- **PWA Resilience (404/Offline):**
  - `apps/driver/public/manifest.json` migrado a rutas relativas para despliegue consistente en contenedores Docker.
  - Service Worker del Driver actualizado a estrategia **Stale-While-Revalidate** para assets del Dashboard (`/driver/dashboard`, `/_next/static`, scripts/styles/images/fonts).
- **Sync Engine (GPS & Pendientes):**
  - `apps/driver/hooks/useTelemetry.ts` ahora expone `syncPending()` para procesar cola offline por lotes en `fleet/track-batch`.
  - Persistencia y progreso de sincronización mantenidos en `localStorage` sin bloqueo de interfaz.
  - Ante fallo de red, estado operativo cambia a **Modo Local** y mantiene reintentos seguros.
- **Meta RD$7,500 (Slots + Ingresos):**
  - `apps/driver/hooks/useDriverHub.ts` normaliza tipos numéricos de payload backend (alineación con Prisma).
  - `apps/driver/pages/driver/dashboard.tsx` calcula progreso real separando ingresos acumulados y slots activos (`activeSlots/maxSlots`) y usa ambos indicadores en el ledger.

## [v12.1.0] - 2026-04-26

### 🎨 UI/UX: Professional Map Specification (MAP-SPEC-2026)

- **Map Icons**: Implemented a new high-fidelity SVG car icon with binary status logic:
  - **Online**: Yellow number/accents (#eab308).
  - **Offline**: Red number/accents (#dc2626).
- **Orientation Control**: Added fixed TAD Yellow (#fad400) front headlights to distinguish car orientation from the red taillights.
- **Theme Awareness**: Dynamic car body color (White for Dark Mode maps, Black/Dark for Light Mode/OSM tiles).
- **Platform Sync**: Synchronized the new specification across **Admin**, **Advertiser**, and **Driver** applications (both MapView and MonitoringMap components).
- **Aesthetics**: Integrated glassmorphism, pulse animations for active devices, and high-contrast styling for premium visualization.

## [v12.0.0] - 2026-04-23

### 💎 ARCHITECTURE: Master Engineering Specification (EMS) V1.0

- **Cambio**: Elevación del sistema a arquitectura de alta disponibilidad con PostGIS para telemetría.
- **Finanzas**: Lógica de RD$500 por anuncio y RD$500 por venta blindada con transacciones atómicas.
- **Integración**: Definido el "Mirror Mode" para que el Admin gestione el Driver Hub directamente.
- **Infra**: Configuración de límites de recursos Docker para estabilidad en Easypanel.

### 🛡️ SECURITY & ARCHITECTURE: Anti-Error Protocol (Zero-Trust)

- **Cambio**: Integración de directivas estrictas de mitigación de errores para el Agente IA.
- **Backend**: Obligatoriedad de transacciones atómicas (`$transaction`) e Idempotency Keys para evitar duplicación de pagos.
- **Frontend**: Colas en IndexedDB para manejo offline y validación Zod para datos bancarios.
- **Estandarización**: Tabla global de códigos de error para manejo uniforme en la UI.

### Financial, Telemetry & Referral (TAD-DRIVER V12)

- **Financial Logic**: Implemented the V12 compensation formula ($Earnings = \min(Ads, 15) \times 500 + CPA \times 500$). Added atomic transaction support for withdrawals.
- **Telemetry System**: Created `useBackgroundTelemetry` hook with 5-minute debounce and background sync to minimize battery drain. Implemented batch sync in the API.
- **Referral System**: Automated unique referral code generation and QR-code payload for advertiser recruitment.
- **Banking (Offline-First)**: New 5-step bank account registration with `localStorage` persistence and auto-retry on reconnection.
- **Database**: Updated schema with `ActiveAd`, `Commission`, and `Telemetry` models. Added `walletBalance`, `referralCode`, and `bankAccount` to the `Driver` model.

## [v10.0.0] - 2026-04-11

### Microservices Stabilization & Fleet Realtime Sync

- **Architecture (Microservices)**: Final stabilization of the `tad-remotion` service. Added native Linux dependencies (`libatk-bridge`, etc.) to the Docker container for consistent rendering on headless VPS environments. Optimized Docker build to include Chromium binary installation.
- **Fleet Synchronization**: Integrated `Supabase Realtime` for instantaneous command broadcasting. Implemented the `WAKE_UP_CALL` event in the Tablet Player for 1-second sync latency.
- **Advertiser Portal (BI v6.0)**: Fully operational BI v6.0 with premium dark-mode interface, conversion tracking maps (Heatmaps), and automated billing reports. Resolved all 404 routing errors.
- **Driver Portal (Service Tools)**: Implemented functional tool modals for "Technical Support" and "Driver Referrals". Integrated with the backend via `/portal-requests` API.
- **Authentication (Auth UX)**: Stabilized the password-reset and onboarding mechanism. Enforced HS256 local JWT validation to reduce API latency.
- **Infrastructure (EasyPanel)**: Migrated all services to VPS via EasyPanel with strict RAM capping (512MB/1024MB) to ensure performance on the free tier.

## [v9.0.0] - 2026-04-09

### Microservices Migration & Video Engine

- **Architecture (Microservices)**: Successfully decoupled the video generation engine into a standalone service `apps/tad-remotion`. This isolates heavy Chromium/FFMPEG processes, ensuring the main API remains responsive.
- **Backend (Auth Security)**: Enhanced RolesGuard to handle @Public routes correctly when class-level roles are defined. This fixes a critical 403 issue on login/register endpoints.
- **Backend (Advertiser Onboarding)**: Implementado un robusto flujo de reset-password y feedback de login mejorado.
- **UI (Status & Transparency)**: Deployed a premium Glassmorphism landing page for the `tad-remotion` microservice.
- **Dependency Management**: Upgraded the entire monorepo to React 19 types.

## [v8.0.0] - 2026-04-08

### UI & Security Optimization

- **Frontend (Layout & UX)**: Resolved a critical depth-sorting issue (z-index) where the top search bar obscured the brand identity and navigation nexus.
- **Backend (Auth Core)**: Stabilized SupabaseAuthGuard by explicitly enforcing HS256 validation.
- **Backend (Observability)**: Refactored LoggerMiddleware to provide clean, human-readable HTTP audit logs.
- **Integration (Operational Sync)**: Restored and verified the Google Sheets integration.

---
**Status**: STABLE.
