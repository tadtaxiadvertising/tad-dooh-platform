# tad-advertiser — Catálogo de Errores Operativos (TROUBLESHOOTING)

> **Servicio:** `tad-advertiser` (Next.js 15 — Portal del Anunciante)
> **Versión:** v10.0.0
> **Clasificación:** Tier-2
> **Última revisión:** 2026-04-13

---

## Instrucciones de Uso para SRE On-Call

1. **Identificar** el síntoma en el navegador del anunciante.
2. **Clasificar** usando las tablas: Video/Media, Proxy/Red, Autenticación, Build, UI/Datos, Mapas.
3. **Ejecutar** la mitigación inmediata.
4. **Diagnóstico rápido** del proxy: `GET /api/proxy/_proxy_health`.

---

## 1. Errores de Video y Media Upload

> **⚠️ Esta es la sección más crítica para `tad-advertiser`.** El flujo de video es el principal punto de interacción del anunciante con la plataforma.

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `WebAssembly no disponible` | Mensaje: "Compresión local no disponible" en amarillo | Navegador del anunciante no soporta WebAssembly (Safari antiguo, modo restringido, extensiones de seguridad) | **Esperado.** El componente tiene fallback automático: sube el video sin comprimir. Informar al anunciante que use Chrome/Firefox actualizado para mejor experiencia |
| `FFmpeg no pudo cargarse` | Estado del transcoder: `error` después de "Cargando motor de video..." | FFmpeg WASM Core no se descargó desde `unpkg.com/@ffmpeg/core@0.12.6`. Causas: (1) CDN caído, (2) Red corporativa del anunciante bloquea unpkg, (3) SharedArrayBuffer no disponible (requiere HTTPS + COOP headers) | **1.** Verificar acceso a `https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js` desde el browser. **2.** El fallback automático sube el original. **3.** Si es bloqueado por firewall corporativo: el anunciante puede subir directamente sin optimizar |
| `Error al procesar el video` | Transcoding falla después de iniciar | FFmpeg.wasm se quedó sin memoria en el navegador. Videos >50MB en dispositivos con poca RAM pueden fallar | **Automáticamente manejado:** `catch` en `handleStartTranscode()` setea `processedBlob = selectedFile` (fallback a original). Si persiste: recomendar al anunciante que pre-comprima el video o use un equipo con >4GB RAM |
| `No se pudo obtener la URL de subida autorizada` | Error en paso de upload | `GET /media/upload-url` falló. El backend no generó Signed URL. Causas: (1) Supabase Storage offline, (2) `SUPABASE_SERVICE_ROLE_KEY` inválida, (3) Bucket no existe | **1.** Verificar que el backend esté respondiendo: `curl <api>/health`. **2.** Verificar bucket `ads-videos` en Supabase Dashboard → Storage. **3.** Verificar `SUPABASE_SERVICE_ROLE_KEY` (debe ser Service Role, no Anon) |
| `Error al subir el archivo al almacenamiento seguro` | `PUT <signedUrl>` retorna error | Signed URL expiró (TTL: 60s), o el archivo excede el límite de Storage en Supabase. O CORS no permite PUT desde el dominio del portal | **1.** Verificar que los CORS de Supabase Storage permitan `PUT` desde el dominio del portal. **2.** Si la URL expiró: es un race condition — transcodificación tomó >60s. El anunciante debe reintentar. **3.** Verificar Storage quota en Supabase |
| `Error en el registro: <msg>` | `POST /campaigns/register-media` falló | Metadata del video no pudo registrarse. Causas: (1) `brandId` null (anunciante sin `entityId`), (2) Prisma error, (3) Auth expired | **1.** Verificar que el usuario anunciante tenga `app_metadata.entityId` en Supabase Auth. **2.** Revisar logs del backend para el error exacto. **3.** El video YA está en Storage — solo falta el registro de metadata |
| `Archivo excede 100MB` | Validación client-side rechaza el archivo | Archivo seleccionado supera `MAX_FILE_SIZE_MB = 100` | **Esperado.** Recomendar al anunciante que comprima el video antes de subirlo. El límite backend es 55MB (`MAX_VIDEO_SIZE_BYTES`), pero el frontend permite hasta 100MB porque la transcodificación local lo reduce |
| Upload se queda en "Guardando en TAD..." | Spinner infinito en botón de upload | `PUT` al Signed URL está en curso pero la red del anunciante es lenta. O el backend de registro tardó | **No es un error del sistema.** Con videos de 50MB+ en 4G, el upload puede tomar 1-5 minutos. No hay timeout configurable — depende del browser. Si falla: verificar que el video no quedó huérfano en Storage |
| Video optimizado pesa más que el original | Warning amarillo: "Sin optimización local" | El video original ya estaba muy comprimido (CRF bajo). Re-transcodificar con CRF 28 lo hizo más pesado | **Smart Fallback activo.** El sistema detecta esto y usa el original automáticamente. Log: `[OPTIMIZATION] Bypassed: El video optimizado (...MB) pesa más que el original (...MB)` |

