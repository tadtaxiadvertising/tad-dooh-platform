# 🗺️ 05 — BLUEPRINT DE SERVICIOS TAD DOOH v10.0.0

> **Propósito**: Biblia de Desarrollo y Arquitectura Técnica (Full-Stack & DevOps). Generado a partir de la documentación existente del ecosistema TAD DOOH (v10.0.0).
> **Enfoque**: Experiencia de Usuario (UX) y Alta Disponibilidad (SRE / Offline-first).

---

## ⚠️ ZONAS CIEGAS / CONFLICTOS IDENTIFICADOS

A partir del cruce de la documentación (`01_auditoria_tad_2026.md`, `02_reglas_negocio_stack.md`, `03_changelog_logs_tad.md`, `04_flujo_operativo_tad.md`), se evidencian las siguientes incongruencias y vacíos técnicos:

1. **Conflicto de Entorno de Despliegue (Vercel vs. EasyPanel)**:
   - El documento de la Auditoría (`01`) hace mención reiterada a fallos y cuotas en Vercel ("Serverless Output Lifting", "Riesgo de cuota excedida en Vercel"), mientras que las Reglas de Negocio (`02`) documentan todas las URLs en un entorno VPS con `easypanel.host` y limitan los microservicios a cuotas de RAM estrictas (512MB / 1024MB). *Zona Ciega: No es explícito si actualmente existe un modelo híbrido (Frontend en Vercel / Backend en VPS) o si la migración hacia EasyPanel es total y la documentación de Vercel es residual.*
2. **Vacío en el Flujo de Pagos B2B/B2C**:
   - El Flujo Operativo (`04`) dicta: *Fase 1: Paga RD$ 6,000*. Sin embargo, el roadmap de la Auditoría indica: *Integración transaccional con pasarela de pagos (Q3 2026)* como pendiente. *Conflicto: Actualmente, la actualización de pagos (suscripciones de conductores y facturación a marcas) se efectúa de manera manual o simulada en el backend interactuando con el endpoint `PUT /drivers/subscription`.*
3. **Ambigüedades en Infraestructura CDN y Almacenamiento**:
   - La Auditoría resalta un límite crítico en ancho de banda de Supabase (5GB/mes) y un plan de usar *"Cloudflare CDN en media.tad.do"* (marcado "En Progreso"). Sin embargo, la app en su estado actual sigue despachando o dependiendo enteramente de `Supabase Storage`, lo que representa un riesgo inminente de agotamiento de cuota en el corto plazo (antes de desplegar Cloudflare).

---

## 🏗️ 1. API Backend (NestJS Gateway)

- **Descripción Estratégica**: Es el cerebro transaccional y el motor de sincronización (Gateway). Mantiene la cohesión de todo el ecosistema (Portales, Tablets, Pagos y Trackers).
- **Flujo de Usuario (UX)**: No posee interfaz humana. Ofrece telemetría instantánea y respuesta determinista (ACKs, 401, 402) al resto de interfaces (latencia optimizada).
- **Lógica de Negocio y Reglas**:
  - **Suscripciones**: Valida y castiga la mora de pagos (Error `402 Payment Required`). Actúa como *Kill-Switch*.
  - **Inventario Publicitario (Regla 15 Slots)**: Límite estricto de 15 anuncios/campañas asignables máximo por Tablet.
  - **Doble Ledger Analítico**: RD$1,500 cobrados al anunciante / RD$500 comisionados por campaña/anuncio activo al Taxista, y métricas exigidas (condicionado a >100 puntos GPS válidos en el mes).
  - **Validación Multimedia**: Rechazo estricto de cualquier archivo que no cumpla con MIME `video/mp4`.
- **Protocolos de Datos e Integración**:
  - Conexión a Base de Datos (Supabase Postgres) empleando Connection Pooling (puerto 6543) vía Prisma ORM `v5.22.0`.
  - Exposición de módulos vía REST Express (Prefijo `/api/v1`).
  - Capa de Seguridad (Auth) que valida tokens (HS256 local, off-network) limitando la carga al API remoto de Supabase. Rutas protegidas globales con excepciones explícitas (`@Public()`).
