# TAD DOOH Platform - Análisis Integral de Procesos e Interacciones (2026)

Este documento contiene un mapa detallado del estado **actualizado** (Marzo 2026) de todas las interacciones, botones, flujos operativos y llamadas a API de la plataforma administrativa (Next.js) y su núcleo (NestJS).

Su objetivo principal es proporcionarle a cualquier agente IA o desarrollador el contexto EXACTO del estado del código para reorganizar funciones y escalar sin romper nada.

---

## 1. MÓDULO DE CAMPAÑAS (`/campaigns` y `/campaigns/[id]`)

Este módulo es el corazón financiero ("Vault") y logístico de la operación publicitaria.

### 1.1 Vista General de Campañas (`pages/campaigns/index.tsx`)

- **Interacción [Nueva Campaña] (Botón Amarillo Superior):**
  - **Acción:** Abre el modal `CampaignModal`.
  - **Lógica Front:** Formulario controlado para ingresar anunciante, prioridad, rango de fechas, links a RRSS/Delivery y audiencia (Todos, Flota, o Segmentado).
  - **API Call:** `POST /campaigns` -> Guarda data en tabla `Campaign`.
  - **Estrategia/Mejora Futura:** Actualmente la categorización es texto libre. Podría requerir un Tag System (Ej: Comida, Ropa, Eventos).

- **Interacción [Ver Detalles] (Clic en la Tarjeta de Campaña):**
  - **Acción:** Navega mediante Next Router a `/campaigns/[id]`.

### 1.2 Detalle de Campaña (`pages/campaigns/[id].tsx`)

- **Interacción [Bóveda Multimedia - "Inyectar Activos"]:**
  - **Status Actual:** Optimizado (Marzo 22, 2026).
  - **Acción:** Botón envía al usuario a la vista de media con URL parameters: `/media?openUpload=true&campaignId={id}`.
  - **API Call:** Ninguna directa (enrutamiento de cliente).

- **Interacción [Desvincular Video - Botón X Rojo]:**
  - **Status Actual:** Optimizado y Probado.
  - **Acción:** Lanza confirmación (`confirm`). Localmente hace un `filter` estadístico optimista en React.
  - **API Call:** `POST /campaigns/:id/unlink-media`. El backend inspecciona la tabla `Media` (v2) y degrada si no lo encuentra a la tabla heredada `MediaAsset` (v1) o a pura eliminación por `checksum`.

- **Interacción [Desasignar Pantalla - Botón X Rojo en Lista Hardware]:**
  - **Status Actual:** Probado.
  - **Acción:** Quita un `Device` de la pauta. UI Optimista.
  - **API Call:** `DELETE /devices/:deviceId/campaigns/:campaignId`.
  - **Notas Estratégicas:** El endpoint `device-admin.controller.ts` ahora escanea los equipos usando el `UUID` puro o el String Serial de hardware (`taxi-1234`), previendo inconsistencias heredadas.

- **Interacción [Borrar Campaña Completa] (Botón Outline Rojo Inferior):**
  - **Acción:** Elimina la campaña y limpia *en cascada* todas sus relaciones (dispositivos, videos).
  - **API Call:** `DELETE /campaigns/:id`.

---

## 2. MÓDULO MULTIMEDIA (`/media/index.tsx`)

Bóveda de almacenamiento, subida pesada (S3/Local) y asignación cruzada de Pautas.

### 2.1 Subida de Activos

- **Interacción [Importar Asset]:**
  - **Acción:** Levanta el componente Modal complejo `UploadNexusModal`.
  - **Proceso Interno Validado:**
    1. Previsualización de video en HTML5 (`video src={ObjectUrl}`).
    2. Input de Enlace Opcional de destino (QR).
    3. Selección de Dispositivos (1) o Campaña (Global).
    4. Envío de metadata y chunks Multipart de Form-Data.
  - **API Call:** `api.uploadMedia(file, campaignId)` -> `POST /media`.
  - **Resiliencia:** El Axios Instance tiene 300,000 milisegundos de Time-Out programado exclusivamente para esta llamada, mitigando fallos por proxies inversos (EasyPanel Ngrok).

---

## 3. MÓDULO DE FLOTA Y PANTALLAS (`/fleet/index.tsx`)

### 3.1 Carga del Inventario (Fleet Summary)

- **Carga de Datos Inicial:**
  - **Status Actual:** Optimizado agresivamente (Marzo 19, 2026).
  - **Problemática Anterior:** Componente sufría de `Waterfall N+1`. Cada tarjeta de tablet pedía al backend su número de campañas asignadas. Multiplicar eso por 100 taxis colgaba Node.
  - **Solución Inteligente Aplicada:** Se reemplazó por el Hook **SWR** llamando a un Master Query de Prisma (`GET /api/fleet/summary`).

