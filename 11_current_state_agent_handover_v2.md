# 🧠 11 — ESTADO ACTUAL Y HANDOVER (03 Abril 2026)

> **Documento de Sincronización para Próximo Agente AI**
> **Última actualización**: 04 de Abril de 2026 (v5.7)
> **Objetivo**: Proveer un resumen determinista e hiper-actualizado del código base, la infraestructura, las reglas de negocio recientes y los siguientes pasos para la plataforma TAD DOOH.

---

## 1. 🏗️ Estado de la Infraestructura (v5.6)

Se han realizado optimizaciones críticas para manejar ambientes VPS de bajos recursos, asegurando **99.9% de Uptime** y reduciendo drásticamente la carga de CPU y Memoria en el servidor de EasyPanel:

- **Next.js Worker Offload**: En `next.config.js`, `webpackBuildWorker` configurado a `true` y `parallelServerCompiles` en `false` para evitar el colapso (OOM) al compilar.
- **Docker VPS Optimization**: Contenedores limitados para no devorar la RAM, implementando Swarm Proxy interno (`http://tad-api:3000`) sin tocar interfaces públicas.
- **Bulk Synchronization API**: Creado nuevo motor de caché iterativo y sincronización en bloque (`Bulk Sync API`). En lugar de que el endpoint `/api/sync/:deviceId` calcule metadatos costosos, el flujo delega pre-cómputos y reduce peticiones N+1.
- **Santiago Pilot Infrastructure (v5.7)**: Implementado el modo de monitoreo dedicado para el piloto de Santiago. El Dashboard Principal cuenta ahora con un interruptor "STI PILOT" que filtra todas las métricas en tiempo real para las 10 unidades iniciales (`STI0001-STI0010`).
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

- Todo endpoint API sensible está protegido por `SupabaseAuthGuard` a través de JWT. Se corrigió un fallo crítico en el Guard que otorgaba privilegios de `ADMIN` por defecto; ahora el fallback es `GUEST`.
- **Advertiser Portal RBAC (v2.0)**: El endpoint `/:id/portal` ha sido blindado. El backend ahora valida que el `user.id` del token coincida exactamente con el `advertiserId` solicitado, impidiendo el acceso cruzado de marcas.
- Un anunciante ahora cuenta con su PWA autónoma (`tad-advertiser.html`), usando registro directo, para administrar inversiones y solicitar "Adiciones o Extensiones de Campaña" enviadas a una canasta interactiva pending de revisión para el Administrador de Flota.

## 5. 📜 Aceptación Legal y Zero-Trust Onboarding

- **Onboarding Workflow**: Implementado un flujo digital en el `Driver Portal` y PWA (`tad-driver.html`) que obliga la aceptación dual de "Acuerdo de Servicios y Comodato" y "Política de Privacidad y Tratamiento de Datos".
- **Zero-Trust Assignation**: La asignación de Hardware en el backend (`assignDevice`) ahora requiere estrictamente el pago previo de la membresía de RD$6,000, implementando un Hard Block (estado HTTP 403 Forbidden) para quien no complete todo el flujo hasta su estado `ACTIVE`.

## 6. 🎨 Mejoras de Experiencia de Usuario Web y Mapas

- **PWA Gestures y Mapas**: Reparación de _rendering_ para remover líneas de cuadrícula negras/blancas (_tile gaps_) causadas por antialiasing en mapas Leaflet (escalado subpixel en `globals.css`).
- **Desplazamiento inercial**: Inyección global de comportamiento `overscroll-behavior-y: none` que neutraliza el rebote molesto del Pull-To-Refresh y habilita inercia fluida o _momentum scrolling_ via `-webkit-overflow-scrolling: touch` para garantizar que las webapps operen de manera idéntica a una app nativa en iOS/Android.

---

## 🎯 PRÓXIMAS ACCIONES (Backlog Crítico y Continuación)

Si estás asumiendo el desarrollo a partir de este punto, **tu enfoque debe estar en:**

1. **Gestión de Sesiones (Login)**: Mantener validaciones strictas para `refresh_tokens` debido a que NextAuth a veces genera ciclos infinitos entre `/` y el endpoint `api/verify`. Revisa siempre el `axios.interceptor` de frontend.
2. **Dashboard BI Dashboard**: Continuar con la fase 2 documentada en `10_bi_dashboard_architecture.md`: consolidar API NestJS, y crear interfaces `.tsx` que muestren semáforos limpios, sin peticiones cascada innecesarias (SWR es tu amigo).
3. **Escalamiento E2E Test Suite**: Tienes `test_production.sh` preparado en el proyecto. Debes asegurar Playwright pasando para las nuevas características financieras y fallbacks usando el subverted TypeScript Next Environment (`tests/tsconfig.json`).

> ✅ **Nota de estilo UI:** TODO el frontend debe sentirse _Premium_, _Dark Mode_ (`CartoDB DarkMatter` nativo o similares), y usar colores corporativos **#FFD400**. Usa el componente encapsulado `AntigravityButton` y Notificaciones Oscuras (`toast.success` vía Sonner) en cada mutación de Next/React. No uses `window.alert`.

---

### FIN DEL REPORTE - ESTADO LISTO PARA DESARROLLO