- **Dependencias y Hardware**: Desplegado en VPS (EasyPanel), capado a 512 MB de RAM. Depende drásticamente de Supabase (Auth, Postgres).
- **Tolerancia a Fallos y Casos de Borde**:
  - Evita desconexiones de Vercel/Serverless cerrando explícitamente Prisma `($disconnect)`.
  - Tolerancia ampliada (Timeout a 300s) para ingestas pesadas (archivos/batching).
  - Rate Limiting de 100 request/min para contener ataques tipo DDoS.

---

## 🚖 2. Portal Conductor / Mobile Gateway

- **Descripción Estratégica**: Actúa dualmente como puente de comunicación (4G) hacia la red local de la tablet, y como billetera/herramienta de retención del conductor.
- **Flujo de Usuario (UX)**:
  - Chofer inicia sesión/escanea QR impreso en *Tablet* en la ruta `/check-in`.
  - UI interactiva PWA que muestra: estado de buffer en tiempo real, conectividad, botones de soporte técnico y módulo de referidos.
  - Visualización de suspensiones o advertencias en rojo ante suspensiones por impago.
- **Lógica de Negocio y Reglas**:
  - *Bloqueo Inmediato*: Si backend contesta HTTP 402, la PWA muestra advertencia al conductor y paraliza la transmisión.
  - *Referidos*: Concede automáticamente RD$500 si empareja nuevos agentes (Choferes o Anunciantes).
- **Protocolos de Datos e Integración**:
  - **Batching de 10:1**: Emite datos agrupados cada 10 coordenadas o transcurrido un margen de 60 segundos si el buffer de 10 no se ha llenado (Ahorro del 98% en queries HTTP en la API).
  - Integrado a `/fleet/track-batch` validando el header seguro `x-device-id`.
- **Dependencias y Hardware**: Funciona como PWA sobre navegadores móviles en smartphones estándar.
- **Tolerancia a Fallos y Casos de Borde**:
  - **Túnel 27 de Febrero / Zonas Muertas (Fallo de red)**: Usando la variable `navigator.onLine`, la PWA deja de hacer `fetch` y guarda el buffer infinitamente en el `localStorage` del dispositivo. Al volver la cobertura, hace un REST Bulk con todos los puntos pospuestos.
  - Mitigación de Refresco (AbortError).

---

## 📺 3. Reproductor PWA (Tablet / FullyKiosk)

- **Descripción Estratégica**: Interfaz cliente en el asiento trasero. Componente asíncrono y Offline-First del sistema encargado exclusivamente de reproducir campañas sin consumir excesivo ancho de banda.
- **Flujo de Usuario (UX)**:
  - Carga silenciosa del logo (Splash) -> Validación QR/Device_ID -> Renderizado secuencial e ininterrumpido de videos publicitarios.
- **Lógica de Negocio y Reglas**:
  - Ciclo ininterrumpido a menos que reciba directiva explícita (C2) de apagado (`REBOOT`, `CLEAR_CACHE` o `KILL_SWITCH`).
  - No requiere inicio de sesión, todo el registro se hace por el `DeviceID` autogenerado (`TADSTI-0XX`).
- **Protocolos de Datos e Integración**:
  - Fetch de configuración y manifest (`/api/campaigns/tablet/:deviceId/playlist`).
  - **Supabase Realtime (Broadcast)**: A la espera de eventos `WAKE_UP_CALL` en canal `fleet_sync` para forzar actualizaciones (Sync Inmediato).
- **Dependencias y Hardware**: App de frontend puro, se ejecuta dentro del Kiosko de bloqueo férreo `FullyKiosk Browser` en Android.
- **Tolerancia a Fallos y Casos de Borde**:
  - Almacena activos audiovisuales en la persistencia estática (Cache Storage / IndexedDB). Si el dispositivo carece totalmente de internet, iterará eternamente sus assets cacheados sin romperse.
  - Muerte súbita/Batería: En caso de reinicio de la tablet, el `FullyKiosk` autoarrancará la PWA local, retomando la cola cacheada.

---

## 👔 4. Portal Anunciante (Advertiser BI v6.0)

