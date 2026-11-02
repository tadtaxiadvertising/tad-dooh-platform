# Revisión de Motion UX para TAD

Usar cuando cambie interfaz. La finalidad es explicar orientación, causa y efecto o estado con el menor coste necesario. Una revisión puede concluir que una interacción debe quedar estática; no añadir movimiento solo para cumplir un rol.

## Preparar un cambio observable

1. Identificar audiencia y recorrido: Advertiser campaña/inversión o Driver elegibilidad/tres vías. Conservar la separación comercial de las páginas.
2. Elegir la interacción que aporta valor: narrativa creatividad → pantalla → validación, cambio de presupuesto, consentimiento opcional de producción o comparación mensual/eventos.
3. Capturar antes o describir un escenario reproducible. Registrar componente, estado inicial, acción, resultado, reversión y aceptación. No convertir cada ajuste de texto en un rediseño.
4. Usar tokens y dependencias existentes. Evitar nuevas librerías, fuentes externas, vídeo, mapas o efectos intensivos cuando SVG/CSS y texto resuelvan la comunicación.

## Estados y controles

| Comprobar | Aceptación observable |
| --- | --- |
| Valor sin JS | Propuesta, encabezado, enlaces y CTA esenciales permanecen visibles; no dejar texto oculto por estilos iniciales de animación |
| Selección/slider | Acción mediante touch, mouse y teclado; importe/desglose actualizados, foco estable y validación numérica |
| Producción opcional | Apagada inicialmente, activación explícita y reversible, precio separado; no representa un cobro real |
| Simulación Driver | Anuncios hasta 15; ventas aprobadas y conductores activados identificados como eventos. Salida no confunde total educativo con salario recurrente o wallet |
| Progreso/story | Paso vigente comprensible sin depender de animación; controles visibles, reversión y contenido esencial accesible |
| Carga/error | Mensajes útiles y fallback; no spinners permanentes, estados de éxito ficticios ni solicitudes privadas desde demo |
| Cambio de tamaño | Sin overflow horizontal ni CTA cortado; texto no solapado en 320, 390, 768, 1024 y 1440 px |

## Movimiento con propósito

- Registrar propósito y propiedad animada. Priorizar `transform`/`opacity` y estabilidad de layout. Evitar remount de controles o anuncios repetitivos por cada píxel del slider.
- Duraciones iniciales orientativas del adjunto: microinteracción 120–220 ms, UI 220–400 ms, hero 350–550 ms. Ajustar por claridad y medición; no son un contrato de rendimiento.
- Sin scroll hijacking, sonido automático, flashes ni bucles de decoración costosos. No depender de hover como único acceso.
- `useReducedMotion`/`prefers-reduced-motion` suprimen desplazamiento y decoración; el estado final conserva toda la información. Comprobar también transiciones CSS y SVG.
- Las animaciones fuera de vista o pestaña no deben consumir recursos sin necesidad. Elegir carga diferida cuando proteja la primera vista.

## Accesibilidad y lectura

- Orden de tabulación, foco visible, enlace para saltar navegación y headings coherentes.
- Labels asociados a inputs; rangos con unidad e información equivalente para lector de pantalla. Usar anuncios de cálculo moderados, no repetidos por frame.
- Contraste de texto/controles comprobado sobre la superficie real; no usar color como único indicador. Iconos decorativos ocultos a tecnologías de asistencia y visuales significativos con alternativa.
- Controles suficientemente grandes para touch, acciones equivalentes a teclado y zoom sin pérdida de contenido.
- Si hay dialog, foco inicial, contención, Escape y retorno al disparador. No agregar un modal para registro privado, banco o contrato.
- WCAG 2.2 AA es meta de aceptación; un screenshot no certifica por sí solo lector de pantalla, contraste completo o conformidad.

## Verificación visual y rendimiento

El checkout inspeccionado el **2026-11-01, America/La_Paz**, en `63c807eba7b2c016411337f14345ae8c1ae5901d` (merge #176) incluye estos candidatos; revalidar scripts, assertions y configuración antes de ejecutar. Los cambios de #175/#176 forman parte del baseline, no objetivos pendientes de reaplicación:

| Recurso del repo | Uso y límite |
| --- | --- |
| `scripts/landing-v3-smoke.cjs` | Aceptación local de Advertiser. Su nombre histórico V3 no significa que el producto deba recuperar tres roles; inspeccionar assertions actuales |
| `scripts/driver-landing-smoke.cjs` | Smoke local de Driver; no inicia servidores ni navega registro/login |
| `scripts/landing-v3-measure.cjs` | Candidato para medición de página; comprobar entorno, dependencias y alcance antes de usar |
| `scripts/landing.test.cjs`, `scripts/driver-landing.test.cjs` | Contratos y lógica local; no sustituyen inspección en navegador ni auth real |
| `apps/advertiser/tsconfig.landing.json`, `apps/driver/tsconfig.landing.json` | Tipado focalizado; su PASS no acredita typecheck global |

Los smokes exigen loopback explícito y servidores ya iniciados con configuración aislada; no levantarlos apuntando API a servicios compartidos. Las capturas opcionales deben guardarse en ruta absoluta fuera del repo y revisarse para excluir secretos/PII. Ejecutar controles apropiados al cambio, sin repetir suites ya verdes si no hay nueva modificación o duda.

Registrar dispositivo/viewport, navegador, red/CPU simuladas, modo dev/build, SHA y fecha/zona. Comparar antes/después sobre el mismo escenario; una medición de desarrollo no acredita producción.

- LCP ≤2.5 s, INP ≤200 ms y CLS ≤0.1 son objetivos de p75 móvil real cuando haya datos suficientes. No presentar un smoke o Lighthouse aislado como p75 real.
- Comparar JS gzip con el baseline relevante, layout shifts y actividad innecesaria. No afirmar cumplimiento de bundle sin medición.
- Si faltan navegador, dependencia o datos de campo, registrar NO EJECUTADO y el límite. Continuar verificaciones independientes; no inventar capturas o cifras.

## Sección breve para PR/checkpoint

```text
Motion UX review
Propósito y componente:
Estado inicial → acción → resultado → reversión:
Decisión de movimiento o razón para mantenerlo estático:
Teclado/touch/foco y reduced motion:
Viewports y evidencia antes/después:
No-JS, error, carga y red lenta:
Métricas, entorno y límites:
Pendientes, riesgo y reversión:
```

Un cambio documental del paquete usa validación estructural y revisión de referencias; no exige iniciar la aplicación ni producir screenshots de una UI sin cambios.
