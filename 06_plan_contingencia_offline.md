# 🛡️ 06 — PLAN DE CONTINGENCIA OFFLINE (TÚNELES Y ZONAS MUERTAS)

> **Autor**: Senior Architect / SRE
> **Alcance**: Entornos intermitentes (Redes móviles en RD, túneles, zonas rurales).
> **Criticidad**: ALTA. La pérdida del tracking GPS o de los comprobantes de reproducción (Proof-of-Play) representa fuga de capital directo (RD$).

---

## 🛑 EL PROBLEMA: LA RED DE RD NO ES GARANTÍA

El ecosistema TAD depende de que la tablet (vía gateway móvil) reporte reproducciones al backend (Prisma -> Supabase).
¿Qué pasa cuando el taxi 074 cruza el túnel de las Américas por 3 minutos o se adentra en un barrio sin línea 4G?

Si usamos peticiones HTTP bloqueantes o `await axios.post()` directo:

* Las excepciones de red bloquean el event-loop de la PWA.
* El conductor pierde registros de GPS (dejando huecos en el mapa).
* Se "queman" logs de anuncios reproducidos (el cliente no nos paga esas impresiones).

---

## 🛠️ LA ARQUITECTURA OFFLINE-FIRST (DOBLE BUFFER)

En lugar de tratar de forzar la conexión, abrazamos la asincronía y el almacenamiento persistente local.

### 1. El Frontend (PWA / Mobile Gateway)

Tanto el reproductor (Tablet) como el tracker GPS (Celular) DEBEN implementar un **Sync Engine Asíncrono**.

**Buffer de SQLite/IndexedDB en la Tablet:**
La capa de persistencia primaria *no es el backend*, es la memoria flash de la tablet.

```javascript
// Pseudocódigo exigido para el OfflineSyncManager
class ProofOfPlayBuffer {
  async trackPlay(campaignId, deviceId) {
    const event = { campaignId, deviceId, timestamp: Date.now(), sync: false };
    await IndexedDB.table('logs').add(event); // Escritura INMEDIATA local
    
    // Dispara Worker sin bloquear el reproductor
    this.backgroundSyncQueue();
  }

  async backgroundSyncQueue() {
    if (!navigator.onLine) return; // Silent kill si no hay red

    const pendingLogs = await IndexedDB.table('logs').where('sync').equals(false).toArray();
    if (pendingLogs.length === 0) return;

    try {
      // BATCH UPLOAD: Mandar array gigante al backend
      await axios.post('/api/analytics/batch', pendingLogs);
      
      // Solo borrar tras ACK HTTP 200
      await IndexedDB.table('logs').bulkDelete(pendingLogs.map(p => p.id));
    } catch (error) {
       // El backend reventó o la conexión se cayó en medio.
       // Hacemos rollback silencioso. Los datos siguen seguros en IndexedDB.
    }
  }
}
```

### 2. El Backend (Resiliencia en NestJS/Prisma)

Un batch gigante de 1,500 reproducciones acumuladas por un taxi que estuvo 4 horas desconectado puede matar a Prisma si se insertan con queries individuales.

**Regla Cero de Prisma en Ingestas Masivas**: Jamás uses `create()` dentro de un bucle `for`. Usa **`createMany()`**.

```typescript
// backend/src/modules/analytics/analytics.service.ts
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async processBatchOffline(logs: CaptureLogDto[]) {
    // 1. Prisma createMany es una única operación atómica en Supabase
    // Evita agotar el connection pool.
    const result = await this.prisma.analyticsEvent.createMany({
      data: logs.map(l => ({
        campaignId: l.campaignId,
        deviceId: l.deviceId,
        timestamp: new Date(l.timestamp), // Respeta el timestamp original, NO el current_time
        metrics: l.gpsCoords // Inyecta el JSON
      })),
      skipDuplicates: true // Vital si el frontend re-envía por Timeout en la red
    });

    return { processed: result.count };
  }
}
```

---

## ⚡ 3. GESTIÓN DE ESTADOS EN EL "KILL-SWITCH" (MOROSIDAD)

El backend dicta si un chofer pagó los RD$6,000.
¿Qué pasa si el chofer bloqueado simplemente *apaga sus datos móviles* para evitar que la tablet reciba la señal de bloqueo y seguir operando?

**Solución Hardcodeada (Offline TTL)**:
La tablet funciona en base a "Tickets Temporales" delegados.

1. El JWT del backend hacia la tablet debe contener una fecha de expiración `exp` fijada al final del ciclo pagado, o un TTL máximo de 24h.
2. Si el conductor apaga la red:
   * El Worker PWA detecta que ha pasado el TTL de 24h sin un *Handshake* válido del servidor.
   * La PWA ejecuta un `SELF_DESTRUCT` automático: Pantalla negra con el logo de "Conecte a Internet para Validar".

Esto anula completamente los ataques de "Ghosting" por parte de choferes morosos.

---

## 🔒 4. RESUMEN DE RESPONSABILIDADES PWA

1. **Jamás borrar un dato local** sin recibir un código HTTP `2xx`.
2. **Batching obligatorio**: Los endpoints `track-batch` y `analytics-batch` son la única vía. Bloquea CORS para intentos singulares si es necesario.
3. El frontend confía en el `timestamp` original de cuando ocurrió el evento offline. El backend **DEBE MUTARLO** a tipo Date en Prisma. No sobreescribir con `Date.now()` en el backend, o las analíticas mensuales de los anunciantes se distorsionarán y perderán congruencia.
