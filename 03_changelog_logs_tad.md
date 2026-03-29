# Changelog de Desarrollos e Iteraciones (TAD DOOH)

## 📅 29 de Marzo, 2026 (Advanced Auth Portals & Telemetry Overhaul v5.4)

### 🔐 AUTH: Ecosistema de Portales Desacoplados

- **Driver Registration & Login**: Se rediseñó por completo la PWA del taxista (`tablet-player/tad-driver.html`). Ahora no depende exclusivamente de un Device ID inyectado; permite registro independiente (vía número de WhatsApp) e inicio de sesión seguro usando encriptación Bcrypt en la base de datos de Prisma y tokens JWT, todo operando bajo un *Auth Wall* premium de Alto Contraste.
- **Advertiser Standalone Portal**: Lanzamiento del portal exclusivo para anunciantes (`tablet-player/tad-advertiser.html`). Implementado desde cero con diseño Glassmorphism y métricas dinámicas (Impresiones, Costos, Completions) donde pueden crear su cuenta, configurar contraseñas seguras y monitorear campañas activas.
- **Next.js Advertiser Authentication**: Actualizada la ruta oficial `/p/advertiser/login.tsx` para soportar registro interactivo y auto-acceso. Los anunciantes que se inscriben aquí nutren directamente la base de datos global de la aplicación.
- **Public API Overrides**: Implementación segura de decoradores `@Public()` en los Controladores de NestJS para admitir endpoints de `login`, `create`, y `portal-data` sin requerir tokens de SuperAdmin (Supabase), permitiendo delegación de autenticación con guardias locales.

### 🗺️ TELEMETRY: Precisión Espacial y Experiencia Visual

- **Map Interactivity Layout**: Subsanado el problema estético en el Rastreo Maestro (`admin-dashboard/pages/tracking/index.tsx`) donde el botón flotante de control de mapa (Claro/Oscuro) colisionaba y bloqueaba los pines de los vehículos en esquinas inferiores. El botón ha sido reposicionado ergonómicamente a la capa superior.
- **Last-Seen Overhaul**: El gateway móvil (`analytics.service.ts` y persistencia gps) ahora actualiza obligatoriamente el campo `lastSeen` de Prisma cada vez que los choferes envían telemetría usando su PWA personal, asegurando que los marcadores en el mapa abandonen el estado *Offline* en tiempo real, incluso si no tienen una pantalla PWA activa al instante.
- **Velocity Vectors**: Introducida la captura de `speed` métricamente en la API de analítica para complementar la traza de impacto GPS predictivo, posibilitando proyecciones futuras de exposición de audiencia (slow vs fast traffic).
- **Driver Override Subscriptions**: Afinamiento en la capa de negocio de flotas (`fleet.service.ts`); si el array de suscripciones está vacío, el mapa prioriza el estado operativo nativo del conductor para evitar falsos "Suspendidos", revelando la flota real al instante.

## 📅 25 de Marzo, 2026 (Player Resilience & GPS Precision v5.3)

### 👻 PLAYER: Ghost Playback & Stale Cache Kill-Switch

- **Deterministic Content Removal**: Corregido el error crítico donde las tablets seguían reproduciendo anuncios obsoletos tras ser desvinculadas. El `sync` de `tablet-player/index.html` ahora purga automáticamente el `localStorage` y muestra "No Content" si el servidor devuelve cero anuncios.
- **Video Engine Hard-Stop**: Actualizada la lógica de `player/player/video-engine.ts` para detener el elemento `<video>`, limpiar el `src` y liberar memoria RAM cuando la lista de reproducción se vacía.

### 🛰️ TELEMETRY: Precision GPS Heartbeat

