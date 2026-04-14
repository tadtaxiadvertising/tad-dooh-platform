# tad-admin — Catálogo de Errores Operativos (TROUBLESHOOTING)

> **Servicio:** `tad-admin` (Next.js 15 — Centro de Control)
> **Versión:** v10.0.0
> **Clasificación:** Tier-1
> **Última revisión:** 2026-04-13

---

## Instrucciones de Uso para SRE On-Call

1. **Identificar** el síntoma en el navegador (error visual, página en blanco, datos vacíos).
2. **Clasificar** usando las tablas: Proxy/Red, Autenticación, Build/Despliegue, UI/Datos, Mapas/Geo.
3. **Ejecutar** la mitigación inmediata.
4. **Validar** con el endpoint de diagnóstico: `GET /api/proxy/_proxy_health`.

---

## 1. Errores de Proxy y Red

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `502 Bad Gateway` | Todas las secciones muestran "Error al cargar datos" o página en blanco | El proxy `[...path].ts` no puede conectar al backend. `BACKEND_INTERNAL_URL` es incorrecto o `tad-api` está apagado | **1.** Verificar que `tad-api` esté encendido en EasyPanel. **2.** Ejecutar `curl https://<admin>/api/proxy/_proxy_health` para ver qué target está usando. **3.** Si `envSource` = `HARDCODED`, configurar `BACKEND_INTERNAL_URL=http://api:3000` en las env vars del contenedor admin |
| `503 Service Unavailable` | "Backend no disponible (Incluso tras reintento)" | El proxy falló en ambos targets: red interna Y fallback público. Backend completamente caído o red Docker rota | **ESCALAR a P0.** **1.** Verificar estado de `tad-api` en EasyPanel. **2.** Verificar red Docker: `docker network ls`. **3.** Si la red interna de EasyPanel se rompió, reiniciar ambos contenedores |
| `ECONNREFUSED` en logs | Proxy logueó "fetch failed" en consola del contenedor | `BACKEND_INTERNAL_URL` apunta a `http://api:3000` pero el contenedor `api` no está en la misma red Docker | **1.** Verificar que ambos servicios están en el mismo proyecto de EasyPanel (misma red Docker). **2.** El proxy tiene auto-fallback al URL público, pero será más lento. **3.** Corregir `BACKEND_INTERNAL_URL` si el servicio se renombró |
| `ENOTFOUND` en logs | DNS interno de Docker no resuelve "api" | El servicio `tad-api` se llama diferente en EasyPanel (ej. `tad-api` en vez de `api`) | **Verificar** nombre exacto del servicio en EasyPanel y actualizar `BACKEND_INTERNAL_URL` (ej. `http://tad-api:3000`) |
| Timeout (60s) | Request al proxy cuelga 60 segundos y luego falla | `AbortSignal.timeout(60000)` venció. El backend está procesando pero es lento (ej. nómina, BI snapshot) | **1.** Verificar salud del backend: `curl <api>/health`. **2.** Si es la página de finanzas: el cálculo de nómina puede ser lento con muchos drivers. Considerar paginación. **3.** Timeout no es configurable vía env (hardcoded a 60s) |
| `CORS_BLOCKED` en navegador | Console del browser muestra "Blocked by CORS policy" | El request fue al backend directamente en vez de pasar por el proxy `/api/proxy/` | **Verificar** que el frontend use rutas relativas `/api/proxy/<path>` y no URLs absolutas al backend. El proxy agrega headers CORS automáticamente |

---

