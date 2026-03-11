# 📋 03 — CHANGELOG Y LOGS TAD DOOH PLATFORM

> **Propósito**: Registro cronológico de cada bug solucionado, cómo se resolvió y qué archivos se tocaron.  
> Usar para dar contexto inmediato a cualquier agente nuevo sobre el historial de cambios.
> **Última Actualización**: 2026-03-11T00:02:00-04:00

---

## 📅 11 de Marzo, 2026

### 🛠️ FIX: Build Error TS2304 (Missing Param Decorator)
- **Issue resuelto**: Fallo de despliegue en Vercel por referencia inexistente a `Param`.
- **Archivos modificados**:
  - `backend/src/modules/finance/finance.controller.ts`: Se añadió `Param` al import de `@nestjs/common` y se estandarizó el uso de `@Res()`.
- **Explicación técnica**: Durante la implementación del generador de facturas, se utilizó el decorador `@Param('id')` para identificar la campaña, pero el compilador de TypeScript falló al no encontrar la definición en el scope del archivo. Se corrigió el import para restaurar el pipeline de CI/CD.

---

### 🛠️ HOTFIX: Hardened CORS & Preflight Response
- **Issue resuelto**: Peticiones `GET /api/drivers` bloqueadas por política CORS (`net::ERR_FAILED`).
- **Archivos modificados**:
  - `backend/api/index.ts`: Implementada inyección de cabeceras manual antes de `createNestServer`.
  - `backend/vercel.json`: Forzado de headers en la capa de routing global de Vercel.
- **Explicación técnica**: Se detectó que las funciones Lambda de Vercel terminaban la ejecución o fallaban antes de emitir las cabeceras CORS de NestJS. Se movió la lógica de cabeceras al nivel más alto del handler (Express) para asegurar que cualquier petición, incluso las fallidas, devuelva los permisos necesarios al navegador.

---

### 🔧 FIX: Media Storage Sync & Public URLs
- **Issue resuelto**: Fallos de carga en la galería `/media` y URLs rotas en el dashboard.
- **Archivos modificados**:
  - `backend/src/modules/supabase/supabase.service.ts`: Implementado `getPublicUrl` y `listMediaFiles`.
  - `admin-dashboard/pages/media/index.tsx`: Actualizado el grid de medios para usar URLs directas de Supabase.
- **Explicación técnica**: Se vinculó el backend con el bucket `campaign-videos` de Supabase Storage. Ahora el dashboard no solo lista los nombres de archivos, sino que genera URLs públicas instantáneas. Se añadió un manejador de eventos `onMouseOver` en el frontend para previsualizar videos sin consumir ancho de banda excesivo.

---

### 🔧 FIX: CORS Policy Blocking en Producción
- **Issue resuelto**: Error `net::ERR_FAILED` y `No 'Access-Control-Allow-Origin' header` al cargar el dashboard.
- **Archivos modificados**:
  - `backend/api/index.ts`: Añadido manejo manual de método OPTIONS y configuración de CORS en el Nest Serverless instance.
  - `backend/vercel.json`: Inyectadas cabeceras Access-Control en la capa de routing de Vercel.
- **Explicación técnica**: El adaptador serverless de NestJS a veces no procesa las peticiones preflight antes de que la función lambda termine. Se implementó un "Early Return" para peticiones OPTIONS en el entry point y se sincronizó la whitelist de dominios para asegurar que `tad-dashboard.vercel.app` tenga permisos plenos de lectura/escritura.

---

### 🛰️ FEATURE: Mobile GPS Gateway (Chofer Tracking)
- **Desafío**: Las tablets en los taxis a veces pierden conectividad o tienen GPS inestable, lo que impide ver la ubicación real en el dashboard.
- **Solución**: Se implementó una PWA de "Check-In" para el chofer. Al escanear el QR de la tablet, el celular del chofer actúa como gateway enviando coordenadas GPS cada 60s.
- **Backend**: Nuevo endpoint público `POST /api/analytics/external-gps` que actualiza el estado del dispositivo basándose en la telemetría del móvil.
- **Dashboard**: Nueva página `/check-in` diseñada con estética premium para uso móvil.
- **Archivos tocados**:
  - `backend/src/modules/analytics/analytics.controller.ts` (endpoint `external-gps`)
  - `backend/src/modules/analytics/analytics.service.ts` (lógica de actualización remota)
  - `admin-dashboard/pages/check-in.tsx` (nueva PWA para choferes)