---

## 2. Errores de Proxy y Red

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `502 Bad Gateway` | Dashboard vacío, todas las secciones fallan | Proxy no conecta al backend. Misma causa y mitigación que tad-admin | **Verificar** `tad-api` en EasyPanel. `curl <portal>/api/proxy/_proxy_health` para diagnóstico |
| `503 Service Unavailable` | "Backend no disponible (Incluso tras reintento)" | Backend caído + fallback público también fallando | **ESCALAR a P0.** Verificar ambos: red interna Docker y URL pública del backend |
| `ECONNREFUSED` / `ENOTFOUND` | Logs del proxy con "fetch failed" | `BACKEND_INTERNAL_URL` incorrecto o servicios en redes Docker diferentes | **Idéntico a tad-admin.** Verificar red Docker y nombre del servicio |
| Timeout (60s) | Request cuelga y falla | Query pesada en backend (ej. tracking/summary con muchos devices) | **1.** Verificar salud del backend. **2.** El timeout del proxy es 60s (hardcoded) |

---

## 3. Errores de Autenticación y Onboarding

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Login loop (redirect infinito) | Anunciante no puede acceder al dashboard | Cookie `sb-access-token` no persistida o rol no es `ADVERTISER` | **1.** Verificar cookie en DevTools. **2.** Verificar `app_metadata.role = 'ADVERTISER'` en Supabase Auth |
| "Error al crear la cuenta" en onboarding | Step 3 (registro) falla | Backend rechazó `POST /advertisers`. Causas: (1) Email duplicado, (2) Validación de payload, (3) Backend caído | **1.** Verificar si el email ya existe: `SELECT * FROM advertisers WHERE email = '...'`. **2.** Verificar logs del backend para el error exacto. **3.** Verificar proxy health |
| Admin no puede acceder al portal | ADMIN redirigido a login | Middleware en v10 permite ADMIN como override. Verificar que `decodeTokenRole(token) === 'ADMIN'` retorne correctamente | **Verificar** que el JWT del admin tenga `app_metadata.role = 'ADMIN'` y que el middleware tenga la línea `if (session && decodeTokenRole(session) === 'ADMIN') return NextResponse.next()` |
| Onboarding no carga | Página en blanco en `/advertiser/onboarding` | La página es semi-pública (no requiere auth) pero depende de componentes `@tad/ui`. Build error o paquete no resuelto | **1.** Verificar build logs para errores de transpilación de @tad/ui. **2.** Verificar que `transpilePackages` en `next.config.ts` incluya `@tad/ui` |

---

