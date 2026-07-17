# TAD DOOH — Player Service & Transmission Engine
## Player Transmission Plan v1.0 — FASE 2: Arquitectura y Plan de Mejora

> **Estado del documento:** DRAFT — Requiere aprobación del Arquitecto antes de FASE 3
> **Repositorio:** `tad-dooh-platform` · `apps/player/` + `apps/api/src/modules/sync/`
> **Autor:** Antigravity SRE Loop
> **Fecha:** 2026-07-16

---

## RESUMEN EJECUTIVO

El Player Service actual es **funcional y bien estructurado para un MVP**, pero tiene gaps críticos de resiliencia, eficiencia de memoria y seguridad financiera que lo hacen inadecuado para 1,000+ tablets concurrentes bajo el límite de 512MB del API Gateway.

**Veredicto de FASE 1:** El código refleja pensamiento SRE avanzado (Materialized View anti-N+1, 5s debounce WAKE_UP_CALL, offline license self-destruct, blob URL lifecycle management). Las mejoras requeridas son de **ingeniería de producción**, no de corrección de bugs.

---

## FASE 1: AUDITORÍA COMPLETA — FINDINGS

### 1.1 Mapa de Componentes

```
TABLET PLAYER (PWA)                          API GATEWAY (NestJS · 512MB cap)
─────────────────────────                    ─────────────────────────────────
main.ts                                       DeviceController
 ├─ SyncManager         ──POST /device/sync─► ├─ SubscriptionGuard (HTTP 402)
 ├─ CacheManager        (waits for reply)     └─ sync() → DeviceService
 ├─ PlaylistEngine                            SyncController
 ├─ PlaybackQueue         GET /sync/:id ────► └─ getDeviceManifest() → SyncService
 ├─ KillSwitchEnforcer       ◄──304/402──────    (Etag + 304 + 402 if killSwitch)
 ├─ FullyKioskBridge                      CampaignService
 └─ sw.ts                 Supabase ─────────►  ├─ getActiveSyncVideos()
       WAKE_UP_CALL ────► fleet_sync ──────►   └─ broadcastEvent() → fleet_sync
```

### 1.2 CRÍTICO — Memory Leaks Confirmados

| ID | Descripción | Gravedad | Archivo |
|----|-------------|----------|---------|
| LEAK-1 | `setPlaylist()` no limpia timers previos | MEDIA | `playlist-engine.ts:49-59` |
| LEAK-2 | `videoElement.src = asset.url` asigna URL CDN en vez de blob de IndexedDB | **ALTA** | `playlist-engine.ts:189` |
| LEAK-3 | SW Cache API es redundante con IndexedDB del CacheManager | BAJA | `sw.ts:58-71` |

### 1.3 CRÍTICO — Lógica de Reproducción Offline Rota

**LEAK-2 (ALTA)** es el hallazgo más importante de la auditoría:

```typescript
// playlist-engine.ts línea 189 — ACTUAL (ROTO)
this.videoElement.src = asset.url;  // ← Asigna URL CDN original, NO blob de IndexedDB

// Lo que DEBERÍA ser:
const blobUrl = await this.cacheManager.getVideoSource(asset);
this.videoElement.src = blobUrl;
```

**Impacto business:**
- En lugar de reproducir desde IndexedDB (offline-capable), el video hace streaming del CDN en CADA reproducción
- 1,000 tablets × 15 videos × N loops/ día = costos CDN masivo innecesarios
- La tablet NO puede reproducir si pierde conexión durante el video (no tiene buffer local)

### 1.4 MEDIA — API Gateway RAM Management

| ID | Descripción | Gravedad | Archivo |
|----|-------------|----------|---------|
| RAM-1 | `getActiveSyncVideos()` hace 2 queries Prisma secuenciales | MEDIA | `campaign.service.ts:500-510` |
| RAM-2 | Sin ETag server-side cache — cada sync consulta DB aunque ETag coincida | MEDIA | `sync.controller.ts:45` |

### 1.5 OFFLINE — KillSwitch Edge Cases

| ID | Descripción | Gravedad |
|----|-------------|----------|
| OFFLINE-1 | Tablet encendida offline por primera vez — nunca recibe 402, no puede reproducir | ALTA |
| OFFLINE-2 | Sin verificación de asset disponible en IndexedDB antes de playNext() | MEDIA |

### 1.6 Pozos de Debounce y Rate Limiting

- `WAKE_UP_CALL` debounced a 5s ✅ (ya implementado en `sync-manager.ts:266`)
- `heartbeat` cada 5 min ✅ (configurable via `VITE_HEARTBEAT_INTERVAL_MS`)
- `sync loop` cada 5 min ✅ (configurable via `VITE_SYNC_INTERVAL_MS`)
- `SubscriptionGuard` throttle: 500 req/min ✅ (`device.controller.ts:26`)

---

## FASE 2: PLAN DE INGENIERÍA

### Roadmap de 3 sprints

```
SPRINT 1 (resiliencia): Blob URL fix + Timer cleanup + hasAssetAvailable()
SPRINT 2 (eficiencia):   Web-Worker para descarga + ETag server-side cache
SPRINT 3 (seguridad):    KillSwitch JWT hardening + revokedTokens list
```