- **Backend Location Sync**: Corregido el bug en `DeviceService.deviceHeartbeat` que ignoraba las coordenadas GPS del latido. Ahora todas las ubicaciones se actualizan en tiempo real en el Master Console (dashboard).
- **Synchronous Geolocation Fetch**: Refactorizada la función `sendHeartbeat` en el reproductor para esperar (await) la posición del navegador antes de disparar el reporte, evitando que las unidades aparezcan con coordenadas nulas o centradas erróneamente en Santo Domingo.
- **DailySync Telemetry (TS)**: Implementada la captura de latitud y longitud en la nueva arquitectura modular del player (`player/scheduler/daily-sync.ts`), unificando el rastreo en todas las versiones del hardware.

---

## 📅 25 de Marzo, 2026 (Referral Intelligence & Selective Management v5.2)

### 📈 FINANCE: Inteligencia de Referidos y Auditoría

- **Advertiser Referral Commissions**: Implementado el rastreo de referidos para anunciantes. Ahora los TAD DRIVERS reciben una comisión de **RD$ 500.00** por cada marca/anunciante que refieran a la plataforma.
- **Backend Schema Evolution**: Actualizado `schema.prisma` para incluir la relación `referredBy` en `Advertiser` vinculada a `Driver`. Aplicado cambio en producción mediante `npx prisma db push`.
- **Dynamic Payroll Tracking**: Refactorizado `FinanceService` y `DriversService` para computar automáticamente los bonos por referidos de conductores (RD$ 500) y de anunciantes (RD$ 500) en el cálculo de nómina mensual.
- **High-Fidelity Audit Modal**: Nueva interfaz de auditoría en la lista de conductores que permite visualizar el desglose exacto de ingresos: Comisión Fija, Bono por Transmisión, Referidos Socios y Referidos Anunciantes.

### 🎛️ MANAGEMENT: Gestión Selectiva de Hardware

- **Selective Campaign Targeting**: Corregido el flujo de asignación manual de campañas en `CampaignModal`. Ahora se pueden seleccionar dispositivos específicos o conductores individuales, garantizando que el contenido se distribuya solo al hardware deseado.
- **Device Hub Content Tab**: Introducida la pestaña "Contenido" en `DeviceHubModal`. Permite ver qué campañas están activas en una tablet específica y desvincularlas individualmente con un solo clic.
- **Real-time Slot Analytics**: Corregido el contador de `occupied_slots` en el Hub de Dispositivos, permitiendo ver cuántos bloques de publicidad de los 15 disponibles están en uso actualmente.
- **Accessibility & UX Fixes**: Resueltos errores de accesibilidad (ARIA/Titles) en el dashboard y mejorada la interactividad de los modales con feedback visual instantáneo.

### 🚀 ADVERTISER: Hub de Gestión y Onboarding

- **Referral Onboarding**: El `AdvertiserModal` ahora permite seleccionar al conductor que refirió a la marca durante el registro inicial, vinculando la comisión de forma determinista.
- **Profile Subpages**: Verificación y pulido de la sub-página de anunciante donde se pueden gestionar métricas, subir contenido y lanzar campañas desde una vista centralizada.

---

## 📅 22 de Marzo, 2026 (Media Management & Telemetry Fixes v5.1)

### 🚀 MEDIA: Eliminación y Gestión Robusta de Activos

- **DELETE Endpoint Fix**: Se agregó el decorador `@Delete(':id')` en `MediaController` para soportar métodos HTTP DELETE estándar que antes devolvían 404.
- **Unlink Media Graceful Degradation**: Refactorizado `unlinkMediaFromCampaign` en el backend para manejar la desvinculación de videos buscando inteligentemente en ambas tablas estructurales (`Media` v2 y `MediaAsset` v1), evitando colisiones y errores 500 al desconectar activos antiguos.
- **Smart Modal Routing**: El botón "Inyectar Activos" en la vista de campaña ahora inyecta los parámetros `?openUpload=true&campaignId=...` en la URL, provocando que la bóveda multimedia abra automáticamente el modal con la campaña pre-seleccionada.
- **Optimistic UI Updates & Premium Toasts**: Los botones de borrado de pantalla y desvinculación visualizan el cambio en la interfaz de inmediato. Adicionalmente, se purgó el uso masivo de `window.alert()` y se migró el sistema global de errores interactivos (en Media y Campaigns) hacia notificaciones oscuras premium usando `React Sonner` (`toast.success` y `toast.error`), mitigando el bloqueo del hilo principal del DOM.