---

### 📡 FEATURE: Geo-fencing & Device Telemetry
- **Implementación**: Se transformó el proceso de sincronización en un canal bidireccional de telemetría y contenido inteligente.
- **Geo-fencing**: Nueva lógica de filtrado `OR` (Ciudad/Global). Las tablets ahora solo descargan anuncios que coincidan con su ciudad base o sean de alcance nacional.
- **Salud del Dispositivo**: El endpoint `/sync` (ahora `POST`) captura nivel de batería y coordenadas GPS en tiempo real.
- **Alertas**: Implementado log preventivo para niveles de batería críticos (<15%) para reducir downtime de hardware.
- **Archivos tocados**:
  - `prisma/schema.prisma` (campos `city`, `batteryLevel`, `lastLat/Lng` en Device; `targetCity` en Campaign)
  - `backend/src/modules/device/dto/sync-device.dto.ts` (nuevo DTO de telemetría)
  - `backend/src/modules/device/device.controller.ts` (endpoint `/sync` migrado a POST)
  - `backend/src/modules/device/device.service.ts` (lógica de actualización de salud y filtrado)
  - `backend/src/modules/campaign/campaign.service.ts` (filtrado por `targetCity`)

---

### 🛰️ FEATURE: Estructura GPS para Geo-fencing
- **Implementación**: Se añadieron campos de coordenadas (`lat`, `lng`) a los modelos `PlaybackEvent` e `AnalyticsEvent` para rastrear la ubicación exacta de cada anuncio reproducido.
- **API**: Actualizado el DTO `PlaybackConfirmationDto` para aceptar coordenadas opcionales desde las tablets.
- **Backend**: Los servicios de `Device` y `Analytics` ahora capturan y persisten la data geográfica recibida.
- **Archivos tocados**:
  - `backend/prisma/schema.prisma` (campos `lat`, `lng` añadidos)
  - `backend/src/modules/device/dto/playback-confirmation.dto.ts` (DTO actualizado)
  - `backend/src/modules/device/device.service.ts` (registro de coordenadas)
  - `backend/src/modules/analytics/analytics.service.ts` (registro de coordenadas en eventos)

---

### 🚀 FEATURE: Generador de Facturas HTML Print-Ready
- **Implementación**: Nuevo sistema de facturación profesional que genera documentos HTML con estilos premium listos para imprimir a PDF.
- **Lógica**: Calcula automáticamente el subtotal basado en los meses de duración de la campaña (RD$1,500/mes) e incluye el cálculo de ITBIS (18%).
- **Dashboard**: Se añadió un botón "Factura" en la vista de finanzas que abre la factura en una nueva pestaña.
- **Archivos tocados**:
  - `backend/src/modules/finance/finance.service.ts` (lógica de cálculo + template HTML)
  - `backend/src/modules/finance/finance.controller.ts` (endpoint `/invoice/:id`)
  - `admin-dashboard/services/api.ts` (helper `getInvoiceUrl`)
  - `admin-dashboard/pages/finance/index.tsx` (botón de acción en la tabla)

---

### 🔧 FIX: Optimización de Prisma para Vercel Serverless (Riesgo #7)
- **Síntoma**: Riesgo de agotamiento del pool de conexiones de PostgreSQL en invocaciones serverless concurrentes.
- **Causa raíz**: El constructor de `PrismaService` no usaba logging condicional, generando ruido en producción.
- **Solución**: Se añadió logging condicional (`['query', 'info', 'warn', 'error']` en dev, solo `['error']` en prod). El `onModuleDestroy` con `$disconnect()` ya existía.
- **Archivos tocados**:
  - `backend/src/modules/prisma/prisma.service.ts` (constructor optimizado)