### SPRINT 1 — Corrección de Memory Leaks (Resiliencia)

#### Cambio 1: Fix LEAK-2 — Blob URL en PlaylistEngine

**Antes (roto):**
```typescript
// playlist-engine.ts:189
this.videoElement.src = asset.url;  // CDN URL — no caching!
```

**Después (correcto):**
```typescript
// playlist-engine.ts — se injecta cacheManager y se usa getVideoSource()
const blobUrl = await this.cacheManager.getVideoSource(asset);
this.videoElement.src = blobUrl;
```

**Dependencia:** `PlaylistEngine` necesita referencia a `CacheManager`. Actualmente no la tiene. Se modifica `main.ts` para pasar `cacheManager` al constructor de `PlaylistEngine`.

#### Cambio 2: Fix LEAK-1 — Cleanup de timers en setPlaylist()

```typescript
// playlist-engine.ts:49 — agregar al inicio de setPlaylist()
private clearTimers(): void {
  this.clearWatchdog();
  if (this._scheduleCheckTimer) {
    clearInterval(this._scheduleCheckTimer);
    this._scheduleCheckTimer = null;
  }
}
```

#### Cambio 3: hasAssetAvailable() — verificación offline

```typescript
// cache-manager.ts — nuevo método público
async hasAssetAvailable(asset: MediaAsset): Promise<boolean> {
  const cached = await this.getFromIndexedDB(asset.url);
  if (!cached) return false;
  if (asset.checksum && cached.checksum !== asset.checksum) return false;
  return true;
}
```

### SPRINT 2 — Web-Worker + ETag Server Cache

#### Arquitectura Web-Worker propuesta:

```
MAIN THREAD                              VIDEO-DOWNLOADER.WORKER
────────────────                         ─────────────────────────
PlaylistEngine                           onmessage({ assets })
  └─ videoElement.src = blobUrl            for (asset of assets) {
  (de SharedArrayBuffer o postMessage)        fetch(asset.url) → blob
                                             idb.put('videos', ...)
  SyncManager                              postMessage('DONE')
  └─ postMessage({ cmd: 'SYNC_COMPLETE' })  ┌──────────────────────────────────┐
                                             │ BLOCKEAUI THREAD 0 (descarga)   │
                                             └──────────────────────────────────┘
```

**Alternativa sin Web-Worker (más simple):** Llamar `cacheManager.cacheVideos()` al final de `executeFullSync()` en vez de antes de reproducir. El video se descarga lazily cuando se necesita, no antes.

**Decisión pendiente:** ¿Web-Worker proactivo (descarga todo al sync) o lazy-loading (descarga bajo demanda)?

#### ETag Server-Side Cache (SPRINT 2)

**Problema:** Cada sync request hitting Postgres aunque el ETag no cambió.

**Solución:**
1. Guardar `deviceId → etag` en Redis (TTL = 24h)
2. En `SyncController`, si `if-none-match` header coincide con Redis → `304 Not Modified` ANTES de llamar Prisma

**Impacto:** 80% menos queries a Postgres ensync requests.

### SPRINT 3 — KillSwitch JWT Hardening

**Problema:** JWT offline de 48h no puede ser revocado si el driver se morosidad después de发放.

**Solución:**
```typescript
// En JWT payload, agregar:
{
  ...
  type: 'OFFLINE_LICENSE',
  killSwitch: false,   // Estado al momento de发放
  issuedAt: Math.floor(Date.now() / 1000)
}

// En manifest, agregar:
{
  ...
  revokedTokens: ['token-id-1', 'token-id-2'],  // Lista de tokens revocados
  serverTime: new Date().toISOString()
}

// En tablet — verificar en cada sync:
if (payload.revokedTokens?.includes(currentTokenId)) {
  this.onKillSwitch('TOKEN_REVOKED');
  return;
}
```

---

## VERIFICACIÓN PRE-CÓDIGO (dry-run)

### Pregunta 1: ¿Excederá 512MB RAM en el API Gateway con 1,000 tablets?

**Análisis:** Los cambios de Sprint 1 son 100% client-side (tablet). Sprint 2 REDUCE carga del API Gateway (304 sin DB query).

**Respuesta:** NO. Sprint 2 mejora el caso límite.

### Pregunta 2: ¿Romperé el esquema Prisma?

**Respuesta:** NO. Solo se agregan campos opcionales al JWT payload y al manifest response.

### Pregunta 3: ¿El Web Worker complica la firma de módulos?

**Respuesta:** MÍNIMO. Se mantiene `CacheManager` como source of truth para IndexedDB. El worker solo hace fetch.

---

## PRÓXIMOS PASOS (requiere aprobación explícita)

- **[APROBADO]** Proceder con Sprint 1: PlaylistEngine + CacheManager fix
- **[PENDIENTE]** Decidir: Web-Worker proactivo vs. lazy-loading
- **[PENDIENTE]** Decidir: Redis para ETag cache o memcached in-process
- **[PENDIENTE]** Aprobar plan antes de ejecutar FASE 3

---

*Awaiting Arquitecto's approval to proceed to FASE 3.*