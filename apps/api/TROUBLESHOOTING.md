# tad-api — Catálogo de Errores Operativos (TROUBLESHOOTING)

> **Servicio:** `tad-api` (NestJS Backend Core)
> **Versión:** v10.0.0
> **Clasificación:** Tier-0
> **Última revisión:** 2026-04-13

---

## Instrucciones de Uso para SRE On-Call

1. **Identificar** el código de error en los logs de EasyPanel o Sentry.
2. **Buscar** en la tabla correspondiente (HTTP, Base de Datos, Infraestructura, o Negocio).
3. **Ejecutar** la acción de mitigación inmediata.
4. **Escalar** si la acción no resuelve en 15 minutos (P0) o 1 hora (P1).

---

## 1. Errores HTTP / API

| Código | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|--------|----------------------|--------------------------------|--------------------------|
| `401 Unauthorized` | Peticiones rechazadas desde cualquier portal (admin, advertiser, driver) | `SupabaseAuthGuard` no pudo verificar el JWT. Posibles causas: (1) `SUPABASE_JWT_SECRET` incorrecto en env, (2) Token expirado, (3) Header `Authorization` no llega al backend por proxy mal configurado | **1.** Verificar `SUPABASE_JWT_SECRET` en env de EasyPanel vs. Supabase Dashboard → Settings → API → JWT Secret. **2.** Verificar que el proxy de Next.js reenvíe `Authorization` header. **3.** Comprobar con: `curl -H "Authorization: Bearer <token>" https://<api>/health` |
| `402 Payment Required` | El celular (Gateway) del conductor recibe rechazo al sincronizar | `SyncService.getDeviceManifest()` detectó que `subscriptionPaid = false` y `subscriptionEnd < now()`. El dispositivo solo recibe campañas globales (Ghost Kill-Switch) | **Esperado si la suscripción está vencida.** Verificar en BD: `SELECT subscription_paid, subscription_end FROM drivers WHERE id = '<driver_id>'`. Si es error: actualizar `subscriptionPaid = true` y `subscriptionEnd` manualmente |
| `403 Forbidden` | Acceso denegado a un endpoint autenticado | `RolesGuard` rechazó porque el rol del usuario no tiene permisos. O el dispositivo tiene `status != 'ACTIVE'` en sync | **1.** Verificar rol del usuario en Supabase Auth metadata. **2.** Para sync: verificar `SELECT status FROM devices WHERE device_id = '<id>'`. **3.** Activar dispositivo si fue desactivado erróneamente |
| `400 Bad Request` | Payload rechazado por la API | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` detectó campos extra o faltantes. El campo exacto aparece en el body de la respuesta | **Verificar** el payload del cliente contra el DTO esperado. Campos comunes: GPS batch debe usar `points[]` (no `locations[]`), con `latitude/longitude/timestamp` |
| `404 Not Found` en `/sync` | Tablet desconocida intenta sincronizar | `SyncService` no encontró el `deviceId` en la tabla `devices`. Se genera alerta automática tipo `WARNING` | **1.** Verificar si el dispositivo fue dado de alta: `SELECT * FROM devices WHERE device_id = '<id>'`. **2.** Si es nuevo: crearlo vía tad-admin. **3.** Si fue eliminado: investigar quién lo borró en audit log |
| `429 Too Many Requests` | Rate limiting activo (no debería ocurrir en v10) | `ThrottlerModule` fue **desactivado** en v10 por memory leaks. Si aparece, hay un guard residual | **Verificar** que `ThrottlerModule` esté comentado en `app.module.ts`. Si persiste, reiniciar contenedor |
| `500 Internal Server Error` | Error no manejado del backend | Múltiples causas: Prisma timeout, Supabase Storage down, N+1 query sin catch | **1.** Consultar Sentry para el stack trace completo. **2.** Revisar logs en EasyPanel: `Container → Logs`. **3.** Los errores frecuentes son Prisma `P2002` (unique constraint) y `P2025` (record not found) |
| `502 Bad Gateway` | El contenedor no responde | Node.js crasheó por OOM o el build output está corrupto (`main.js` no encontrado) | **1.** Verificar en EasyPanel si el contenedor se reinició (OOM Kill). **2.** Revisar que `dist/main.js` o `dist/src/main.js` exista. **3.** Re-deploy con `npm run build` limpio |
| `ECONNABORTED` / Timeout | Peticiones que tardan >30s desde portales | Queries N+1 en módulo de finanzas, o Prisma pool agotado (>5 conexiones simultáneas) | **1.** Verificar `connection_limit=5` en `DATABASE_URL`. **2.** Revisar si `calculateMonthlyPayroll()` está procesando con throttle. **3.** Aumentar timeout del proxy Next.js si es necesario |

---

## 2. Errores de Base de Datos (Prisma / PostgreSQL)

| Código | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|--------|----------------------|--------------------------------|--------------------------|
| `P2002` | `Unique constraint failed` | Intento de insertar registro duplicado. Común en: `PayrollPayment (driverId, month, year)`, `Driver.cedula`, `Driver.phone`, `Advertiser.email` | **Esperado en re-ejecución de nómina** (idempotencia). Verificar que `triggerMonthlyBilling()` haga check de existencia previo. Si es en driver: verificar unicidad de cédula/teléfono |
| `P2025` | `Record to update/delete does not exist` | Se intenta actualizar un dispositivo o driver que fue eliminado entre la lectura y la escritura | **Verificar** si el registro existe. Común después de resets de BD o limpiezas masivas. Agregar `.catch()` defensivo si no existe |
| `P2024` | `Timed out fetching a new connection from the connection pool` | **Pool agotado.** Más de 5 queries simultáneas saturaron `connection_limit=5` | **CRÍTICO.** **1.** Verificar `?connection_limit=5` en `DATABASE_URL`. **2.** Buscar queries sin `await` (fire-and-forget que no liberan conexión). **3.** Reiniciar contenedor para liberar pool. **4.** Verificar que `throttledMap()` se use en todos los bulk operations |
| `P1001` | `Can't reach database server` | Supabase Pooler (:6543) unreachable. Posibles causas: (1) Pooler overloaded, (2) IP no whitelisted, (3) Supabase maintenance | **1.** Verificar estado en [status.supabase.com](https://status.supabase.com). **2.** Verificar que `DATABASE_URL` apunte a pooler (puerto 6543, no 5432). **3.** PrismaService tiene retry automático (5 intentos, backoff exponencial) |
| `P1008` | `Operations timed out` | Query individual excedió el timeout de PostgreSQL | **1.** Identificar la query lenta en Sentry/logs. **2.** Verificar índices en tablas afectadas. **3.** Tablas con índices críticos: `devices(status, lastSeen, driverId)`, `playback_events(deviceId, timestamp, videoId)`, `driver_locations(driverId+timestamp)` |
| `MV Refresh Error` | `Materialized view has not been populated` | Primer refresh de `mv_active_campaigns` requiere `REFRESH` sin `CONCURRENTLY` | **Automáticamente manejado** en `PrismaService.refreshActiveCampaignsView()` con fallback. Si persiste: ejecutar manualmente `REFRESH MATERIALIZED VIEW mv_active_campaigns;` en Supabase SQL Editor |
| `BigInt serialization` | `Do not know how to serialize a BigInt` | Campos como `fileSize` y `storageUsed` son `BigInt` en Prisma pero JSON no los soporta nativamente | **Ya mitigado** en `main.ts` línea 11: `BigInt.prototype.toJSON = function() { return this.toString(); }`. Si reaparece: verificar que el bootstrap no fue modificado |