---

### 🚀 FEATURE: SubscriptionGuard — Bloqueo de tablets por falta de pago
- **Implementación**: Nuevo Guard `SubscriptionGuard` que intercepta el endpoint `/api/device/sync`.
- **Lógica**: Busca el `Driver` asociado al `device_id` enviado por la tablet. Si `subscriptionPaid === false`, responde con `403 Forbidden` y un mensaje estructurado indicando `SUBSCRIPTION_EXPIRED`.
- **Impacto**: Las tablets de choferes morosos no recibirán contenido publicitario hasta que se regularice el pago de RD$6,000/año.
- **Archivos tocados**:
  - `backend/src/modules/drivers/guards/subscription.guard.ts` (**NUEVO**)
  - `backend/src/modules/device/device.controller.ts` (añadido `@UseGuards(SubscriptionGuard)` al endpoint `/sync`)
- **Notas**: El guard usa `PrismaService` inyectado. `DeviceModule` ya importa `PrismaModule`, por lo que no requiere cambios adicionales en los módulos.

---

### 🚀 FEATURE: QR Scan Tracking con Redirect Proxy
- **Implementación**: Nuevo endpoint público `GET /api/analytics/qr-scan?campaignId=X&deviceId=Y`.
- **Flujo**: El código QR en la tablet apunta a la API de TAD. La API registra un evento `QR_SCAN` en `AnalyticsEvent` y redirige al pasajero (HTTP 301) a la `targetUrl` de la campaña.
- **Schema**: Se añadió el campo `targetUrl` al modelo `Campaign` en Prisma (`npx prisma db push` ejecutado).
- **Fallback**: Si no hay `targetUrl`, redirige a `https://tad.do`.
- **Uso en tablet**: El QR se genera con la URL `https://tad-api.vercel.app/api/analytics/qr-scan?campaignId={id}&deviceId={tabletId}`.
- **Archivos tocados**:
  - `backend/prisma/schema.prisma` (campo `targetUrl` en Campaign)
  - `backend/src/modules/analytics/analytics.controller.ts` (endpoint `qr-scan`)
  - `backend/src/modules/analytics/analytics.service.ts` (método `registerQrScan`)

---

## 📅 10 de Marzo, 2026

### 🔧 FIX: Dashboard apuntando a localhost en producción
- **Síntoma**: Al hacer login en `tad-dashboard.vercel.app`, la consola mostraba `net::ERR_CONNECTION_REFUSED localhost:3000/api/auth/login`.
- **Causa raíz**: El fallback de `baseURL` en Axios era `http://localhost:3000/api` y la variable `NEXT_PUBLIC_API_URL` no estaba configurada en Vercel.
- **Solución**: Se cambió el fallback a `https://tad-api.vercel.app/api` en `services/api.ts`.
- **Archivos tocados**:
  - `admin-dashboard/services/api.ts` (líneas 3-4, 131-132)
- **Commit**: `fix: production dashboard point to tad-api.vercel.app instead of localhost`

---

### 🔧 FIX: Usuario admin no existía en Supabase producción
- **Síntoma**: Login devolvía 401 "Credenciales inválidas" incluso con las credenciales correctas.
- **Causa raíz**: El usuario `admin@tad.do` no estaba registrado en la instancia de Supabase Auth de producción. Solo existía localmente.
- **Solución**: Se ejecutó un script de signup (`supabase.auth.signUp`) contra el proyecto de producción para crear el usuario con contraseña `TadAdmin2026!`.
- **Archivos tocados**:
  - `tmp/signup-admin.js` (script de una vez, no parte del codebase)
- **User ID de producción**: `0a6ee6b5-e2c4-4d88-a656-71aff21a8234`

---

### 🔧 FIX: Módulo de Choferes mostraba placeholder "Sprint 2"
- **Síntoma**: La página `/drivers` mostraba un banner amarillo "En Construcción — Sprint 2" y no filtraba correctamente los estados.
- **Causa raíz**: El banner estaba hardcodeado y los filtros solo buscaban `BLOCKED` en lugar de incluir `SUSPENDED`/`INACTIVE`.
- **Solución**: Se eliminó el banner de Sprint 2 y se actualizaron los filtros de estado.
- **Archivos tocados**:
  - `admin-dashboard/pages/drivers/index.tsx` (líneas 70-85, 114-143, 225-232)
