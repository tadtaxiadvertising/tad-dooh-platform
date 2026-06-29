# 📝 Plan de Refactorización y Auditoría: Telemetría GPS y Sincronización de Contenidos

## 1. Diagnóstico Técnico Actual

Tras realizar una auditoría de código profundo (Whitebox) sobre el hook `useBackgroundTelemetry` (Driver PWA) y el `SyncService` / `SyncController` (NestJS Backend), se han detectado inconsistencias críticas que amenazan el límite de recursos de EasyPanel y las reglas de negocio establecidas:

### A. Telemetría GPS (`useBackgroundTelemetry.ts`)
- 🔴 **Falla de Persistencia y Buffer Local:** Actualmente el hook captura las coordenadas, pero en lugar de acumularlas en memoria local (buffer) durante el periodo de debounce, solo envía el *último* punto al pasar los 5 minutos. Toda la trayectoria intermedia (vital para Heatmaps) se pierde completamente. Tampoco cuenta con un sistema de reintentos (`IndexedDB` o `localStorage`) en caso de error de red (pérdida 4G).
- 🔴 **Falso Bypass de API Gateway:** Aunque el documento SRE exige inserción directa por PostgREST para evitar penalizar el backend de Node.js, el código hace un fetch HTTP tradicional hacia `/api/proxy/fleet/track-batch`, saturando la memoria del gateway en Node.js de todas formas.

### B. Transmisión de Contenido (`SyncService.ts` y `SyncController.ts`)
- 🔴 **Ausencia de Validación HTTP 304 (ETagging):** Aunque `SyncService` genera el MD5 ETag del manifiesto, `SyncController` *no intercepta* la cabecera `If-None-Match` del cliente, ni detiene la ejecución. El servidor NestJS sigue realizando la consulta SQL completa (`mv_active_campaigns` + Prisma findMany) y serializando el JSON en cada "Heartbeat" (latido), desperdiciando ciclos de CPU.
- 🔴 **Fuga de Inventario (Over-booking):** La regla de negocio dicta un *"Límite estricto de 15 slots por tablet"*. Sin embargo, `SyncService` devuelve todo el arreglo iterado de `playlistMap.values()` sin aplicar `.slice(0, 15)`. Esto puede agotar la memoria de la Tablet en zonas céntricas con muchas campañas geolocalizadas.
- 🔴 **Inyección CDN Incompleta:** No se asegura que los `urls` de video pasen por Cloudflare (`media.tad.do`). Se entrega el enlace directo original del Storage si no hay `cdnUrl`.

---

## 2. Propuesta de Arquitectura de Refactorización

### 2.1 ETagging Inteligente con HTTP 304 (Backend)
Se debe modificar `SyncController` para inyectar `@Headers('If-None-Match')` y pasar el valor al servicio. En `SyncService`, implementaremos caché en memoria (`Map` o `CacheManager`) de los manifiestos por `deviceId`, recalculándolo solo cuando sea necesario, y devolviendo un error HTTP 304 para que Express/Fastify envíe la respuesta sin Body.

### 2.2 Local Buffer y Direct Ingestion (Cliente)
Se debe refactorizar `useBackgroundTelemetry.ts` para que:
1. Agregue puntos geolocalizados a un arreglo en memoria / `localStorage` cada 10 o 30 segundos.
2. Cada 5 minutos (300s), despache **todos** los puntos acumulados (Bulk) directamente a Supabase vía PostgREST usando `supabase.from('telemetry').insert(buffer)` en lugar del `fetch` al API proxy.
3. Se garantice que, tras 402/403, el Kill-Switch limpie este buffer local.

---

## 3. Bloques de Código de Reemplazo Sugeridos

### [MODIFICAR] `apps/api/src/modules/sync/sync.controller.ts`
Implementar lectura de ETag:

```typescript
import { Controller, Get, Param, Headers, HttpException, HttpStatus, Res } from '@nestjs/common';
import { SyncService } from './sync.service';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Public()
  @Get(':deviceId')
  async getDeviceManifest(
    @Param('deviceId') deviceId: string,
    @Headers('if-none-match') ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) throw new HttpException('DEVICE_ID_REQUIRED', HttpStatus.BAD_REQUEST);
    
    const manifest = await this.syncService.getDeviceManifest(deviceId);
    
    // HTTP 304 Not Modified bypass
    if (ifNoneMatch && ifNoneMatch === manifest.etag) {
      res.status(HttpStatus.NOT_MODIFIED).send();
      return; 
    }
    
    res.setHeader('ETag', manifest.etag);
    return manifest;
  }
}
```

### [MODIFICAR] `apps/api/src/modules/sync/sync.service.ts`
Limitar a 15 slots y parsear URLs al CDN.

```typescript
    // En la sección final antes del return (línea ~230)
    let playlist = Array.from(playlistMap.values());
    
    // 3.6 Limitar Slots (Regla de negocio: 15 Máximo)
    playlist = playlist.slice(0, 15);
    
    // 3.7 Inyección de Cloudflare CDN (Si no se ha puesto)
    playlist = playlist.map(item => {
       if (item.url && item.url.includes('supabase.co')) {
          item.url = item.url.replace(/https:\/\/[^\/]+\/storage\/v1\/object\/public/, 'https://media.tad.do');
       }
       return item;
    });

    // 3.8 Calculate Manifest Hash for ETagging
    const manifestContent = activeCampaigns.map(c => `${c.id}-${c.updatedAt.getTime()}`).sort().join('|');
    const etag = crypto.createHash('md5').update(manifestContent).digest('hex');
```

### [MODIFICAR] `apps/driver/hooks/useBackgroundTelemetry.ts`
Creación de buffer local y bypass de API a Supabase Direct.

```typescript
// Dentro de useEffect en useBackgroundTelemetry:
const pointBuffer = useRef<any[]>([]);

watchIdRef.current = navigator.geolocation.watchPosition(
  (position) => {
    if (suspendedRef.current) return;
    const now = Date.now();
    const isOnline = (localStorage.getItem('TAD_DRIVER_STATUS') || 'ONLINE').toUpperCase() === 'ONLINE';

    // 1. Acumular punto en el Buffer
    pointBuffer.current.push({
      driverId,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed || 0,
      timestamp: new Date(position.timestamp).toISOString(),
    });

    // Live ping logic (se mantiene igual...)

    // 2. Debounce de 5 minutos para inserción en lote (Bulk)
    if (now - lastSyncTime.current < 300000) return;
    
    // Evitar envío si el buffer está vacío
    if (pointBuffer.current.length === 0) return;
    
    const payloadToSend = [...pointBuffer.current];
    lastSyncTime.current = now;
    pointBuffer.current = []; // Vaciar buffer local

    // 3. SUPABASE DIRECT INSERT (Bypass API Gateway)
    supabase.from('telemetry').insert(payloadToSend)
      .then(({ error }) => {
        if (error) {
           console.error('[TELEMETRY] Failed direct insert:', error);
           // Restaurar buffer en caso de fallo para no perder la ruta
           pointBuffer.current = [...payloadToSend, ...pointBuffer.current];
           
           // Manejo de Error 402/403 de RLS/Supabase
           if (error.code === '42501') { 
              handleSuspension();
           }
        } else {
           clearSuspension();
        }
      });
  }
);
```
