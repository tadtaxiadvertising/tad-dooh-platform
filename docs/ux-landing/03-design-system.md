---
type: guide
status: maintained
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Sistema visual y accesibilidad

Se extiende la estética TAD existente: fondo carbón/verde, acento amarillo, bordes finos, tarjetas con relieve moderado y titulares amplios. CSS Modules limita el alcance a las landings. La escena taxi/tablet usa CSS, el comando de flota SVG local y los iconos Lucide ya instalados. No hay fotos remotas, fuentes nuevas, vídeos automáticos ni efectos WebGL.

Ritmo: hero editorial, recorrido de cuatro pasos, demo útil, explicación breve, tres historias, preguntas y conversión. Grillas se apilan en móvil; controles con alto mínimo de 44 px, etiquetas asociadas y números tabulares. El color se acompaña siempre de texto. Los cambios anuncian un resumen breve mediante `aria-live`, sin convertir toda la página en una región viva.

Se utilizan botones con `aria-pressed`, `details/summary` para FAQs, enlaces nativos, skip link y foco visible. Los controles conservan acceso por teclado; no se depende de hover. Sin JavaScript los contenidos editoriales y destinos permanecen visibles. `prefers-reduced-motion` elimina animaciones/transiciones y desplazamiento suave.

Comprobar visualmente 320, 390, 768 y 1440 px, desbordamiento, foco y contraste. La inspección manual y el smoke complementan las pruebas de lógica; no sustituyen una auditoría completa WCAG con tecnologías de asistencia.