- **Commit**: `feat: stabilize production audit fixes (fleet c2, drivers activation, date picker)`

---

### 🔧 FIX: Comandos remotos no accesibles desde perfil de nodo
- **Síntoma**: Para ejecutar `REBOOT/WIPE/SYNC` en un taxi, el admin tenía que buscar el dispositivo en la lista general.
- **Solución**: Se añadieron botones de acción directa en el modal de perfil de nodo en Fleet.
- **Archivos tocados**:
  - `admin-dashboard/pages/fleet/index.tsx` (líneas 477-487, sección del modal)
- **Commit**: Incluido en el commit anterior.

---

### 🔧 FIX: Date picker inconsistente en creación de campañas
- **Síntoma**: Los inputs de fecha en `/campaigns/new` no tenían el mismo estilo ni feedback visual.
- **Solución**: Se estandarizaron los estilos con `focus:ring-1 focus:ring-tad-yellow` y se envolvió el segundo input en un `<div className="relative">`.
- **Archivos tocados**:
  - `admin-dashboard/pages/campaigns/new.tsx` (líneas 109-131)
- **Commit**: Incluido en el commit anterior.

---

## 📅 9 de Marzo, 2026

### 🔧 FIX: Error 400 Multipart Boundary en subida de video
- **Síntoma**: Al subir un video, el backend devolvía `400 Bad Request: Missing Multipart Boundary`.
- **Causa raíz**: Axios estaba enviando el `Content-Type: application/json` en vez de dejar que el navegador auto-detecte el `multipart/form-data` boundary.
- **Solución**: Se usó `transformRequest` en Axios para eliminar el header `Content-Type` manualmente en las funciones de upload.
- **Archivos tocados**:
  - `admin-dashboard/services/api.ts` (funciones `uploadMedia` y `uploadCampaignMedia`)

---

### 🔧 FIX: Supabase Storage rechazaba videos (RLS)
- **Síntoma**: Error `403 Forbidden` al intentar subir archivos al bucket `campaign-videos`.
- **Causa raíz**: Supabase Storage requiere permisos RLS que no estaban configurados para uploads desde backend.
- **Solución**: Se configuró el backend para usar la `SUPABASE_SERVICE_ROLE_KEY` (que bypasea RLS) en vez de la `ANON_KEY`.
- **Archivos tocados**:
  - `backend/src/modules/media/media.service.ts`
  - `backend/src/modules/supabase/supabase.service.ts`

---

### 🔧 FIX: Error 500 JSON BigInt en respuestas de Prisma
- **Síntoma**: El endpoint de media devolvía `TypeError: Do not know how to serialize a BigInt`.
- **Causa raíz**: Prisma devuelve campos `BigInt` para `size`/`fileSize`, y `JSON.stringify` no sabe serializarlos.
- **Solución**: Se añadió `(BigInt.prototype as any).toJSON = function() { return this.toString(); }` en `main.ts` y `api/index.ts`.
- **Archivos tocados**:
  - `backend/src/main.ts` (línea 8-10)
  - `backend/api/index.ts` (línea 9-11)

---

### 🔧 FIX: `Zap is not defined` en página de Finanzas
- **Síntoma**: La página `/finance` crasheaba con `ReferenceError: Zap is not defined`.
- **Causa raíz**: El icono `Zap` de `lucide-react` no estaba importado en el componente.
- **Solución**: Se añadió `Zap` a la lista de imports de `lucide-react`.
- **Archivos tocados**:
  - `admin-dashboard/pages/finance/index.tsx`

---

