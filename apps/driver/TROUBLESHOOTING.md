# tad-driver — Catálogo de Errores Operativos (TROUBLESHOOTING)

> **Servicio:** `tad-driver` (Next.js 15 — Portal del Conductor & Mobile Gateway)
> **Versión:** v10.0.0
> **Clasificación:** Tier-0 (Infraestructura de Flota)
> **Última revisión:** 2026-04-13

---

## Instrucciones de Uso para SRE On-Call

1. **Identificar** si el error es del **Dashboard** (conductor accede vía browser) o del **Mobile Gateway** (check-in QR).
2. **Clasificar** usando las tablas: Telemetría/GPS, Kill-Switch/402, Auth, Dashboard/UI, Gateway, Build.
3. **Ejecutar** mitigación inmediata.
4. **Diagnóstico rápido:** `GET /api/proxy/_proxy_health`.

> **⚠️ PRIORIDAD MÁXIMA:** Errores en el Mobile Gateway (`/check-in`) afectan directamente la telemetría de toda la flota y, por extensión, el cálculo de nómina.

---

## 1. Errores de Telemetría y GPS

> Motor de telemetría embebido en `dashboard.tsx` — corre en background via `navigator.geolocation.watchPosition()`.

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `PositionError.PERMISSION_DENIED` | Navegador no reporta GPS | El conductor no dio permisos de ubicación al browser. O el browser revocó permisos por policy | **No es error del sistema.** El conductor debe ir a Settings → Site Settings → Location → Allow. En Chrome móvil: reload → prompt de permisos |
| `PositionError.POSITION_UNAVAILABLE` | GPS intermitente | Hardware GPS del celular no tiene señal. Común en: (1) Túneles, (2) Celulares baratos con GPS débil, (3) Location Services apagado | **No es error del sistema.** Verificar que Location Services esté activo en el celular del conductor. `timeout: 5000` causa este error si no obtiene fix en 5s |
| `PositionError.TIMEOUT` | Watchdog del GPS expiró | `maximumAge: 10000` + `timeout: 5000` expiró. El GPS no responde a tiempo | **Transitorio.** La siguiente iteración de `watchPosition` reintentará. Si persiste: el celular tiene problemas de hardware GPS |
| Batch endpoint 400 | `POST /monitoring/gps-batch` retorna 400 | Payload desalineado. Los campos deben ser `{ driverId, deviceId, points: [{ latitude, longitude, speed, timestamp }] }` | **Verificar** que el frontend envía `points` (no `locations`) y que cada punto tiene `latitude/longitude` (no `lat/lng`). Fue corregido en commit histórico — verificar que el fix está deployed |
| Batch endpoint 500 | GPS batch falla en el backend | Error en `MonitoringService`. Posible: BD connection pool exhausted, o la tabla `gps_points` tiene constraint violation | **1.** Verificar backend health. **2.** Revisar logs de Sentry para stack trace del 500. **3.** Si es pool exhaustion: reiniciar contenedor del backend |
| No GPS points registrados | `totalSynced` siempre es 0 | El motor está enviando pero el backend rechaza silenciosamente. O `driverId` no coincide con un driver existente | **Verificar** que el `session.user.id` del conductor existe en la tabla `drivers`. Si es un conductor recién registrado: su registro puede no haberse completado con `driverId` correcto |
| `locationQueue` crece indefinidamente | El flush nunca ejecuta | `navigator.onLine` retorna `false` persistentemente (modo avión, sin datos). O `isHibernating = true` por 402 previo | **Si offline:** esperado — la cola se vaciará al reconectar. **Si hibernating:** verificar si el conductor tiene suscripción activa. El backoff llega hasta 1 hora |
| Consumo excesivo de batería | Conductor reporta que la app drena batería | `enableHighAccuracy: true` + `watchPosition` continuo consume mucha batería. Especialmente en Android con GPS activo | **Estructural (by design).** La telemetría requiere GPS preciso. Recomendación: el conductor debe tener el celular conectado al cargador del taxi |

---

## 2. Errores de Kill-Switch y Morosidad (402)

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Estado `SUSPENDED` en check-in | Banner rojo pulsante: "Servicio Suspendido" | El backend retornó 402 para este `deviceId`. La suscripción del conductor está vencida (membresía RD$6,000) | **Verificar** en BD: `SELECT subscription_status FROM drivers WHERE id = '...'`. Si `SUSPENDED` o `OVERDUE`: el conductor debe pagar para reactivar |
| Hibernación infinita del telemetry | Motor GPS deja de enviar datos por horas | `isHibernating = true` con `backoffDelay` en máximo (3600000ms = 1 hora). Cada nuevo 402 reinicia el ciclo | **El conductor debe regularizar su suscripción.** No hay forma de forzar el reset del backoff desde SRE — el usuario debe recargar la página después de pagar |
| Banner "Servicio Limitado" en dashboard | Banner rojo con "Regulariza tu anualidad (RD$6k)" | `stats.subscriptionStatus !== 'ACTIVE'` — estados posibles: OVERDUE, SUSPENDED, CANCELLED | **No es un error.** Es UX intencional de morosidad. El botón "Regularizar" debe llevar al conductor a un flujo de pago |
| Banner "Penalidad de 10%" en dashboard | Banner naranja pulsante | `penaltyStatus.isAtRisk === true` — el conductor no ha cumplido su meta de horas | **No es un error.** Es alerta de negocio. El conductor debe acumular más horas antes del corte |
| `PaymentLockOverlay` cubre toda la app | Overlay negro bloquea interacción | `usePaymentStore` detectó que el conductor tiene bloqueo financiero activo | **Verificar** estado del payment lock en el backend. Si es un false positive: verificar sincronización del store |

