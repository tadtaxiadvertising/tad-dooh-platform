---
type: guide
status: maintained
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Sistema visual, movimiento y accesibilidad

Estética TAD: fondo carbón, amarillo institucional `#FFD400`,
titulares editoriales, tarjetas profundas y glassmorphism moderado.
CSS Modules y tokens compartidos evitan efectos globales nuevos.
La escena taxi/tablet usa CSS/SVG local e iconos Lucide instalados.
No se introducen fotos de red, mapas, tiles, fuentes nuevas, vídeos
automáticos ni WebGL.

Ritmo: hero con **2 opciones**, recorrido de cuatro pasos,
laboratorios de presupuesto y R6, educación de métricas,
**dos historias**, FAQs y conversión. Las tarjetas utilizan
grillas de dos columnas en escritorio y apilado en móvil.
Controles táctiles >=44 px, etiqueta y foco visibles, moneda
legible, contraste y números tabulares.

El selector usa botones con `aria-pressed`, FAQ con `details/summary`,
skip link y enlaces nativos. Sin JS los destinos siguen utilizables.
`prefers-reduced-motion` elimina movimientos no esenciales y scroll
suave. No depender de hover, ni de color como único indicador.

Inspección visual requerida en 320, 390, 768 y 1440 px,
desbordamiento, foco, flujo de lectura y contraste; el smoke no
sustituye auditoría completa WCAG con lectores de pantalla.