---

## 3. Errores de Infraestructura (Docker / EasyPanel)

| Código | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|--------|----------------------|--------------------------------|--------------------------|
| `OOMKilled` | Contenedor reiniciado por el kernel | Node.js excedió el límite de RAM. Causas comunes: (1) Procesamiento de video en RAM (violación Directiva 3), (2) Memory leak en bull queue, (3) Prisma pool sin límite | **1.** Verificar `NODE_OPTIONS="--max-old-space-size=850"` en Dockerfile. **2.** Buscar si algún endpoint recibe `multipart/form-data` con videos. **3.** Verificar que `connection_limit=5` esté configurado. **4.** Ejecutar `curl localhost:3000/health` → revisar `memory.heapUsed` |
| `ENOMEM` | `JavaScript heap out of memory` | Similar a OOMKilled pero detectado por V8 antes del kernel kill | **Misma mitigación que OOMKilled.** Adicionalmente, verificar si `pdfmake` está generando PDFs muy grandes (>10 páginas) |
| `ENOSPC` | `No space left on device` | VPS sin espacio en disco. Causas: logs acumulados, imágenes Docker residuales | **1.** En VPS: `docker system prune -af` para limpiar imágenes huérfanas. **2.** Verificar tamaño de logs: `du -sh /var/log/`. **3.** Verificar que `server.log` no crezca sin rotación |
| `Container crash loop` | Contenedor reinicia continuamente | Fallo en `bootstrap()` de `main.ts` — usualmente por env vars faltantes o BD unreachable | **1.** Revisar logs de inicio en EasyPanel. **2.** Verificar `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. **3.** La validación de env con Zod es permisiva (warn, no crash) — si crashea es un error más profundo |
| `npm error: executable` | `Could not determine executable to run` durante build | `npx` no encuentra el binario en el contexto Docker alpine | **Reemplazar** `npx <tool>` con path directo: `./node_modules/.bin/<tool>` en el Dockerfile |
| `dist/main.js not found` | `MODULE_NOT_FOUND` al iniciar | El build output cambió de estructura (`dist/main.js` vs `dist/src/main.js`) | **Ya mitigado** en `package.json` con detección dinámica: `if(fs.existsSync('./dist/main.js')) require(...) else require('./dist/src/main.js')` |

---

## 4. Errores de Negocio / Lógica

| Código | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|--------|----------------------|--------------------------------|--------------------------|
| `PAYROLL_DUPLICATE` | `La nómina para este periodo ya fue generada` | `triggerMonthlyBilling()` detectó un `PayrollPayment` existente para el mismo `(month, year)` | **Esperado.** Es protección de idempotencia. Si necesita re-generar: eliminar registros del periodo en `payroll_payments` y re-ejecutar |
| `NO_DRIVER_LINKED` | `Batch recibido sin chofer vinculado` en logs de GPS | El dispositivo no tiene `driverId` asignado en la tabla `devices`. El batch GPS se descarta | **Asignar** driver al dispositivo: `UPDATE devices SET driver_id = '<driver_uuid>' WHERE device_id = '<hw_id>'` via tad-admin |
| `STALE_MANIFEST` | Tablets reproducen campañas viejas/expiradas | `mv_active_campaigns` no fue refrescada después de aprobar/modificar campañas | **Refrescar** la Materialized View: llamar `POST /api/v1/sync/refresh` o ejecutar `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;` en SQL Editor |
| `ZERO_PAYROLL` | Nómina de conductor = RD$0 pese a tener ads | El driver no tiene `subscriptionPaid = true` o no hay `PlaybackEvent(play_confirm)` registrados para sus dispositivos | **1.** Verificar suscripción: `SELECT subscription_paid, subscription_end FROM drivers WHERE id='...'`. **2.** Verificar playbacks: `SELECT COUNT(*) FROM playback_events WHERE device_id IN (SELECT device_id FROM devices WHERE driver_id='...')` |
| `SIGNED_URL_FAIL` | `Supabase returned no signed URL` | Bucket `ads-videos` no existe o Supabase Storage tiene permisos incorrectos | **1.** Verificar que el bucket existe en Supabase Dashboard → Storage. **2.** Verificar `SUPABASE_SERVICE_ROLE_KEY` (debe ser Service Role, no Anon Key). **3.** El servicio intenta auto-crear el bucket, pero si falla silenciosamente, crearlo manualmente |
| `CONNECTIVITY_ISSUE` | Dispositivos marcados con `connectivity_issue` después de 48h | CRON `checkOfflineDevices()` detectó que `lastSeen < now() - 48h` | **1.** Contactar al conductor vía WhatsApp (alertas automáticas ya enviadas). **2.** Verificar si la tablet tiene WiFi/datos activo. **3.** Verificar si el celular del conductor tiene batería/datos. **4.** Si el equipo fue devuelto/perdido: marcar como `INACTIVE` |
| `CORS_BLOCKED` | `Not allowed by CORS` desde un portal | El origen de la petición no está en `CORS_ORIGIN` y no es `*.easypanel.host` | **Agregar** el dominio a `CORS_ORIGIN` en las variables de entorno de EasyPanel (CSV). Reiniciar contenedor |
| `INVOICE_GEN_FAIL` | Error al generar factura PDF de morosidad | `pdfmake` falló por datos faltantes en el driver (nombre null, placa null) | **Verificar** que el driver tiene `fullName` y `taxiNumber` poblados. `InvoiceService.generateDebtInvoicePDF()` debería tener defaults ('Socio TAD', 'S/N') |

---

## 5. CRON Failures

| Síntoma | CronJob Afectado | Causa | Mitigación |
|---------|-----------------|-------|------------|
| Dispositivos nunca se marcan offline | `checkOfflineDevices` (cada 30 min) | El contenedor se reinició y el CRON no se reagendó correctamente | **Verificar** que `ScheduleModule.forRoot()` esté en `app.module.ts`. El `onModuleInit()` del `MonitoringService` ejecuta un recovery check al arrancar |
| Morosidad no detectada | `checkHighDelinquency` (diario 3AM) | Query fallida por pool exhaustion o Supabase maintenance a las 3AM | **Ejecutar manualmente** via endpoint admin o llamar `FinanceService.checkHighDelinquency(new Date())` desde un script ad-hoc |
| WhatsApp alerts no enviadas | `checkOfflineDevices` | `WhatsAppService` falló (API key inválida, rate limited, o servicio caído) | **Verificar** credenciales de WhatsApp API. Las alertas se loguean aunque fallen: buscar `Error enviando push` en logs |

---

## Comandos de Diagnóstico Rápido

```bash
# 1. Estado del servicio
curl -s https://<api-url>/health | jq .