### 🛡️ STABILITY: Telemetría Supabase y Hardware Mapping

- **Row Level Security (RLS) Fix**: Se generó y aplicó un script SQL director a Supabase (`fix_analytics_events_rls.sql`) para otorgar permisos `INSERT` al rol `anon`, erradicando permanentemente el error `403 Forbidden` al enviar latidos de telemetría desde los reproductores web.
- **Silent Telemetry Failsafe**: Refactorizado el hook `useTADAction` para capturar cualquier fallo de red o permisos al hacer logs, permitiendo que la aplicación continúe su flujo de interactividad primaria (como borrar, asignar, o reproducir) sin arrojar errores en cascada.
- **Cross-ID Hardware Unassigning**: El endpoint `removeCampaignFromDevice` ahora puede recibir indistintamente el UUID interno de base de datos o el `deviceId` de hardware del NexGo/Tablet (`taxi-xyz`), resolviendo el bug visual donde la desasignación manual fallaba.

### 🧪 QA: Playwright E2E TypeScript Compliance

- **Assertion Syntax Update**: Se migraron más de 15 aserciones de pruebas E2E (en `auth-kiosk-flow.spec.ts`, `offline-resilience.spec.ts` y `gps-batch-sync.spec.ts`) desde la sintaxis rota de Jest hacia el formato oficial de Playwright `expect(value, 'message').matcher()`.
- **E2E Build Isolation**: Separado el entorno de compilación TypeScript de Next.js creando un `tsconfig.json` dedicado para `tests/e2e`, evitando que Next.js ahogue las pruebas con verificaciones de módulo estricto.

---

## 📅 20 de Marzo, 2026 (Antigravity Sync & Deterministic UI v5.0)

### ⚛️ ENGINE: Antigravity Sync (Real-time Liquidity)

- **Supabase Realtime v2**: Implementación del hook `useAntigravity` que escucha cambios `INSERT/UPDATE/DELETE` en tablas críticas (`pantallas`, `conductores`, `campañas`, `pagos`).
- **Cache Invalidation**: Integración con TanStack Query v5 para invalidación selectiva de queries mediante `queryClient.invalidateQueries`.
- **Cross-Tab Sync**: Uso de `BroadcastChannel` para sincronizar el estado entre múltiples pestañas del navegador sin recargas.

### 🔘 UI: Deterministic Interaction (AntigravityButton)

- **Click-Through Fix**: Migración masiva de botones críticos en `media`, `advertisers`, `finance` y `campaigns` al componente `AntigravityButton`.
- **Priority Layering**: Forzada de `z-index: 60` y `pointer-events: auto` para garantizar que los botones siempre respondan, incluso bajo el efecto de Spotlight o overlays de sistema.
- **Optimistic Logic**: Feedback visual instantáneo y manejo de estados pendientes (`isPending`) para eliminar la sensación de "clics muertos".

### 🗺️ MAPS: Fidelity & Global Navigation

- **Teardrop Markers**: Rediseño de pines de taxi con forma de gota de alta visibilidad, IDs en blanco de alto contraste y anillos de estado codificados por colores (activo, offline, falta de pago).
- **Tracking Fix**: Resolvimos el bug de navegación de la página de rastreo; eliminada la propiedad `fixed inset-0` que bloqueaba el resto del dashboard, sustituyéndola por un contenedor relativo perfectamente integrado en el Layout.
- **Glass Header**: Reestilizado el header global con `backdrop-blur-3xl` y `bg-black/10` para permitir la visualización de la telemetría del mapa por debajo de la interfaz de consulta.

