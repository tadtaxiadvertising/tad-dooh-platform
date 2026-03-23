---
title: RADAR DE DETALLES - TAD DOOH v4.6
status: ACTIVE
updated: 2026-03-23
author: Antigravity AI
---

## 🎯 Radar de Detalles Críticos

Este documento es el registro de "bugs visuales", inconsistencias de flujo y mejoras de UX detectadas por Antigravity y Arismendy.

### 🔴 PRIORIDAD ALTA (Bloqueo de Benchmark)

- [ ] **Validación de Tablets en Registro de Drivers**: Actualmente, si se intenta registrar un Driver con un `deviceId` que no existe en el inventario, el Backend arroja un error 400 seco.
  - *Mejora Sugerida*: El modal debe avisar que el ID no existe ANTES de enviar.
- [ ] **Sincronización de Cash-Flow**: Las tarjetas de resumen (Cards de MRR/Ingresos) necesitan un trigger de refresco más agresivo al cambiar de pestaña.
- [ ] **Persistencia de Filtros**: Al navegar entre 'Conductores' y 'Finanzas', los filtros de búsqueda se pierden.

### 🟡 PRIORIDAD MEDIA (Pulido Estético)

- [ ] **Animación de Carga en Mapas**: El mapa de 'Tracking' tarda en pintar los marcadores. Necesitamos un Skeleton UI o un Spinner más suave.
- [ ] **Iconografía en Nómina**: Algunos conductores no tienen la inicial del nombre centrada correctamente.

### 🟢 PRÓXIMAS MEJORAS (Roadmap AI)

- [ ] **Pre-carga de Media**: Una barra de progreso global para cuando se suben videos de >200MB.
- [ ] **Alertas de Desconexión**: Notificación push si una de las 10 tablets de la prueba pierde señal por >5 min.

---
> [!TIP]
> **Arismendy**: Puedes añadir cualquier detalle que veas en la plataforma directamente aquí abajo o decírmelo y yo lo anotaré con la etiqueta `#UserFeedback`.
