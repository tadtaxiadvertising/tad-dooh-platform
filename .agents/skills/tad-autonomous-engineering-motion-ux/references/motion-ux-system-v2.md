# Sistema Motion V2: criterios de implementación

Propuesta reutilizable; no es un reporte de QA ni prueba de cambios ya aplicados. Al implementar, trasladar las decisiones relevantes a `docs/ux-landing/motion-system-v2.md` del producto con su SHA y evidencia. Una actualización de esta skill no crea ese documento de aplicación.

## Tokens y propiedad

Rangos iniciales: micro 130–200 ms, panel 220–380 ms y escena 420–850 ms. Definir ease estándar y springs suaves en el sistema existente; documentar repeticiones y delays que expliquen jerarquía. Ajustar tras observar lectura, input y perfilado. Estas cifras no son métricas verificadas ni duraciones obligatorias para todos los dispositivos.

| Motor | Responsabilidad | Límite |
| --- | --- | --- |
| CSS | Foco, estados simples y decoración ligera | Respetar media query de movimiento reducido; no ocultar contenido esencial inicial |
| Motion existente | Estado de componentes React, gestos y transición de UI | No remontar inputs/output para simular feedback; no añadir otro runtime por comodidad |
| GSAP seleccionado | Timeline de una escena o relato, ScrollTrigger si aporta significado | Scope de componente, cleanup de contexto, listeners y efectos diferidos; no controlar la propiedad que anima Motion |

Para cada componente: `evento → propiedad/motor → significado → estado final → reversión → fallback reducido`. Evitar filtros, blur, sombras y animación de layout simultánea salvo evidencia de coste aceptable. No hacer depender la lectura de completar una timeline.

## SSR, ciclo de vida y preferencias

- HTML inicial con encabezado, condiciones, importe, enlaces y CTA legibles. La hidratación mejora la experiencia; no rescata texto transparente.
- Preferencia reducida o desconocida: estado estático seguro; sin parallax, pinning o traslaciones grandes. Texto y controles conservan el resultado completo. Comprobar JS, CSS y SVG.
- Medios/escenas complejas cargan cerca del viewport o tras interacción cuando el análisis de LCP/bundle lo justifique; el hero mantiene fallback SSR y dimensiones estables.
- Suspender efectos fuera de pantalla/pestaña. Desmontar y volver a montar debe limpiar timers, rAF, observers, listeners, ScrollTriggers y timelines; comprobar también cambios de dependencias y preferencia.
- Una sola animación de importe por cambio significativo, con foco estable y sin animación al montar por defecto. Anunciar valores confirmados, no cada frame.
- Layout fluido y capas decorativas contenidas. No imponer un sustituto fijo de 360/520 px para corregir otra altura fija: demostrar tamaño, texto, foco y CTA en navegador.

## Antecedentes que no constituyen aceptación

La referencia local anterior contenía recomendaciones CSS y afirmaciones de verificación por búsqueda de texto, con smoke bloqueado. Esas recetas se reemplazan por los criterios observables anteriores. No trasladar movimientos de worktrees/submódulos al procedimiento normal ni afirmar que un cambio en disco ya solucionó responsive.

La [matriz de QA](responsive-motion-qa.md) define la evidencia necesaria; la [selección de librerías](animation-library-selection.md) define procedencia, licencia y compatibilidad antes de adoptar código.
