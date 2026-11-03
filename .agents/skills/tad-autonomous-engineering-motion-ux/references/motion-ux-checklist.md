# Revisión Motion UX por cambio

Usar cuando cambie interfaz. El rediseño completo se contrasta con A1–A4/D1–D4 de los [blueprints](creative-experience-blueprints.md); una corrección menor prueba su propio alcance y preserva el resto. Un cambio documental del paquete se valida como documentación, sin iniciar la aplicación.

## Propósito y contrato

- Identificar audiencia, componente y acción observable; conservar landings comerciales separadas y onboarding oficial.
- Documentar estado inicial, input, movimiento, significado, resultado, reversión y foco. No contar fades/hover decorativo como interacción sustancial.
- Anunciante: producción inicialmente apagada, coste separado, motor compartido, ejemplo no vinculante cuando falte contrato de tarifa vigente.
- Driver: anuncios elegibles hasta15, ventas aprobadas y activaciones aprobadas como eventos; misma fuente de cálculo, sin confundir demo, salario, wallet o pago.
- Carga/error/slow/no-JS y reduced motion preservan información esencial; no hay éxito ficticio, consulta privada ni tráfico remoto inesperado desde una demo.

## Movimiento y lectura

- Un único motor por propiedad; duraciones/tokens del [sistema](motion-ux-system-v2.md), ajustados por claridad y perfilado.
- Encabezado, enlaces, condiciones e importe legibles en HTML inicial; no usar opacity0 en ancestros que oculten contenido hasta hidratar.
- Slider y output permanecen montados, foco estable; lectura numérica inmediata, anuncios accesibles al confirmar valores significativos, sin flood por frame.
- Fallback estático con preferencia desconocida/reducida; comprobar también CSS/SVG. Sin autoplay con sonido, scroll hijacking, flashes ni loops permanentes costosos.
- Scope/cleanup de listeners, timers, observers, rAF y timelines. Desmontar o cambiar dependencias/preferencia no acumula efectos. Pausar fuera de vista/pestaña.

## Móvil, acceso y evidencia

- Sin overflow horizontal, clipping de información, hit areas tapadas o CTA inaccesible. Contención horizontal y visibilidad al llegar a cada sección; no exigir contenido inferior dentro del primer viewport.
- Touch emulado documentado, teclado, foco visible, zoom200%, landscape, labels y contraste comprobados. Un perfil emulado o WebKit no equivale a un móvil físico.
- Estados antes/después en entornos comparables; capturas revisadas más vídeo/evidencia equivalente de interacciones. Un screenshot no demuestra controles, no-JS, lector de pantalla o conformidad completa.
- QA/perf y matriz pertinente según [Responsive/Motion QA](responsive-motion-qa.md); anotar ausencias y pendientes. No afirmar p75 real ni delta de bundle sin datos comparables.
- Librería/componente adoptado con URL/SHA, licencia/notices, dependencias y coste registrados; si se descarta, alternativa funcional demostrada. Consultar [selección](animation-library-selection.md).

## Entrega

Usar la [plantilla](../templates/PR-MOTION-UX-REVIEW.md) en un PR autorizado o adaptar sus campos al checkpoint. Separar IMPLEMENTADO de VERIFICADO, resultados de UI de seguridad/finanzas y checks focalizados de CI global. No marcar listo para merge con fallos o evidencia pendiente. Mantener alcance, riesgo, reversión y siguiente paso verificables.
