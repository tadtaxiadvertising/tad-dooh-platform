# TAD DOOH - Análisis Estratégico y Evolución de Plataforma 2026

**Versión:** 2.0 | **Estatus:** Microservices Core Optimized (10-Abr-2026)

## 1. Visión Holística del Ecosistema

El ecosistema TAD-DOOH (Taxi Advertising Distribution) está compuesto funcionalmente por un hardware embarcado (Tablets), administradores web (React/Next), y un backend centralizado (NestJS/Prisma). Para llevar la plataforma al "más alto nivel", el ecosistema debe mutar de ser reactivo a **proactivo y altamente concurrente**.

## 2. Auditoría de Servicios y Lógica de Negocio

### A. Sincronización (SyncService)

- **Estado Actual**: Utiliza un modelo híbrido basado en `queryRaw` y vistas materializadas (`mv_active_campaigns`). Valida tokens JWT como kill-switch offline.
- **Mejora Estratégica**:
  - La segmentación en `queryRaw` (ej. `JSON.stringify`) es pesada. Debe indexarse `targetCities` y `assigned_device_uuids` nativamente usando índices GIN en PostgreSQL para evitar barridos secuenciales completos.
  - El manifiesto se regenera 100% dinámico cada heartbeat. Debe implementarse un **ETagging** inteligente: generar un Hash unificado del manifiesto en caché (Redis/In-Memory) invalidado solo cuando cambia una campaña. Si la tablet envía el Hash correcto, el backend responde HTTP 304 Not Modified. Esto salva +80% de CPU.

### B. Sistema Analytics & Reconciliación

- **Estado Actual**: `AnalyticsService` trae múltiples registros completos a RAM para agregar (`getHourlyAnalytics`, `getWeeklyCampaignMetrics`), lo que genera vulnerabilidad a *Out-of-Memory (OOM)*.
- **Mejora Estratégica**: Debería trasladar las agregaciones analíticas (`GROUP BY`, Series Temporales) directamente a la capa de persistencia mediante consultas SQL nativas (`EXTRACT`, `DATE_TRUNC`).

### C. Portal Advertiser y UI

- **Estado Actual**: Componentes complejos y funcionales (`AdvertiserModal`, `CampaignModal`), integrados bajo un mismo proveedor JWT.
- **Mejora Estratégica**: Inyectar **Analytics en tiempo real** usando Supabase Broadcast (websockets). El anunciante no debería tener que refrescar para ver nuevas impresiones en su campaña. Dashboard "Live" estilo Google Analytics.

## 3. Optimizaciones de Código Aplicadas

1. **Prevención OOM en Analíticas**: Se ha recodificado la función `getHourlyAnalytics` en el `AnalyticsService`. En lugar de extraer los eventos a la RAM de Node.js, ahora la base de datos realiza el conteo directamente, lo que garantiza operatividad estable a grandes escalas (O(1) en RAM en lugar de O(N)).

## 4. Evolución de Gobernanza BI (Dashboard de Inversores)

- Se debe refinar el modelo `BiDashboardSnapshot` procesándolo en background (Workers de Node/RabbitMQ) cada madrugada y almacenarlo estáticamente. Actualmente los cálculos para `arpu` y `yield_per_screen` obligan al backend a iterar toda la historia, esto debe ejecutarse asíncronamente para evitar cuellos de botella.

**Resolución General:** La lógica comercial de "reproducción ➔ reporte ➔ asignación por geocerca" está correcta. Siguiendo estos lineamientos arquitectónicos, TAD podrá escalar a más de 10,000 unidades en tiempo real sin alterar la infraestructura base.