---

## 📅 20 de Marzo, 2026 (Master Console v4.5: Spotlight & Trails)

### 🌟 MAPS: Spotlight Táctico (Foco de Unidad)

- **Efecto de Atenuación**: Al seleccionar una unidad, el resto de la interfaz y el mapa se oscurecen (`backdrop-blur` + `brightness-50`), centrando la atención visual en el vehículo y su telemetría.
- **Highlight Dinámico**: El marcador de la unidad seleccionada aumenta de tamaño (`30px` → `40px`) y gana un puntero táctico de alta precisión.
- **Interacción de Limpieza**: Clic en cualquier zona vacía del mapa restaura el brillo global y limpia la selección.

### ⚡ TRACKING: Motion Trails (Ruta de Resplandor)

- **Glow Path**: Implementación de estelas de luz neón que muestran los últimos 5 puntos de GPS del vehículo seleccionado.
- **Radar Style**: La ruta combina un núcleo punteado táctico con un aura de resplandor amarillo branding (`#FAD400`), permitiendo visualizar la trayectoria reciente de un vistazo.
- **Optimización de API**: Integrado `getDeviceRecentPath` para alimentar el trail solo bajo demanda, optimizando el consumo de datos.

## 📅 20 de Marzo, 2026 (Infraestructura de Medios & GPS Master UI)

### 🚀 MEDIA: Subida Robusta de Videos (200MB+)

- **Timeout Progresivo**: Incrementado el tiempo de espera de Axios a **300,000ms** (5 min) específicamente para el endpoint de media, evitando cortes en archivos pesados sobre EasyPanel.
- **DTO Flex**: Refactorizado `AddMediaAssetDto` en el backend para permitir campos opcionales (`checksum`, `fileSize`). Esto previene el error 400 si el frontend no procesa los metadatos a tiempo durante el triple handshake.
- **Asynchronously decoupling**: El modal de carga ahora separa la subida física del registro en campaña, permitiendo que el video se guarde en la librería global incluso si falla la vinculación inmediata.

### 🗺️ GPS: Restauración Dark Mode Premium

- **Fidelity Map**: Revertido el cambio a mapa claro. El Rastreo GPS ahora luce nuevamente el **Dark Mode High-Contrast** (`CartoDB DarkMatter`) optimizado para la pantalla de control Master.
- **Marker Aura**: Mejorada la visibilidad de las unidades activas con un aura animada unificada con el branding amarillo `#FAD400`.

### 🔐 AUTH: Sesión y Resiliencia

- **401 Interceptor**: Mejorada la alerta de sesión expirada para evitar bloqueos del modal de carga. Ahora el sistema detecta la falta de token y solicita recarga manual de forma amigable.

## 📅 20 de Marzo, 2026 (Business Rules & UX/UI Responsive v4.5)

### 📱 RESPONSIVIDAD Y LAYOUT GLOBAL