---

## 3. Errores de Autenticación

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| "Teléfono o contraseña incorrectos" | Login falla | Backend rechazó `POST /drivers/login { phone, password }`. O el conductor no existe | **1.** Verificar que el conductor existe: `SELECT id, phone FROM drivers WHERE phone = '...'`. **2.** Si existe pero falla: el password hash puede no estar correctamente almacenado |
| Login loop (redirect infinito) | Conductor no puede entrar al dashboard | Cookie `sb-access-token` no se persistió, o el JWT no contiene `role: 'DRIVER'` | **1.** Verificar DevTools → Cookies. **2.** La login page setea cookie manualmente via `document.cookie`. Si `protocol !== https`, la flag `Secure` se omite. **3.** Verificar que `app_metadata.role` en el token es `DRIVER` |
| Token en localStorage pero no en cookie | Dashboard funciona al login pero falla al refresh | El middleware lee `sb-access-token` de cookie, pero el driver login sólo setea localStorage en algunos paths | **Verificar** que `login.tsx` ejecuta `document.cookie = 'sb-access-token=...'` correctamente. Si la cookie se borra por browser policy: el usuario pierde sesión al refrescar |
| Registro falla: "Error al registrar" | Onboarding Step 3 error | `POST /drivers` rechazado. Causas: (1) Teléfono duplicado, (2) Validación de payload, (3) Backend down | **1.** Verificar si el teléfono ya existe. **2.** Los agreements `contract` y `hardware_liability` (y/o `insurance`) deben ser `true`. **3.** Revisar logs del backend |
| Recuperación de contraseña no funciona | "¿Olvidaste tu contraseña?" muestra confirmación pero no hace nada real | **Conocido (deuda técnica).** `handleForgot()` solo muestra UI de confirmación con `setTimeout`. No hay integración con Twilio/SMS | **Informar al conductor** que debe contactar soporte TAD directamente para cambiar su contraseña |

---

## 4. Errores del Dashboard

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Dashboard muestra RD$0 en todo | Todos los KPIs en cero | `GET /drivers/me/hub` retorna datos vacíos. Posible: (1) Driver recién registrado sin actividad, (2) Hub endpoint falla silenciosamente, (3) `entityId` mismatch | **1.** Verificar proxy health. **2.** Probar endpoint directo: `curl -H "Authorization: Bearer <token>" <api>/drivers/me/hub`. **3.** Si hay error: revisar `DriversService.buildHubData` en tad-api |
| Progress Ring no avanza | Anillo circular siempre en 0% | `performance.hours === 0` o `performance` es `undefined`. El backend no calcula horas para este conductor | **Verificar** que el conductor tiene GPS points registrados. Sin telemetría: no hay horas calculables |
| "Solicitar Cierre de Nómina" falla | Toast error: "Error enviando solicitud" | `POST /portal-requests` falló. Causas: (1) `driverId` null, (2) Backend down, (3) Portal request limit | **1.** Verificar `session.user.id` no sea null. **2.** Verificar backend health. **3.** Los portal requests se guardan en tabla `portal_requests` |
| Modal de Soporte no envía | "Error al enviar la solicitud" | `POST /portal-requests` con `type: 'SUPPORT_ISSUE'` falló | **Mismo diagnóstico** que cierre de nómina. Verificar backend y datos del request |
| Referral link no copia | Click en "Copiar Enlace" no funciona | `navigator.clipboard.writeText()` requiere HTTPS. En HTTP no funciona | **Verificar** que EasyPanel sirve HTTPS. En development local (HTTP): el clipboard API es bloqueado por browser policy |
| Tablet Health muestra datos incorrectos | Battery 100%, Sync 100%, "Visto ahora" desactualizado | Los campos vienen de `driverData.device.*` — si el device no reporta, se usan defaults | **Esperado** si la tablet está offline. Verificar `last_seen` del dispositivo en BD |

---