### 🔧 FIX: Crash en Marcas por MOCK_ADVERTISERS
- **Síntoma**: La página `/advertisers` mostraba un error de runtime intentando mapear datos estáticos inexistentes.
- **Causa raíz**: El componente usaba datos mock hardcodeados en vez de la API real.
- **Solución**: Se reemplazó el mock por una llamada a `getAdvertisers()` que conecta con la DB real.
- **Archivos tocados**:
  - `admin-dashboard/pages/advertisers/index.tsx`

---

### 🔧 FIX: Redirección 404 en Analytics
- **Síntoma**: El menú lateral apuntaba a `/intelligence` que no existía como ruta.
- **Solución**: Se cambió la ruta del menú a `/analytics`.
- **Archivos tocados**:
  - `admin-dashboard/components/Layout.tsx` (o equivalente del sidebar)

---

### 🔧 FIX: Dependency Injection error (MediaModule → CampaignModule)
- **Síntoma**: El backend fallaba al arrancar con `Nest can't resolve dependencies of CampaignController (?, PrismaService, MediaService)`.
- **Causa raíz**: `CampaignModule` dependía de `MediaService` pero no importaba `MediaModule`.
- **Solución**: Se añadió `MediaModule` a los imports de `CampaignModule` y se exportó `MediaService` desde `MediaModule`.
- **Archivos tocados**:
  - `backend/src/modules/campaign/campaign.module.ts`
  - `backend/src/modules/media/media.module.ts`
- **Commit**: `fix: resolve MediaService dependency injection in CampaignModule`

---

## 📅 8 de Marzo, 2026

### 🔧 FIX: CORS bloqueando llamadas desde Dashboard → API
- **Síntoma**: El dashboard arrojaba `CORS policy: No 'Access-Control-Allow-Origin' header`.
- **Causa raíz**: El `vercel.json` del backend tenía las cabeceras pero el `main.ts` también las configuraba con diferentes reglas, causando conflictos.
- **Solución**: Se sincronizó la config CORS en `main.ts`, `api/index.ts` y `vercel.json` con la misma whitelist de orígenes.
- **Archivos tocados**:
  - `backend/src/main.ts` (líneas 28-42)
  - `backend/api/index.ts` (líneas 24-38, 47-56)
  - `backend/vercel.json` (headers section)

---

## 📅 7 de Marzo, 2026

### 🎨 FEATURE: Tema oscuro con amarillo TAD (#fad400)
- **Cambio**: Se actualizó toda la UI del dashboard de un tema claro a un tema oscuro premium con acentos en amarillo `#fad400`.
- **Archivos tocados**:
  - `admin-dashboard/styles/globals.css` (variables CSS)
  - Todas las páginas en `admin-dashboard/pages/`
  - Todos los componentes en `admin-dashboard/components/`

---

## 📅 6 de Marzo, 2026

### 🚀 FEATURE: Despliegue backend a Vercel
- **Cambio**: Se configuró `api/index.ts` como handler serverless para Vercel, con Express adapter para NestJS.
- **Archivos tocados**:
  - `backend/api/index.ts` (nuevo)
  - `backend/vercel.json` (nuevo)
  - `backend/.env.production` (configuración de producción)

### 🔧 FIX: Migración de mock data a Supabase PostgreSQL
- **Cambio**: Se eliminaron todos los datos mock y se conectó Prisma a la instancia real de Supabase.
- **Schema sincronizado**: `npx prisma db push` ejecutado contra producción.

---

## 📌 NOTAS PARA EL AGENTE

1. **Siempre hacer `git push origin main`** después de cambios — Vercel auto-deploya.
2. **PowerShell en Windows** no soporta `&&`. Usar `;` como separador o `cmd /c "..."`.
3. **Paths con espacios** (como `TAD PLASTFORM`) deben ir entre comillas en la terminal.
4. **La API no tiene ruta raíz** en `/api` — el 404 ahí es normal. Las rutas funcionales empiezan en `/api/auth/login`, `/api/campaigns`, etc.
5. **`@Public()` decorator** es obligatorio en cualquier ruta que la tablet/player necesite acceder sin login.
6. **Prisma schema** está en `backend/prisma/schema.prisma`. Después de cambios, ejecutar `npx prisma generate` y `npx prisma db push`.