## 2. Errores de Autenticación

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Login loop (redirect infinito) | Usuario entra a `/admin` → redirect a `/login` → login exitoso → redirect a `/admin` → loop | La cookie `sb-access-token` no se está persistiendo. Causa: (1) Protocolo HTTP sin flag `Secure`, (2) Cookie bloqueada por browser policy | **1.** Verificar que EasyPanel sirva HTTPS. **2.** En `login.tsx`, la cookie se setea con `Secure` solo si `protocol === 'https'`. **3.** Verificar que no haya extensiones de browser bloqueando cookies |
| `401 Unauthorized` (proxy) | Todas las peticiones API fallan con 401 tras login exitoso | El proxy no reenvía el header `Authorization` correctamente. O el token expiró (TTL: 7 días) | **1.** Inspeccionar `[PROXY 401]` en logs del contenedor admin. **2.** Verificar que el middleware lee `sb-access-token` de cookies. **3.** El proxy normaliza `Authorization` header — si el backend espera un formato diferente, hay desalineación |
| "Esta cuenta no tiene privilegios de administrador" | Login exitoso en Supabase pero error en la UI | El usuario existe en Supabase Auth pero su `app_metadata.role` no es `'ADMIN'` | **1.** En Supabase Dashboard → Authentication → Users → buscar el email → verificar `app_metadata.role`. **2.** Actualizar: `UPDATE auth.users SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"ADMIN"') WHERE email = '...'` |
| Rol `GUEST` en middleware | Usuario autenticado redirigido a login | `decodeTokenRole()` no puede parsear el JWT. El token tiene un formato inesperado o `app_metadata` está vacío | **Verificar** el JWT en [jwt.io](https://jwt.io). Debe contener `"app_metadata": { "role": "ADMIN" }` o `"role": "ADMIN"` en el payload root |
| Cookie `sb-access-token` no existe | Middleware redirige a login inmediatamente | Login nunca setó la cookie (error JS silencioso), o la cookie expiró (max-age: 604800s = 7 días) | **1.** Verificar en DevTools → Application → Cookies. **2.** Re-login del usuario. **3.** Si persiste: verificar que `document.cookie` funciona (no bloqueado por CSP) |

---

## 3. Errores de Build y Despliegue

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `OOMKilled` durante build | Docker build falla en la fase `npm run build` | Next.js build consuming >512MB RAM. Webpack compilation + Sentry source maps upload simultáneo | **1.** Verificar `NODE_OPTIONS="--max-old-space-size=1024"` en Dockerfile. **2.** `webpackBuildWorker: true` debería estar activo en `next.config.ts`. **3.** Si persiste: desactivar `widenClientFileUpload` en Sentry config |
| `NEXT_PUBLIC_*` undefined | Dashboard muestra datos vacíos; Supabase login falla | Las variables `NEXT_PUBLIC_*` NO fueron pasadas como Build Args. En Next.js, estas se incrustan en build-time, no en runtime | **CRÍTICO.** Reconfiguring EasyPanel: agregar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` como **Build Args** (no solo env vars). Re-deploy |
| `Module not found: @tad/services` | Build falla al resolver paquetes del monorepo | Los paquetes compartidos (`packages/`) no se copiaron al contexto Docker | **Verificar** que `Dockerfile.admin` copia `packages/` antes del `npm install`. La línea `COPY packages ./packages` debe existir y el build context debe ser la raíz del monorepo |
| `standalone/server.js` not found | Contenedor crashea al iniciar | `next build` no generó output standalone, o la ruta de copia en Docker es incorrecta | **1.** Verificar que `output: "standalone"` esté en `next.config.ts`. **2.** Verificar `outputFileTracingRoot` apunta a `../../` (raíz del monorepo). **3.** El CMD es `node apps/admin/server.js` — verificar que la estructura de copia coincida |
| Source maps upload failure | Build completa pero Sentry no recibe source maps | `SENTRY_AUTH_TOKEN` no configurado o expirado | **No bloqueante.** Build procede sin source maps. Para fix: regenerar token en Sentry → Settings → Auth Tokens y configurar en Build Args |
| TypeScript errors en build | Build falla por errores de tipos | Algún componente tiene tipos incompatibles | **Ya mitigado** con `ignoreBuildErrors: true`. Si aún falla: es un error de sintaxis JS, no TypeScript. Revisar el archivo indicado en el error |

---

## 4. Errores de UI / Datos

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Dashboard vacío | Todos los KPIs muestran 0 o "—" | Proxy funciona pero el backend retorna datos vacíos. Posible BD recién reseteada o sin datos seed | **1.** Verificar proxy health: `GET /api/proxy/_proxy_health`. **2.** Probar endpoint directo: `GET /api/proxy/devices`. **3.** Si retorna `[]`: ejecutar seed de datos o verificar que las tablets están reportando |
| "Error al cargar datos" toast | Sonner toast rojo aparece repetidamente | React Query retry (3 intentos) falló. Backend retornó error o timeout | **1.** Abrir DevTools → Network → buscar requests con status != 200. **2.** Click en el request fallido → ver response body. **3.** Cross-reference con TROUBLESHOOTING.md de tad-api |
| Upload de video falla | "Error al subir el video" en componente DirectUpload | Supabase Storage rechazó el upload. Causas: (1) Bucket `campaign-videos` no existe, (2) RLS policy, (3) Anon key sin permisos | **1.** Verificar bucket en Supabase Dashboard → Storage. **2.** El componente usa `supabase.storage.from('campaign-videos').upload()` con auth de Supabase client (anon key). **3.** Para bypass: usar Signed URL flow via backend |
| Nómina muestra RD$0 para todos | Tabla de finanzas con montos en cero | Cálculo de nómina depende de `PlaybackEvent(play_confirm)`. Si no hay playbacks: no hay pago | **Esperado si las tablets no están transmitiendo.** Verificar en `/admin/analytics` si hay eventos de playback recientes. Si hay playbacks pero $0: verificar suscripciones de drivers |
| Tabla de conductores no carga | Spinner infinito en `/admin/drivers` | Query `GET /api/proxy/drivers` está tardando o fallando. Posible: pool de Prisma exhausted | **1.** Verificar backend health. **2.** Si hay timeout: el endpoint de drivers puede hacer N+1 queries si no está optimizado. **3.** Reiniciar contenedor del backend para liberar pool |

---

## 5. Errores de Mapas y Geolocalización

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| Mapa en blanco (grey tiles) | Leaflet renderiza pero los tiles no cargan | Tiles de OpenStreetMap bloqueados por CORS/COEP headers, o CDN de tiles caído | **1.** Verificar en DevTools → Network si las requests a `tile.openstreetmap.org` retornan 200. **2.** Si bloqueadas por COEP: verificar que `next.config.ts` no tenga headers restrictivos. **3.** Los tiles son externos: verificar estado de OSM |
| Mapa sin marcadores | Mapa renderiza tiles pero no muestra dispositivos | Endpoint `/api/proxy/monitoring/fleet` retorna dispositivos sin `lastLat`/`lastLng` (valores null) | **Esperado para dispositivos nuevos** que nunca reportaron GPS. Verificar: `SELECT device_id, last_lat, last_lng FROM devices WHERE last_lat IS NOT NULL` |
| `window is not defined` | Error en SSR con Leaflet | Leaflet requiere `window` (browser API). El componente MapView se renderizó en server-side | **Ya mitigado** con `dynamic(() => import('...'), { ssr: false })`. Si reaparece: verificar que todos los imports de Leaflet usen dynamic imports |
| Heatmap no aparece | Mapa muestra marcadores pero no heatmap | Plugin `leaflet.heat` no se cargó o los datos de ubicación son insuficientes | **1.** Verificar import de `leaflet.heat` en el componente. **2.** Heatmap necesita mínimo ~5 puntos para renderizar. **3.** Si hay datos: verificar formato `[lat, lng, intensity]` |
| MarkerCluster crashea | Demasiados marcadores congelan el browser | >500 dispositivos activos sin clustering o con zoom level bajo | **Verificar** que el componente use `react-leaflet-cluster`. Si hay >1000 devices: considerar pagination o server-side filtering por ciudad |

---

## 6. Errores de Performance

| Código de Error | Descripción / Síntoma | Causa Técnica (en contexto TAD) | Acción de Mitigación SRE |
|-----------------|----------------------|--------------------------------|--------------------------|
| `OOMKilled` en runtime | Contenedor del admin se reinicia periódicamente | Next.js standalone + React Query cache acumulando respuestas grandes | **1.** Verificar `NODE_OPTIONS="--max-old-space-size=1024"`. **2.** React Query `staleTime` es 5min — si las responses son muy grandes (>10MB), reducir cache. **3.** Verificar que la página de finance/exports no está cargando CSVs enormes en memoria |
| Hydration mismatch | Warnings en console: "Text content does not match" | Diferencia entre server render y client render. Común con datos dinámicos (fechas, montos) | **No bloqueante** pero ruidoso en console. Común con `Date.toLocaleString()` que difiere entre server (Node) y client (browser). Usar `useEffect` para datos dependientes del locale |
| Slow navigation (>3s) | Cambiar de sección tarda varios segundos | Next.js está haciendo prefetch de rutas grandes o el proxy tiene latencia alta | **1.** Verificar latencia del proxy con `time curl <admin>/api/proxy/_proxy_health`. **2.** Si `BACKEND_INTERNAL_URL` apunta al URL público (en vez de la red interna), hay latencia HTTP innecesaria. **3.** Configurar `BACKEND_INTERNAL_URL=http://api:3000` |
| Bundle size excesivo | First paint >5s en conexiones lentas | Leaflet + Recharts + Framer Motion + componentes de 40KB+ | **Estructural.** Los dynamic imports de Leaflet ayudan. Para mejora: implementar code splitting por sección (ya usa Pages Router, que splitea por default) |

---

## Comandos de Diagnóstico Rápido

```bash
# 1. Estado del proxy y backend target
curl -s https://<admin-url>/api/proxy/_proxy_health | jq .
# → { "proxy": "OK", "backendTarget": "...", "envSource": "BACKEND_INTERNAL_URL" }

# 2. Verificar que el backend responde a través del proxy
curl -s https://<admin-url>/api/proxy/devices | jq '. | length'
# → Número de dispositivos (debería ser > 0)

# 3. Verificar autenticación end-to-end
curl -s -H "Authorization: Bearer <token>" https://<admin-url>/api/proxy/auth/me | jq .

# 4. Verificar Build Args (desde dentro del contenedor)
docker exec <container_id> printenv | grep NEXT_PUBLIC
# → NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_PORTAL_TYPE=ADMIN deben existir

# 5. Memory del contenedor
docker stats <container_id> --no-stream --format "{{.MemUsage}}"
# → Debe estar < 400MB / 512MB

# 6. Logs del proxy en tiempo real
docker logs -f <container_id> 2>&1 | grep "\[PROXY\]"
```

---

## Escalamiento

| Nivel | Criterio | Acción |
|-------|---------|--------|
| **P0 (Inmediato)** | Admin completamente inaccesible (503/502 persistente), Login roto para todos los admins | Verificar `tad-api` primero (dependencia directa). Reiniciar ambos contenedores. Verificar Build Args |
| **P1 (1 hora)** | Secciones específicas fallan (ej. finance timeout, mapa sin datos), Uploads fallando | Diagnosticar vía proxy health + backend health. Revisar Sentry para stack traces |
| **P2 (4 horas)** | Hydration warnings, tiles lentos, Sentry source maps no llegan | No afecta operación. Investigar en próximo sprint |