## 5. Errores del Mobile Gateway (Check-In)

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| "QR INVÁLIDO" (pantalla roja) | Página muestra error permanente | URL no tiene `?deviceId=XXX`. El QR escaneado es incorrecto o corrupto | **Verificar** que el QR de la tablet genera URL con formato `https://<driver>/check-in?deviceId=DEV_001`. Si no: regenerar QR en admin panel |
| Estado `DEVICE_NOT_FOUND` | "SIN REGISTRO" en check-in | `startTadTracking(deviceId)` verificó con backend y el `deviceId` no existe en tabla `devices` | **Verificar** que el dispositivo está registrado: `SELECT * FROM devices WHERE id = 'DEV_XXX'`. Si no existe: crearlo desde el admin panel |
| Estado `GPS_ERROR` persistente | Icono rojo, "GPS ERROR" | `navigator.geolocation.watchPosition` falló. El celular no soporta GPS o los permisos fueron denegados | **1.** El conductor debe aceptar permisos de ubicación. **2.** Verificar que Location Services está activo. **3.** Algunos browsers in-app (Instagram, Facebook) no soportan GPS — usar Chrome/Safari directamente |
| Estado `OFFLINE` permanente | "OFFLINE BUFFER" no cambia a TRACKING | El celular del conductor no tiene conexión de datos. Los puntos se acumulan localmente | **Esperado en zonas sin cobertura 4G.** El buffer se vaciará al recuperar señal (evento `online`). No hay límite de buffer local en este endpoint |
| Estado `SYNCING` infinito | Spinner amarillo nunca pasa a `SYNCED` | El backend no responde al POST de GPS batch. Conexión lenta o timeout | **Verificar** backend health. Si el backend está respondiendo pero lento: puede ser un pool exhaustion o query lenta en la tabla de GPS points |
| Métricas `Buffer 0/10, Sync 0, Time —` | Check-in abierto pero no captura nada | `startTadTracking()` se llamó pero `watchPosition` no está generando posiciones | **El conductor debe moverse** para que el GPS genere nuevas posiciones. Si está estacionario: `enableHighAccuracy: true` debería generar updates pero depende del hardware |
| Página en blanco al abrir check-in | No renderiza nada | JavaScript error en el componente. Posible: import de `@tad/services/mobile-gateway` falló, o CSS no cargó | **1.** Abrir DevTools → Console. **2.** Verificar que el build incluyó `@tad/services`. **3.** Verificar que `transpilePackages` en `next.config.ts` incluye `@tad/services` |

---

## 6. Errores de Build y Despliegue

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `OOMKilled` durante build | Docker build falla en `npm run build` | Next.js + Sentry source maps consume >512MB RAM | **1.** `NODE_OPTIONS="--max-old-space-size=1024"` en Dockerfile. **2.** `webpackBuildWorker: true`. **3.** Si persiste: desactivar `widenClientFileUpload` |
| `NEXT_PUBLIC_*` undefined | Login falla, API no conecta | Variables no pasadas como Build Args | **CRÍTICO.** Agregar en EasyPanel. Re-deploy |
| `standalone/server.js` not found | Contenedor crashea | `output: "standalone"` no generó archivo esperado | **Verificar** `next.config.ts` y `outputFileTracingRoot` |
| `@tad/services/mobile-gateway` not found | Check-in page crashea | Monorepo package no resuelto en contexto Docker | **Verificar** que `packages/` se copia en Dockerfile y que `transpilePackages` incluye `@tad/services` |

---

## Comandos de Diagnóstico Rápido

```bash
# 1. Estado del proxy
curl -s https://<driver-url>/api/proxy/_proxy_health | jq .

# 2. Verificar login endpoint
curl -s -X POST https://<driver-url>/api/proxy/drivers/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"829-555-0001","password":"test123"}' | jq .

# 3. Verificar hub endpoint (con token)
curl -s -H "Authorization: Bearer <token>" \
  https://<driver-url>/api/proxy/drivers/me/hub | jq .

# 4. Verificar GPS batch endpoint
curl -s -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  https://<driver-url>/api/proxy/monitoring/gps-batch \
  -d '{"driverId":"test","deviceId":"DEV_001","points":[]}' | jq .

# 5. Verificar dispositivo en BD
# En Supabase SQL Editor:
SELECT id, taxi_number, last_seen, battery_level, subscription_status
FROM devices WHERE id = 'DEV_XXX';

# 6. Memory del contenedor
docker stats <container_id> --no-stream --format "{{.MemUsage}}"

# 7. Build Args verificación
docker exec <container_id> printenv | grep NEXT_PUBLIC
```

---

## Escalamiento

| Nivel | Criterio | Acción |
|-------|---------|--------|
| **P0 (Inmediato)** | Mobile Gateway (`/check-in`) completamente roto — **TODA la flota pierde telemetría**. Login roto para todos los conductores. | Verificar `tad-api` + `@tad/services/mobile-gateway`. Reiniciar contenedores. Verificar Build Args. **Alertar al equipo de operaciones de campo.** |
| **P1 (1 hora)** | Dashboard no carga (502/503), GPS batch failing con 500, Portal requests fallando | Diagnosticar vía proxy health + backend health. Verificar BD connection pool. Revisar Sentry |
| **P2 (4 horas)** | Progress Ring no avanza, wallet con datos placeholder, referral copy no funciona, hidratación warnings | No afecta telemetría ni nómina. Investigar en próximo sprint |
| **P3 (24 horas)** | Recuperación de contraseña no envía SMS (conocido), consumo de batería alto, métricas de tablet desactualizadas | Deuda técnica documentada. No requiere intervención inmediata |