- **Interacción [Añadir Tablet Manualmente]:**
  - **API Call:** `POST /devices` -> Modifica la tabla base `Device`.
  - **Requisito Comercial:** Un nuevo Device NO empieza a cobrar métricas ni suscripción hasta ser emparejado a un Vehículo o Conductor (`/drivers`).

- **Interacción [Global Sync Broadcast]:**
  - **Acción:** Despierta todas las tablets mediante Supabase Realtime Channels. (Evento `WAKE_UP_CALL`).

---

## 4. MÓDULO DE CONDUCTORES Y FINANZAS (`/drivers`, `/finance`)

### 4.1 Onboarding de Conductores

- **Lógica UX:** Tarjetas con diseño oscuro Premium (`bg-gray-900/40`), similares al diseño Neon/Cyberpunk adoptado en Flota y Tableros.
- **Acción [Suspender / Eliminar]:**
  - Manejo integral. Suspender deshabilita login PWA. Borrar Driver hace purga de sus ubicaciones (`DriverLocation`).
- **Botón Copiar Teléfono / QR:** Usan APIs nativas del explorador (`navigator.clipboard`).

### 4.2 Libro Mayor de Cobros (Ledger)

- **Lógica General:** La plataforma debe retener RD$6,000 mensuales base + proveer RD$500 mensuales por anuncio rodante.
- **API Metrics:** Las métricas diarias por dispositivo alimentan la facturación. El modelo `FinancialTransaction` actúa como fuente única de verdad.

---

## 5. MÓDULO GPS & TELEMETRÍA (`/tracking/index.tsx`)

### 5.1 Interacciones de Mapa (Master Console)

- **Carga Primaria:** Utiliza `Leaflet.js` con tiles CartoDB DarkMatter.
- **Efecto Spotlight (Foco Táctico):**
  - **Interacción:** El usuario hace clic sobre un Taxi.
  - **Reacción Frontend:** La pantalla se ahoga en un Overlay oscuro (`backdrop-blur-sm`). El Taxi seleccionado mantiene su `z-index` en lo alto ganando tamaño.
  - **Llamada de "Trails":** Solo cuando un taxi es clickeado, el frontend hace fetching selectivo enviando al `DeviceId` hacia `/analytics/recent-path` para dibujar la estela de luces (Motion Trails). Esto ahorra ancho de banda extremo en mapas repletos.

- **Heartbeats & Analytics Supabase:**
  - **Problema Antiguo:** `useTADAction` rompía el log console y congelaba clics si fallaba la telemetría anon. Las reglas SQL bloqueaban la inserción.
  - **Status Actual:** `fix_analytics_events_rls.sql` activo y UI optimista mitigada.

---

## PROPUESTA DE REORGANIZACIÓN ARQUITECTÓNICA ESTRATÉGICA

Dado el tamaño del proyecto, he detectado y preparado este plan de reorganización para optimizar aún más para próximas IAs o Desarrolladores Humanos:

1. **Separación de React Components (`/pages` vs `/components`)**
   - **Problema:** Los archivos en `pages/` (ej. `[id].tsx` y `media/index.tsx`) superan las 500+ líneas.
   - **Estrategia:** Mover la lógica de render modular (ej. `UploadNexusModal`, `FleetMetricsCard`, `SpotlightMap`) hacia la carpeta `/components`, inyectándoles funciones (callbacks) para que las páginas únicamente manejen el "State" y las llamadas API.

2. **Tipado Estricto Centralizado (Types/Interfaces)**
   - **Problema:** En el frontend se ven muchos tipos definidos `on the fly`: `(m: any) => m.id`.
   - **Estrategia:** Generar la librería de Prisma para Frontend o un archivo `types/index.d.ts` que exporte las interfaces `Campaign`, `MediaAsset`, `DeviceSummary`, compartiendo el esquema entre frontend y backend.

3. **Sistema de Errores Global (Toast/Snackbar)**
   - **Problema:** Fallos o Éxitos (ej. "Campaña Borrada") muestran rudimentarias alertas de javascript `window.alert('Error...')`.
   - **Estrategia:** Reemplazar llamadas nativas de Javascript integrando dependencias como `react-hot-toast` o `sonner` para un Look&Feel corporativo y premium.

4. **Websockets sobre Polling (Future Proof)**
   - Aunque `Supabase Realtime` salva el evento `DriverLocation`, otras tablas recaen en llamadas periódicas del SWR (`60,000ms`). Migrar componentes Core a canales Sockets `Socket.IO` en el NestJS Engine liberaría los pings al Database Central por completo.
