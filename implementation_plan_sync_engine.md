# 🔧 IMPLEMENTATION PLAN: Sync Engine & Player PWA Stabilization

**Fecha:** 2026-07-11  
**Autor:** Hermes SRE Agent  
**Alcance:** Backend (NestJS) + Player PWA (apps/player)  
**Estado:** ⏳ Pendiente de aprobación

---

## 1. DIAGNÓSTICO: Brechas entre Código Actual y Reglas de Negocio

### 🟢 FUNCIONANDO CORRECTAMENTE (No tocar)

| Componente | Estado | Evidencia |
|:---|:---|:---|
| ETagging en `/sync/:deviceId` | ✅ Implementado | `sync.controller.ts:44-48` — HTTP 304 `If-None-Match` vs `manifest.etag` |
| ETag hash MD5 del manifiesto | ✅ Implementado | `sync.service.ts:244-245` — `crypto.createHash('md5')` sobre `campaign_id-updatedAt` |
| Kill-Switch 402 en `/sync/` | ✅ Implementado | `sync.controller.ts:37-42` — 402 + `Cache-Control: no-store` |
| Materialized View `mv_active_campaigns` | ✅ Implementado | `sync.service.ts:165-178` + `campaign.service.ts:434-447` — `$queryRaw` con fallback legacy |
| PlaybackQueue con IndexedDB | ✅ Implementado | `playback-queue.ts` — Buffer local + batch flush + triim anti-OOM |
| CacheManager dual-layer (IndexedDB + Cache API) | ✅ Implementado | `cache-manager.ts:33-80` — 3-tier fallback |
| WAKE_UP_CALL → executeFullSync | ✅ Implementado | `sync-manager.ts:230-232` — Realtime listener → full sync |
| FORCE_SYNC command queue | ✅ Implementado | `campaign.service.ts:218-225` — `deviceCommand.createMany` + broadcast |
| 15-slot limit en backend | ✅ Implementado | `sync.service.ts:232` + `campaign.service.ts:521` — `.slice(0, 15)` + `BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER` |
| JWT 48h offline license | ✅ Implementado | `device.service.ts:431-440` — `expiresIn: '48h'` |
| Watchdog timer en PlaylistEngine | ✅ Implementado | `playlist-engine.ts:299-305` — duration+5s timeout → force transition |
| Schedule-aware playlist filtering | ✅ Implementado | `playlist-engine.ts:69-108` — day/hour filtering con fallback 24/7 |

### 🔴 BRECHAS CRÍTICAS (Requieren Acción)