- **Descripción Estratégica**: Interfaz Premium para marcas y anunciantes B2B. Aporta la transparencia analítica y el entorno de auto-provisión de campañas (SaaS Core).
- **Flujo de Usuario (UX)**:
  - Interfaz *Dark Mode Premium* (React 19, Suspense).
  - Vistas: Dashboard Principal (Resumen KPI), Billing (Facturas), Network (Mapa e impactos reales) e Insights.
  - Subida directa (Drag&Drop) de los creativos `.mp4`.
- **Lógica de Negocio y Reglas**:
  - Visualización del impacto: Total Inversión / Impresiones GPS comprobables.
  - Autogestión segmentada (Localización granular: "Quiero apuntar solo a taxis de Santiago activos").
- **Protocolos de Datos e Integración**:
  - Evita el cuello de botella del API: Se sube video *directamente* a Supabase Storage devolviendo CUID al backend.
- **Dependencias y Hardware**: Next.js 15, PostCSS (Tailwind 4), Hospedado en Docker (EasyPanel - 512MB RAM Limit).
- **Tolerancia a Fallos y Casos de Borde**:
  - Si los componentes no exportan/resuelven en la estructura Next Pages Router, retorna 404 (Ya mitigado al estandarizar el index en `_app.tsx`). Carga progresiva sin colapsar UX.

---

## 🎛️ 5. Dashboard Admin (Master Console)

- **Descripción Estratégica**: Centro de mando universal para operaciones terrestres (SRE). Monitoreo total ("God Mode") del parque vehicular y finanzas.
- **Flujo de Usuario (UX)**:
  - Sistema de menús complejos pero con navegación asegurada.
  - Vista clave `/tracking`: Listado a tiempo real con mapas (*Google Maps integrados* / *Motion Trails* de las últimas 5 ubicaciones, Spotlight para los taxis activos).
  - Resuelve cruces de inventarios (`/devices`, `/fleet`, `/drivers`).
- **Lógica de Negocio y Reglas**:
  - Emitir "WAKE_UP_CALLS" globales (Comandos C2 remotos) y "Flush Cache" a tablets zombis.
  - Liquidación de Finanzas: Un clic para consolidar cortes a fin de mes (Facturas emitidas y nóminas por abonar mediante algoritmos deterministas).
- **Protocolos de Datos e Integración**:
  - Llamadas REST en tiempo real cada 30 segundos (Auto-Refresh) para visualizar telemetría masiva de la red.
- **Dependencias y Hardware**: Dependencias de UI como `Leaflet.Heat` para los hot-spots de la ciudad. Next.js 15 (Capado local a React 15.1.7 estable).
- **Tolerancia a Fallos y Casos de Borde**:
  - Reglas de desborde CSS controladas (Z-Index del nav superpuesto frente a la barra de búsqueda).
  - Error rendering minimizado usando CSR selectivo ante mapas pesados.

---

## 🎬 6. Motor de Video (TAD Remotion)

- **Descripción Estratégica**: Creador de videos programático (Microservicio Aislado). Abstrae la conversión, recorte o composición asíncrona de campañas publicitarias.
- **Flujo de Usuario (UX)**: No es UI de consumo público, pero puede presentar Landing Page premium tipo *Glassmorphism* como placeholder o health-check visible en `<https://tad-remotion.*>`.
- **Lógica de Negocio y Reglas**:
  - Toma el feed JSON suministrado por el panel del Anunciante o Master Console, y exporta y ensambla clips listos en `.mp4`.
- **Protocolos de Datos e Integración**:
  - Subida directa al Supabase Storage tras finalizar ensamblaje. Interacciona vía Webhooks al API Backend cuando el job termina exitosamente o falla.
- **Dependencias y Hardware**:
  - Librerías pesadas (FFMPEG, Chromium interno, `libatk-bridge`).
  - Asignación de Recursos Máxima (*1024MB RAM* permitidos) desplegado en EasyPanel.
- **Tolerancia a Fallos y Casos de Borde**:
  - Aislado 100% de la API principal, evitando que si sufre OOM Kill (Out-Of-Memory por un video muy grande), el backend transaccional continúe operando para los conductores y reportes GPS. Fallos de OOM fuerzan un reinicio natural del worker en EasyPanel.