- **DashboardShell Overlay**: Introducido un Overlay Z-50 transigente con botón "Hamburger Menu" nativo para escalar el menú de Side-nav (Layout.tsx) perfectamente a móviles y tabletas sin quebrar el layout en grillas completas.
- **Grillas Autoadaptativas**: Todos los bloques de métricas superiores operan sobre reglas Tailwind de la forma `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, encapsulando tablas superestructurales (`media`, `fleet`, `finance`, `drivers`) con bloques robustos `overflow-x-auto custom-scrollbar`.

### 🎛️ FUNCIONALIDAD INTERACTIVA

- **Sincronización Broadcaster**: Botón de Sincronización de Nodos en Dashboard (`fleet/index.tsx`) envía ahora correctamente el Payload `WAKE_UP_CALL` a las flotas vía canal Realtime de Supabase.
- **Botones y Enrutado**: Reescritura total de rutas "huérfanas" en la página de inicio (Dashboard Overview) hacia rutas oficiales (`/fleet`, `/analytics`) usando integraciones seguras nativas de Next.js `<Link>`.
- **Carga de Archivos**: Reforzado control estricto de formato en Media (`pages/media/index.tsx` limitando y bloqueando explícitamente contenido fuera de `video/mp4` protegiendo Bucket de Storage).

### 🎨 REESTILIZACIÓN DARK PREMIUM

- **Conductores Module**: Replicación homologada de elementos de diseño del panel de finanzas hacia `drivers/index.tsx` (Hover Styles `bg-gray-900/40`, Elevaciones `group-hover:-translate-y-1`, Bloques expansivos translúcidos `bg-black/20 backdrop-blur-xl`, y cascades animadas uniformes).
- **Consolidación de Identidad**: Todos los reportes de error/warn en accesibilidad del DOM (ARIA/Titles faltantes en Layout.tsx) resueltos; linter limpio.

---

## 📅 20 de Marzo, 2026 (Auditoría UI Premium v4.5 & Fix de Infraestructura)

### 🎨 UI/UX: Estandarización de Alta Fidelidad (v4.5)

- **Dashboard Audit**: Se realizó una auditoría completa de los elementos visuales en `campaigns`, `fleet`, `media` y `devices`.
- **Typographic Scale**: Estandarizada la fuente de las métricas principales a `text-3xl lg:text-4xl font-bold` para garantizar legibilidad y un look premium.
- **Interacciones**: Corregida la sintaxis de `animation-delay` en todas las páginas, migrando de clases dinámicas de Tailwind a estilos `style={{ animationDelay: '...' }}` para asegurar animaciones fluidas.
- **Visual Harmony**: Ajuste de contenedores y espaciados para eliminar elementos desproporcionados reportados en versiones previas.

### 🛠️ STABILITY: Fix de Layout y Registro

- **Fleet Grid Fix**: Se resolvió un bug de cierre de etiquetas `div` en `pages/fleet/index.tsx` que rompía la rejilla de dispositivos.
- **Header Consolidation**: Unificados botones de acción en la cabecera de la flota (Sync/Attach) para una interfaz más limpia.
- **Devices Inventory**: Actualizada la página de inventario técnico con el nuevo diseño, incluyendo estados de salud animados.

### 🔐 AUTH: Diagnóstico de Error 401

- **Finance API**: Identificada la causa raíz del error `401 Unauthorized` en el endpoint de nómina. La variable `SUPABASE_SERVICE_ROLE_KEY` estaba usando una "Management Key" en lugar de la "Service Role Key" (JWT).
- **Environment**: Documentada la necesidad de `SUPABASE_JWT_SECRET` para validaciones locales y reducción de latencia.

---

## 📅 19 de Marzo, 2026 (Refactorización de Emergencia - Eliminación de Waterfall N+1)

### 🛡️ STABILITY: Eliminación Total N+1

- **Backend Batching**: Implementado `GET /api/fleet/summary` en `FleetController` y `FleetService` (usando Prisma `findMany` con `include` y `_count` de campañas vigentes compartiendo un mismo query óptimo) devolviendo nivel de batería, status, free_slots, chofer y locación.
- **SWR + Frontend Caching**: Modificadas masivamente las rutas de alto impacto `admin-dashboard/pages/media/index.tsx` y `admin-dashboard/components/DeviceSelectorModal.tsx` para usar **SWR** (`useSWR`) apuntando a `/fleet/summary` con un `dedupingInterval` de 60s en lugar de loops iterativos con `getDeviceSlots(deviceId)`.
- **Efecto de Red**: 1 sola llamada engloba el estado entero del inventario pre-calculado por Prisma, destrabando la carga del procesador del servidor web (Next.js Node) y Supabase simultáneamente, evitando errores *fetch failed*.

### 🛠️ INFRA: Optimización de Memoria y Proxy Interno

- **Next Config (Worker Offload)**: Activado `webpackBuildWorker: true` y `parallelServerCompiles: false` para salvaguardar la memoria y procesador de EasyPanel durante despliegues (previene caídas repentinas en ambiente productivo sin escalabilidad real).
- **Internal Cluster Traffic**: Forzado de `BACKEND_INTERNAL_URL` en modo Docker Swarm Proxy/Nixpacks para comunicarse de manera encapsulada sobre `http://tad-api:3000` eludiendo capas de red públicas.

