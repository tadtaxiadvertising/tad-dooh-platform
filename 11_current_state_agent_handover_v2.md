# 🧠 11 — ESTADO ACTUAL Y HANDOVER (01 Abril 2026)

> **Documento de Sincronización para Próximo Agente AI**
> **Última actualización**: 01 de Abril de 2026
> **Objetivo**: Proveer un resumen determinista e hiper-actualizado del código base, la infraestructura, las reglas de negocio recientes y los siguientes pasos para la plataforma TAD DOOH.

---

## 1. 🏗️ Estado de la Infraestructura (v5.6)

Se han realizado optimizaciones críticas para manejar ambientes VPS de bajos recursos, asegurando **99.9% de Uptime** y reduciendo drásticamente la carga de CPU y Memoria en el servidor de EasyPanel:

- **Next.js Worker Offload**: En `next.config.js`, `webpackBuildWorker` configurado a `true` y `parallelServerCompiles` en `false` para evitar el colapso (OOM) al compilar.
- **Docker VPS Optimization**: Contenedores limitados para no devorar la RAM, implementando Swarm Proxy interno (`http://tad-api:3000`) sin tocar interfaces públicas.
- **Bulk Synchronization API**: Creado nuevo motor de caché iterativo y sincronización en bloque (`Bulk Sync API`). En lugar de que el endpoint `/api/sync/:deviceId` calcule metadatos costosos, el flujo delega pre-cómputos y reduce peticiones N+1.
- **Zero-Revenue Fallback Playlist**: Implementado un fallback resiliente para mostrar contenido predeterminado institucional de TAD cuando falla la red, el pago no se ha reflejado, o las campañas asignadas vencieron. Esto previene el efecto pantalla negra o "Ghosting".

## 2. 🧮 Módulo de Inteligencia Financiera & BI (v1.0)

La plataforma ahora rastrea minuciosamente todo flujo de liquidez cruzado (`Subscriptions`, `Playbacks`, `Transactions`) a través del "Truth Bridge" documentado en `10_bi_dashboard_architecture.md`.

- **Notificaciones Automáticas (Email + WhatsApp)**: Se terminó de interconectar el `EmailService` y API externa para envío automático de Facturas, Retenciones (ITBIS), Auditorías de Campaña (con la terminología afinada: **Promociones (Ciclos) Contratados** en la UI de reportes) y Confirmaciones de Pago a Conductores (RD$ 500 por anunciante emitido). En `/api/finance` estos procesos se disparan determinísticamente.
- **Sistema de Referidos Automatizado**: El sistema retribuye inteligentemente **RD$ 500.00** extra a los conductores que vinculen a nuevas marcas a la plataforma. La comisión se pre-procesa en el estado de cuenta y aparece en los modales de nómina pendientes interactivos.
- **Proxy Binario y Descargas de CSV/PDF**: Corregido bug fatal en `[...path].ts` (Proxy) que corrompía la descarga de binarios de reportería mediante la eliminación manual de la compresión `accept-encoding` del header.

## 3. 🗺️ Rastreo y Telemetría Semafórica
- **Leaflet.Heat y Rendimiento GPS**: Sustitución definitiva del renderizado de pines masivos por mapa de calor (`leaflet.heat`) nativo. Se implementaron en UI `HeatmapLayers` desacopladas para controlar intensidad (`blur`, `radius`) logrando trazar una geocerca de saturación sin explotar la GPU del navegador del Administrador de la plataforma.
- **Control de Spotlight & Resplandor Neon**: El panel master rastrea y resalta el auto seleccionado bajando la opacidad de los no-activos y dibujando un _Glow Trail_ de sus últimos 5 nodos GPS en verde/amarillo.

## 4. 🔐 Autenticación y Portales Desacoplados
- Todo endpoint API sensible está protegido por `SupabaseAuthGuard` a través de JWT extraídos por un Regex a prueba de fallos de comas dobles HTTP (`Bearer xyz, Bearer xyz`). Sin embargo, para flujos comerciales (Landing Anunciantes y Player Conductores) se liberó estrictamente el uso de decoradores `@Public()`.
- Un anunciante ahora cuenta con su PWA autónoma (`tad-advertiser.html`), usando registro directo, para administrar inversiones y solicitar "Adiciones o Extensiones de Campaña" enviadas a una canasta interactiva pending de revisión para el Administrador de Flota.

---

## 🎯 PRÓXIMAS ACCIONES (Backlog Crítico y Continuación)

Si estás asumiendo el desarrollo a partir de este punto, **tu enfoque debe estar en:**

1. **Gestión de Sesiones (Login)**: Mantener validaciones strictas para `refresh_tokens` debido a que NextAuth a veces genera ciclos infinitos entre `/` y el endpoint `api/verify`. Revisa siempre el `axios.interceptor` de frontend.
2. **Dashboard BI Dashboard**: Continuar con la fase 2 documentada en `10_bi_dashboard_architecture.md`: consolidar API NestJS, y crear interfaces `.tsx` que muestren semáforos limpios, sin peticiones cascada innecesarias (SWR es tu amigo).
3. **Escalamiento E2E Test Suite**: Tienes `test_production.sh` preparado en el proyecto. Debes asegurar Playwright pasando para las nuevas características financieras y fallbacks usando el subverted TypeScript Next Environment (`tests/tsconfig.json`).

> ✅ **Nota de estilo UI:** TODO el frontend debe sentirse *Premium*, *Dark Mode* (`CartoDB DarkMatter` nativo o similares), y usar colores corporativos **#FFD400**. Usa el componente encapsulado `AntigravityButton` y Notificaciones Oscuras (`toast.success` vía Sonner) en cada mutación de Next/React. No uses `window.alert`.

---

**FIN DEL REPORTE - ESTADO LISTO PARA DESARROLLO**
