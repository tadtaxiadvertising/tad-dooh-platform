# Patrones de recuperación y sincronización (reutilizables)

Patrones genéricos aplicables a los flujos offline/offline-first, telemetría, pagos y sincronización de la plataforma TAD. Se usan como referencia de diseño, no como instrucción de paso a paso.

## 1. Operaciones idempotentes

Cada operación susceptible de retry debe ejecutarse con la misma clave de idempotencia sin corromper el estado:

- **Pagos, payouts, compensaciones, webhooks, telemetría, sincronización, creación de campañas, activación, referidos.**
- Pregunta siempre: *¿Qué ocurre si esta request llega dos veces?*
- Respuesta correcta: la segunda llegada devuelve el mismo resultado que la primera (o un estado idéntico), nunca crea "dos cosas".

### Reglas de diseño

1. **Clave idempotency** en el payload o en el encabezado `Idempotency-Key`.
2. Almacena la clave y el resultado en base de datos único (unique constraint).
3. Antes de ejecutar lógica de negocio, consulta la clave: si existe, devuelve el resultado guardado.
4. Los webhooks de terceros no deben confiar en el orden; se almacenan con dedupe.

## 2. Sincronización por lotes (telemetría, GPS, eventos)

Nunca diseñes **1 dispositivo → 1 request → 1 insert** cuando pueda ser **N eventos → batch → sincronización eficiente**:

1. Acumula eventos en almacenamiento local (IndexedDB/SQLite) mientras está offline.
2. En cada reconnect, encola el lote.
3. Envía en un solo request batch; recibe la confirmación de la inserción masiva.
4. Deduplica por `deviceId + entityId + timestamp` (o por `date_trunc(second, timestamp)` en telemetría GPS).
5. Reduce frecuencia de envío y usa compresión; la batería del dispositivo es presupuesto técnico.
6. Implementa retry con backoff exponencial y jitter; no retries infinitos sin límite.

## 3. Ciclo offline-first

```
ONLINE
  ↓
OFFLINE
  ↓
LOCAL QUEUE
  ↓
RECONNECT
  ↓
SYNC
  ↓
RECONCILIATION
```

Puntos que nunca se deben descartar:

- capacidad offline (el dispositivo NO siempre está conectado),
- reintentos con backoff,
- idempotencia,
- deduplicación de eventos,
- resolución de conflictos por versión/timestamp,
- reconección tras cierre inesperado,
- tolerancia a pérdida de red,
- telemetría y reconciliación.

No elimines colas locales ni datos pendientes durante un despliegue.

## 4. Reconciliación de conflictos

- Cada entidad tiene una versión (Columna `version` o `updatedAt` de precisión).
- En el sync, el servidor devuelve el "server version" del recurso.
- El dispositivo solo escribe si su versión es mayor que la recibida (optimistic concurrency).
- Si la versión es menor, el dispositivo descarta su escritura y pide la versión actual.
- Los conflictos resueltos se registran en una tabla `sync_conflicts` (entity, deviceId, clientVersion, serverVersion, winner).

## 5. Heartbeats y conectividad

- El dispositivo envía un heartbeat periódico (`POST /devices/:id/heartbeat`).
- El servidor mantiene un timestamp de último heartbeat; si excede `N` minutos (p. ej. 5), la sesión se marca `stale` → el dispositivo debe volver a autenticar.
- Los endpoints sensibles verifican `isOnline` / `isFresh` antes de procesar.
- El player de tablet ejecuta heartbeats incluso cuando la pantalla está dormida (para mantener la sesión y sincronizar).

## 6. Integridad financiera

- **Ledger inmutable**: cada movimiento es una fila en la tabla `ledger` (id, entityId, type, amount, currency, idempotencyKey, createdAt, version).
- **Balance derivado**: la vista `get_balance` suma el ledger filrado por estado; nunca se trae como única fuente de verdad.
- **Transacciones atómicas**: balance + ledger en la misma transacción.
- **Deduplicación de webhooks**: un webhook recibe `Idempotency-Key`; dos llegadas con la misma clave devuelven el mismo resultado.
- **No se alteren saldos ni registros históricos para corregir una prueba fallida.**

## 7. Patrones de sanitización rápida

- **Esquema EXPAND → MIGRATE → CONTRACT** para cambios de base de datos.
- No migraciones destructivas sin entender datos existentes, compatibilidad, rollback y orden de despliegue.
- Si un endpoint conserva un valor mutable como "historial", prefiere ledger + balance derivado.
- Busca siempre: `EXISTS` (no `SELECT COUNT > 0`), `UPDATE ... WHERE` con filas afectadas verificadas, no `updateAll`.

## 8. Pruebas de regresión

No basta con que un error desaparezca. Se exige:

1. **Test rojo** (falla antes del fix).
2. **Fix** (ahora pasa).
3. **Test verde** (pasó después).
4. La prueba demuestra **idempotencia** y **conservación de invariantes** (especialmente para operaciones financieras).

Solo cuando se verifiquen los 4 pasos se marca el fix como cerrado.