### 🔐 SECURITY & AUTH: Resolución de Errores 401 y RLS

- **Extractor JWT Robusto**: Modificado el `fromAuthHeaderAsBearerToken` en NestJS (`supabase.strategy.ts` y `jwt.strategy.ts`) por un extractor Regex custom `replace(/bearer\s+/i, '')`. Esto hace al backend inmune a headers maliciosos o proxies que dupliquen la palabra Bearer.
- **Proxy Bug de Comas HTTP Fix**: Se removió el reenvío de `authorization` en minúscula en el Proxy Next.js (`[...path].ts`) junto al mayúscula, evitando que el Node HTTP engine combine ambos headers con comas (`Bearer xyz, Bearer xyz`) lo cual destruía la extracción matemática del Token en auth guards.
- **Supabase Auth Ping-Pong Loop Stop**: Se añadió lógica en el `api.interceptors.response` del frontend de Axios para hacer un `supabase.auth.signOut()` explícito y forzoso al recibir un status 401 del backend, rompiendo limpiamente el bucle infinito de redirecciones entre `/login` y `/`.
- **EasyPanel Environment Alert**: Documentada y reparada la caída causada por la falta de la credencial `SUPABASE_JWT_SECRET` en el contenedor de `tad-api`.
- **Database RLS Lockdown**: Sustituida la directiva insegura `WITH CHECK (true)` para `anon` en `public.driver_locations` por restricción exclusiva a `authenticated` y `service_role`, bloqueando inyecciones de telemetría de hackers y compliendo con el Standard Cybernetic Linter de Supabase Pwned Checks.

---

## 📅 14 de Marzo, 2026 (Refactorización Estructural y Mapas)

### 🔥 FEATURE: Mapas y Heatmaps de Impacto

- **Visualización Geográfica**: Implementado un mapa interactivo de alta fidelidad en `admin-dashboard/pages/tracking` usando **Leaflet** y cartografía oscura de CartoDB.
- **Ubicación en Tiempo Real**: Ahora el administrador puede ver la ubicación exacta de todas las unidades activas basadas en el GPS del Mobile Gateway.
- **Heatmap Publicitario**: Nueva vista de "Mapa de Calor" que visualiza la densidad de impactos publicitarios (confirmaciones de reproducción) de los últimos 15 días, permitiendo análisis espacial de pauta.
- **API Analytics**: Refactorizado `AnalyticsService` para exponer datos de calor geográfico filtrando picos de saturación.

### 🎨 REFACTOR: Estandarización de Nomenclatura (UI)

- **Depuración Comercial**: Se eliminó el término "Chofer" en toda la interfaz visible del administrador, reemplazándolo por **"Conductor"** conforme a los nuevos estándares comerciales.
- **Alcance**: Cambios aplicados en `/drivers`, `/fleet`, `/tracking`, `/finance`, `/campaigns` y el Dashboard Principal.
- **PWA Conductor**: La página de Mobile Gateway `/check-in` ahora se identifica como **TAD CONDUCTOR**.
- **Nota**: Se respetaron los nombres técnicos en código (tablas de DB, componentes en inglés y endpoints) para evitar breaking changes técnicos.

### ⚡ FEATURE: Sincronización Multi-Pestaña (Cross-Tab Sync)

