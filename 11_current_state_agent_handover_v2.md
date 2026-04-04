# 🧠 11 — ESTADO ACTUAL Y HANDOVER (04 Abril 2026)

> **Documento de Sincronización para Próximo Agente AI**
> **Última actualización**: 04 de Abril de 2026 (v5.8)
> **Objetivo**: Proveer un resumen determinista e hiper-actualizado del código base, la infraestructura, las reglas de negocio recientes y los siguientes pasos para la plataforma TAD DOOH.

---

## 1. 🏗️ Infraestructura & Fleet Management (v5.8)

- **Bulk Synchronization API (v1.1)**: Refinado el motor de sincronización masiva para el piloto de Santiago (`STI0001-STI0010`). Ahora, el cálculo de metadatos de campaña y asignación de medios ocurre en O(1) gracias a la denormalización estratégica de `CampaignMetric`.
- **Santiago Pilot (Live Monitoring)**: Establecido un sistema de alertas proactivas vía Cron/WhatsApp para detectar desconexiones de fleet en Santiago. El dashboard administrativo filtra dinámicamente estas 10 unidades para monitoreo prioritario.
- **Next.js Worker Offload & Docker Hardening**: Se mantienen los límites de RAM (512MB default, expansible a 1GB) con `webpackBuildWorker: true` para evitar OOM durante despliegues en EasyPanel.

## 2. 🧮 Ecosistema de Inteligencia Financiera (v6.0)

- **Double-Entry Ledger Implementation**: Se ha terminado la integración del libro mayor contable en el backend. Toda transacción, suscripción o pago a chofer genera un asiento contable automático que alimenta los reportes de "Unit Economics" en tiempo real.
- **Driver Portal (Nómina & Comisiones)**: Los choferes visualizan ahora su acumulado exacto (RD$ 500 por anunciante emitido) y bonificaciones de referidos (RD$ 500) en un modal interactivo con histórico de pagos procesados mediante el `FinanceService`.
- **Auditoría de Pauta (Advertiser Transparency)**: Se cerró el ciclo de reportes para Anunciantes. El endpoint `/api/advertiser/campaigns/:id/metrics` entrega ahora un desglose pormenorizado de impresiones, vistas y engagement correlacionado directamente con los archivos multimedia pautados.

## 3. 🎯 Modelo de Datos Unificado (Campaign-Media-Metric)

- **Coupling Robusto**: Se refactorizó la lógica en Prisma para asegurar que cada `Campaign` esté vinculada indisolublemente a su `Media` y sus `Metrics`. Esto previene el "Ghost Metrics" (métricas sin campaña huérfana) y facilita auditorías regulatorias de pauta publicitaria.
- **Zero-Trust Onboarding Completion**: El flujo de registro de choferes en `tad-driver.html` y PWA ahora obliga a la aceptación digital del contrato y política de privacidad. Sin estatus `ACTIVE` (basado en pago de membresía de RD$6,000), el hardware de pauta está bloqueado a nivel de API.

## 4. 🗺️ Geofencing & Telemetría (Heatmaps)

- **Leaflet.Heat Persistence**: El mapa administrativo ya no renderiza pines individuales por defecto, sino un mapa de calor dinámico para Santiago. Se optimizaron las capas de saturación para no comprometer el motor de renderizado del navegador.
- **Spotlight Trail**: El tracking de vehículos en vivo dibuja ahora un rastro de luz (_Glow Trail_) de los últimos 5 puntos GPS (verde para activo, amarillo para idle) mejorando la percepción de movimiento fluido.

---

## 🎯 PRÓXIMAS ACCIONES (Backlog Crítico y Continuación)

1. **Escalamiento de Medios (Mobile-First)**: El portal del anunciante debe soportar subidas de videos pesados. Considerar habilitar resumable uploads (TUS protocol) si los archivos exceden los 50MB.
2. **Dashboard BI (Fase 3)**: Integrar visualización de "Cost Per Impression" (CPI) en tiempo real basada en el gasto de campaña activo vs. impresiones recolectadas del fleet.
3. **E2E Stability**: Ejecutar mensualmente `test_production.sh` para verificar que los cambios en el backend de contabilidad no rompan el flujo de sincronización del player de las tablets.

> ✅ **Nota de estilo UI:** Mantener la estética _Premium Dark Mode_ (#0a0a0a y #FFD400). Todo botón de acción debe ser un `AntigravityButton` con telemetry feedback activado. No uses `window.alert`.

---

### FIN DEL REPORTE - ESTADO LISTO PARA DESARROLLO (v5.8)