#### BRECHA #1: **WAKE_UP_CALL sin filtro de targets — Saturación de API Gateway**
- **Archivo:** `apps/api/src/modules/campaign/campaign.service.ts:95, 166, 228, 378, 617`
- **Problema:** El `broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {...})` se envía a TODOS los dispositivos suscritos al canal `fleet_sync`, sin filtrar por `targets`. Cuando se actualiza una campaña asignada a 5 tablets, las otras 95 tablets de la flota también reciben el `WAKE_UP_CALL` y ejecutan `executeFullSync()` innecesariamente, saturando el API Gateway con 100 peticiones simultáneas de `/device/sync`.
- **Impacto:** OOM potencial en EasyPanel (512MB API), latencia escalada, degradación del servicio.
- **Regla Violada:** "El WAKE_UP_CALL debe desencadenar un FORCE_SYNC correctamente **sin saturar** el API Gateway" (Criterio de Éxito #3).

#### BRECHA #2: **SyncManager ejecuta `executeFullSync()` sin debounce tras WAKE_UP_CALL**
- **Archivo:** `apps/player/src/sync-manager.ts:230-232`
- **Problema:** Cada `WAKE_UP_CALL` dispara `this.executeFullSync()` inmediatamente. Si el backend envía múltiples eventos rápidos (ej: `campaign_updated` + `media_asset_added` en secuencia), el Player lanza múltiples fetches `/device/sync` en paralelo sin debounce.
- **Impacto:** Peticiones duplicadas, race conditions en caché de IndexedDB.
- **Regla Violada:** Criterio de Éxito #3 (saturación).

#### BRECHA #3: **`device.service.ts:checkSubscriptionStatus()` siempre retorna `blocked: false`**
- **Archivo:** `apps/api/src/modules/device/device.service.ts:257-286`
- **Problema:** El método `checkSubscriptionStatus` tiene un comentario explícito: `"Siempre permitir reproducción sin importar el estado de suscripción"` y siempre retorna `{ blocked: false }`. Aunque el endpoint `/sync/:deviceId` (SyncService) SÍ implementa el kill-switch correctamente, y el `SubscriptionGuard` en `device.controller.ts:41` bloquea con 402, el método `deviceHeartbeat()` (línea 223-238) detecta morosidad pero NO bloquea — solo notifica.
- **Impacto:** Discrepancia arquitectural. El heartbeat no bloquea al driver moroso. Si el Playeruelve a usar `/device/sync` en lugar de `/sync/:deviceId` (por ejemplo si el manifest endpoint falla), el kill-switch no se activa. **Pero** el `SubscriptionGuard` ya está aplicado al endpoint `/device/sync` (línea 41 del controller), así que el guard bloquea antes de llegar al service.
- **Severidad:** Media — el guard compensa, pero el service interno es inconsistente. `syncDeviceCampaigns` (línea 373) llama a `checkSubscriptionStatus` que nunca bloquea.

#### BRECHA #4: **Player No valida expiración del JWT offline (Self-Destruct)**
- **Archivo:** `apps/player/src/sync-manager.ts` + `apps/player/src/killswitch.ts`
- **Problema:** El plan de contingencia offline (doc `06_plan_contingencia_offline.md` sección 3) exige que la tablet detecte cuándo su JWT ha expirado tras 48h sin handshake válido del servidor y ejecute un `SELF_DESTRUCT` (pantalla negra "Conecte a Internet para Validar"). Actualmente:
  - El `SyncManifest` retorna `licenseToken` y `expiresAt` pero el `SyncManager` **no persiste ni evalúa** estos campos.
  - El `KillSwitchEnforcer` tiene un TTL de 24h para caché del kill-switch (línea 24), pero NO hay lógica que valide la expiración del JWT de licencia offline.
  - Si la tablet pierde red por >48h, el Player sigue reproduciendo indefinidamente con la playlist cacheada sin verificar la validez de la licencia.
- **Impacto:** Violación del invention anti-ghosting para choferes morosos. Un conductor puede apagar sus datos móviles y seguir operando indefinidamente.
- **Regla Violada:** Regla #1 (Offline-First 48h), Criterio de Éxito #1 (Offline-First Resilience).

#### BRECHA #5: **`SyncService.getDeviceManifest` carga campañas completas en RAM**
- **Archivo:** `apps/api/src/modules/sync/sync.service.ts:182-191`
- **Problema:** Tras obtener los `campaignIds` de la vista materializada, el servicio hace `findMany` incluyendo `media: true, mediaAssets: { select: mediaAssetSafeSelect }, videos: true`. Con 15 campañas × N assets por campaña, esto trae a RAM todos los registros completos. Aunque el límite de 15 slots reduce el riesgo, cada campaña puede tener múltiples media assets, y la consulta no tiene un `LIMIT` en SQL.
- **Impacto:** Potencial OOM en microservicio de 512MB con flota grande.
- **Regla Violada:** Regla #6 (RAM caps 512MB API), Criterio de Éxito #2 (Anti-OOM).

#### BRECHA #6: **Eviction de IndexedDB no libera Object URLs**
- **Archivo:** `apps/player/src/cache-manager.ts:113-132`
- **Problema:** `evictStaleAssets` borra entraciones de IndexedDB pero no llama `URL.revokeObjectURL()` para los blob URLs previamente creados. El `PlaylistEngine` usa `URL.createObjectURL(blob)` para fuentes de video pero nunca revoca esos URLs. Tras múltiples syncs, los blob URLs filtrados acumulan memoria.
- **Impacto:** Memory leak gradual en la tablet.
- **Regla Violada:** Resiliencia general del Player.

---

## 2. PLAN DE REFATORACIÓN

### Fix #1: Filtrar WAKE_UP_CALL por `targets` en el Player
- **Archivo:** `apps/player/src/sync-manager.ts`
- **Cambio:** El callback del WAKE_UP_CALL debe verificar si el `payload.targets` incluye el `deviceId` local antes de ejecutar `executeFullSync()`. Si `targets` está vacío o ausente, ejecutar sync (comportamiento legacy para broadcast global).
- **Riesgo:** Bajo — solo añade un guard condicional.

### Fix #2: Debounce de WAKE_UP_CALL en SyncManager
- **Archivo:** `apps/player/src/sync-manager.ts`
- **Cambio:** Introducir un debounce de 3-5 segundos en `executeFullSync` cuando es disparado por WAKE_UP_CALL. Si llegan múltiples eventos en ráfaga, solo ejecutar el último.
- **Riesgo:** Bajo — patrón estándar de debounce.

### Fix #3: Sincronizar `checkSubscriptionStatus` con política de kill-switch
- **Archivo:** `apps/api/src/modules/device/device.service.ts`
- **Cambio:** El método `syncDeviceCampaigns` (línea 373) llama a `checkSubscriptionStatus` que nunca bloquea. Aunque el `SubscriptionGuard` ya bloquea via HTTP 402 antes de llegar al service, el `syncDeviceCampaigns` debe ser consistente: si el driver no ha pagado, retornar `{ blocked: true, reason: 'subscription_unpaid' }` en lugar de continuar. Esto alinea el service con el guard y con el `SyncService.getDeviceManifest`.
- **Riesgo:** Medio — hay comentarios explícitos que dicen "Permitido por política TAD". **Aclaración:** El guard ya bloquea, así que este cambio es defensivo (consistencia interna). Si la política de TAD es realmente "no bloquear en heartbeat pero sí bloquear en sync", entonces el problema ya está resuelto por el guard. Se deja el cambio como defensa en profundidad.

### Fix #4: Validación de JWT Offline + Self-Destruct en Player
- **Archivos:** `apps/player/src/sync-manager.ts`, `apps/player/src/killswitch.ts`
- **Cambio:** 
  1. Persistir `licenseToken` y `expiresAt` del manifest en `localStorage` tras cada sync exitoso.
  2. Iniciar un timer que evalúa cada 5 min si `Date.now() > expiresAt`.
  3. Si el JWT ha expirado y la tablet está offline, activar el KillSwitch con motivo `'OFFLINE_LICENSE_EXPIRED'` (pantalla negra "Conecte a Internet para Validar").
  4. Si la tablet está online y el JWT expira, forzar `executeFullSync()` inmediatamente (refrescar licencia).
- **Riesgo:** Medio — afecta el flujo offline, pero el comportamiento es el especificado en el doc `06`.

### Fix #5: LIMIT en consulta de campañas del SyncService
- **Archivo:** `apps/api/src/modules/sync/sync.service.ts`
- **Cambio:** Modificar el `$queryRaw` para incluir `LIMIT 15` en la consulta SQL, y en el `findMany` de Prisma mantener el `.slice(0, 15)` como defensa adicional. Esto reduce la memoria cargada desde Postgres.
- **Riesgo:** Bajo — el slice ya existe, añadir el LIMIT en SQL solo evita traer registros de más.

### Fix #6: revokeObjectURL en evicción de caché
- **Archivo:** `apps/player/src/cache-manager.ts`
- **Cambio:** Mantener un `Set<string>` de blob URLs activos. Al evictar o reemplazar un asset, llamar `URL.revokeObjectURL()` para liberar memoria.
- **Riesgo:** Bajo — mejora de memory hygiene.

---

## 3. ORDEN DE EJECUCIÓN

1. **Fix #5** (LIMIT SQL) — Backend, bajo riesgo, mejora inmediata de RAM
2. **Fix #1** (Filtro targets en WAKE_UP_CALL) — Player, bajo riesgo
3. **Fix #2** (Debounce WAKE_UP_CALL) — Player, bajo riesgo
4. **Fix #6** (revokeObjectURL) — Player, bajo riesgo
5. **Fix #4** (JWT Offline Self-Destruct) — Player + KillSwitch, riesgo medio
6. **Fix #3** (Consistencia checkSubscriptionStatus) — Backend, riesgo medio, defensa en profundidad

---

## 4. CRITERIOS DE SALIDA (Verificación post-fix)

- [ ] `tsc --noEmit` pasa sin errores nuevos en `apps/api` y `apps/player`
- [ ] El `$queryRaw` en `sync.service.ts` incluye `LIMIT 15`
- [ ] El `SyncManager` filtra WAKE_UP_CALL por `targets` antes de sync
- [ ] El `SyncManager` aplica debounce de 5s en WAKE_UP_CALL
- [ ] El Player persiste `expiresAt` y valida expiración del JWT offline
- [ ] El KillSwitch activa pantalla negra tras expiración offline
- [ ] `CacheManager` revoca Object URLs al evictar assets
- [ ] `syncDeviceCampaigns` retorna `blocked: true` si suscripción no pagada

---

## 5. PAUSA — SOLICITUD DE APROBACIÓN

> **Hermes Agent:** He completado el reconocimiento y el diagnóstico.  
> **No se ha modificado ninguna línea de código.**  
> Solicito aprobación para proceder al Bucle Autónomo de Ejecución (Fase 3).  
> Si encuentra un error crítico evidente que justifique ejecución inmediata, indíquelo.