## 4. Errores de Build y Despliegue

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `OOMKilled` durante build | Docker build falla en `npm run build` | Next.js + FFmpeg types + Sentry source maps consume too much RAM | **1.** `NODE_OPTIONS="--max-old-space-size=1024"` en Dockerfile. **2.** `webpackBuildWorker: true` y `parallelServerCompiles: false`. **3.** Si persiste: desactivar `widenClientFileUpload` de Sentry |
| `NEXT_PUBLIC_*` undefined | Login falla, Supabase no conecta | Variables no pasadas como Build Args en EasyPanel | **CRÍTICO.** Agregar como Build Args: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`. Re-deploy |
| `Module not found: @ffmpeg/ffmpeg` | Build falla al resolver FFmpeg | Dependencia no instalada correctamente en el contexto Docker | **Verificar** que `apps/advertiser/package.json` tenga `@ffmpeg/ffmpeg: ^0.12.15` y que el `npm install` del builder resuelva correctamente |
| `standalone/server.js` not found | Contenedor crashea al iniciar | `output: "standalone"` no generó el archivo esperado | **Verificar** `next.config.ts` tiene `output: "standalone"` y `outputFileTracingRoot` apunta a `../../` |
| TypeScript errors en build | Build falla | Componentes con tipos incompatibles | **Ya mitigado** con `ignoreBuildErrors: true` y `ignoreDuringBuilds: true` |

---

## 5. Errores de UI / Dashboard

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Dashboard BI vacío | KPIs muestran "—" o 0 | El endpoint del backend no retorna datos del anunciante. Posible: `entityId` del anunciante no coincide con datos en BD | **1.** Verificar `app_metadata.entityId` del usuario en Supabase Auth. **2.** Verificar que existan campañas asociadas a ese anunciante |
| Budget Simulator no responde | Slider no actualiza valores | Error JavaScript en `simulateImpact()`. Posible: datos de telemetría vacíos | **No crítico.** La simulación usa cálculos locales. Si falla: verificar console del browser para errores en `utils/simulations.ts` |
| Campañas no cargan | Lista vacía en `/advertiser/campaigns` | Endpoint filtrado por `brandId` del anunciante retorna vacío. O el anunciante aún no tiene campañas | **Verificar** si el anunciante tiene campañas: `SELECT * FROM campaigns WHERE advertiser_id = '...'`. Si no: es esperado para anunciantes nuevos |
| Billing muestra datos placeholder | Fechas estáticas ("Marzo 15, 2026") | Algunos elementos del BillingPortal usan datos demo estáticos | **Conocido (deuda técnica).** Los datos de facturación reales se están integrando. No afecta la funcionalidad core |

---

## 6. Errores de Mapa de Red

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Mapa en blanco | Tiles no cargan en `/advertiser/network` | OpenStreetMap tiles bloqueados o CDN caído | **Idéntico a tad-admin.** Verificar acceso a `tile.openstreetmap.org` |
| Mapa sin vehículos | No aparecen marcadores | `getFleetLocations()` retorna vacío. Posible: anunciante no tiene permisos de vista de flota completa | **Verificar** que el endpoint de flota esté accesible desde el rol ADVERTISER. Algunos endpoints pueden requerir ADMIN |
| `window is not defined` | Error SSR con Leaflet | MapView renderizado en server-side | **Ya mitigado** con `dynamic(() => import('MapView'), { ssr: false })`. Si reaparece: verificar que todos los imports de Leaflet sean dinámicos |
| Heatmap lento | UI se congela al activar heatmap | Demasiados puntos de calor (>10,000) | **Limitar** la cantidad de puntos devueltos por `getHeatmapData()`. Client-side no tiene paginación para heatmap data |
| Auto-refresh causa parpadeo | Mapa re-renderiza cada 30s con flash | `fetchData()` reemplaza todo el state de fleetLocations, causando re-mount del mapa | **Estructural.** Solución: usar React Query con `keepPreviousData: true` o memoizar el array de locations |

---

## Comandos de Diagnóstico Rápido

```bash
# 1. Estado del proxy
curl -s https://<advertiser-url>/api/proxy/_proxy_health | jq .

# 2. Verificar onboarding endpoint
curl -s https://<advertiser-url>/api/proxy/advertisers -X POST \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Test","email":"test@test.com","password":"123456"}' \
  | jq .status

# 3. Verificar Signed URL endpoint
curl -s -H "Authorization: Bearer <token>" \
  "https://<advertiser-url>/api/proxy/media/upload-url?fileName=test.mp4&fileType=video/mp4" | jq .

# 4. Memory del contenedor
docker stats <container_id> --no-stream --format "{{.MemUsage}}"

# 5. Build Args verificación
docker exec <container_id> printenv | grep NEXT_PUBLIC
# → NEXT_PUBLIC_PORTAL_TYPE=ADVERTISER, NEXT_PUBLIC_SUPABASE_URL, etc.

# 6. FFmpeg WASM CDN check
curl -sI https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js | head -5
# → HTTP/2 200  (debe retornar 200)
```

---

## Escalamiento

| Nivel | Criterio | Acción |
|-------|---------|--------|
| **P0 (Inmediato)** | Portal completamente inaccesible, onboarding roto (pérdida de leads), video uploads masivamente fallando | Verificar `tad-api` primero. Verificar Supabase Storage status. Reiniciar contenedores |
| **P1 (1 hora)** | Dashboard BI no carga, mapa sin datos, campañas individuales no funcionan | Diagnosticar vía proxy health + Sentry. Verificar entityId del anunciante afectado |
| **P2 (4 horas)** | Transcodificación falla en browser específico, heatmap lento, datos placeholder visibles | No afecta operación core. El fallback de upload directo siempre funciona |