# 2. Memoria actual del contenedor
curl -s https://<api-url>/health | jq '.memory.heapUsed / 1048576 | floor' 
# → Debe ser < 400 (MB)

# 3. Verificar conexión a BD (desde dentro del contenedor)
docker exec <container_id> node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRaw\`SELECT 1 as ok\`.then(r => { console.log('DB OK:', r); p.\$disconnect(); }).catch(e => console.error('DB FAIL:', e.message));
"

# 4. Verificar Materialized View
# En Supabase SQL Editor:
SELECT COUNT(*) FROM mv_active_campaigns WHERE active = true AND start_date <= NOW() AND end_date >= NOW();

# 5. Verificar pool de conexiones
# En Supabase SQL Editor:
SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';
# → Debe ser ≤ 5 para tad-api

# 6. Forzar refresh de manifest
curl -X POST https://<api-url>/api/v1/sync/refresh -H "Authorization: Bearer <admin_token>"
```

---

## Escalamiento

| Nivel | Criterio | Acción |
|-------|---------|--------|
| **P0 (Inmediato)** | API completamente caída (OOM, crash loop), Nómina calculada incorrectamente | Reiniciar contenedor. Notificar al equipo. Si es nómina: congelar pagos hasta auditoría |
| **P1 (1 hora)** | Sync de tablets fallando, GPS no se registra, Morosidad no detectada | Diagnosticar vía Sentry + logs. Ejecutar recovery manual de CRONs |
| **P2 (4 horas)** | Métricas BI no se actualizan, WhatsApp alerts fallan, Swagger caído | Investigar root cause. No afecta operación core |