- **Implementación**: Se integró la API nativa `BroadcastChannel` para sincronizar el estado entre múltiples pestañas del navegador sin necesidad de recargar la página.
- **Mecanismo**: Las mutaciones de datos (crear conductor, borrar unidad, distribuir campaña) emiten un evento global a través de `notifyChange`.
- **Hook `useTabSync`**: Las páginas ahora escuchan estos eventos y refrescan sus datos automáticamente cuando se detecta un cambio en otra pestaña paralela.

### 🚀 PERFORMANCE: Optimización de Renderizado y Auditoría

- **React.memo**: Se implementó memoización en modales críticos (`DriverModal`, `CampaignModal`, `DeviceModal`) para prevenir re-renders innecesarios.
- **Callbacks Estables**: Todas las funciones de carga de datos (`loadData`, `loadDrivers`) se envolvieron en `useCallback` para estabilizar el árbol de dependencias de `useEffect`.
- **Cleanup**: Eliminación de `useEffect` redundantes y optimización de las dependencias para evitar bucles infinitos de refresco.

### 📖 DOCUMENTACIÓN: Flujo Operativo Estándar

- **SOP**: Creado un nuevo manual operativo `04_flujo_operativo_tad.md` que detalla el ciclo completo desde el onboarding del conductor hasta la liquidación financiera de RD$500/anuncio.

---

## 📅 21 de Marzo, 2026 (Sync Module & Offline Orchestration v5.0)

### 🔄 SYNC: Módulo de Sincronización Determinista

- **Backend Sync Engine**: Implementado `SyncModule` en NestJS que genera un manifiesto JSON preciso para cada tablet.
- **Dynamic Targeting**: El motor ahora evalúa si una campaña es global, por conductor o vinculada directamente al hardware (`DeviceCampaign`), garantizando que cada tablet descargue solo lo necesario.
- **Subscription Guard integration**: El endpoint `/api/sync/:deviceId` valida en tiempo real si el conductor tiene el pago de RD$6,000 al día, bloqueando la descarga si hay mora.

### 📦 STORAGE: OfflineSyncManager (Service Worker Level)

- **Cache Storage API**: Implementada la clase `OfflineSyncManager` directamente en el player HTML. Maneja la descarga bit-a-bit de videos y la purga automática de archivos obsoletos para ahorrar espacio en la tablet.
- **Deterministic Playlist**: La playlist se guarda en `localStorage` sincronizada con la caché de medios, permitiendo reproducción 100% offline sin parpadeos.
- **Native Injection**: El orquestador de sincronización fue inyectado directamente en `index.html` y `player.html` para acceso inmediato desde la consola de desarrollador para pruebas en campo.

---

## 🏦 [FINANCIAL_LOG] - TAD Intelligence Module v1.0

### **Estado Actual del Balance** (Corte: 20 de Marzo, 2026)

- **MRR (Ingresos Recurrentes):** RD$ 0.00 (Esperando activación de primera flota)
- **Burn Rate:** RD$ 0.00 (Operación base)
- **Neto Acumulado:** RD$ 0.00

### **Reglas de Negocio Aplicadas:**

1. **Suscripción Base:** RD$ 6,000 / mes por taxi.
2. **ITBIS:** 18% aplicado a todos los Ingresos (Suscripciones y Publicidad).
3. **Retención Referidos:** 10% del Neto retenido para el Referidor (si aplica).
4. **Pago a Conductores:** RD$ 500 / pauta activa / mes.

### **Historial de Movimientos:**

- `2026-03-20`: **INIT** | Configuración inicial del módulo de inteligencia financiera y activación del Libro Mayor (Ledger).
- `2026-03-21`: **UPDATE** | Implementación de Facturas Comerciales Premium (Dark Mode HTML/PDF) con cálculos de ITBIS dinámicos para auditoría de campañas.
- `2026-03-21`: **UPDATE** | Refactorización de descargas Seguras HTTP/Axios para evadir errores de autorización (401) en exportación de reportes CSV. Integración de esquema en producción vía `npx prisma db push`.
