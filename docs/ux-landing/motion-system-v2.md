# TAD Creative Motion V2 — mapa de implementación

Fecha:2026-11-02, America/La_Paz. Base0df24484, rama codex/creative-motion-v2-20261102. Este documento describe decisiones y aceptación; resultados ejecutados en ../engineering-loop/STATE.md.

## Propósito y coreografía

| Superficie | Input → cambio semántico | Movimiento y reversión | Reduced/SSR/foco |
| --- | --- | --- | --- |
| Hero Anunciante | Selección de creativo y demo → ejemplo visible en tablet | Transferencia local contenida y replay, finita | HTML visible, controles nativos, fallback estático, foco en disparador |
| Historia campaña | Paso/botones → explicación y escena actual | Transform contextual breve; anterior/siguiente revierte | Sin scroll hijacking/pinning; paso legible sin movimiento |
| Studio | Pantallas/meses/producción → importe y desglose del motor compartido | Salida estable, feedback180ms tras cambio, producción opt-in reversible | Sin animación al montar, reduce/unknown estático, foco del slider retenido |
| Impacto | Escenario/interpretación → rango y supuestos de projection | SVG ligero, indicadores relacionados con datos ya calculados | Etiquetas equivalentes, fuente/warnings presentes; no simular métricas reales |
| Hero Driver | Ver demo/repetir/restablecer → tablet ilustrativa activa o reposo | Trayectoria finita del taxi, sin autoplay permanente | SVG SSR; control por teclado/touch; estado final estático reducido |
| Quince slots | Slider → n anuncios y ejemplo mensual | Solo slots que cambian y total180ms | Contador textual, sin significado solo por color; output estable |
| Tres vías | Botón/contador → condición y contribución de la vía | Foco/selección contextual y etiqueta TextMorph corta | Contadores preservados, mensual/eventos separados, sin wallet |
| Referido | Siguiente/anterior → condición de cada hito | Cinco pasos controlados sin prometer bono por clic | Texto en SSR; bono condicionado a activación aprobada |

## Motores y procedencia

Framer Motion instalado controla UI React; Web Animations API y CSS local controlan transform de escenas/importes. Ninguna propiedad tiene dos dueños. Duraciones iniciales orientativas130–200ms micro,220–380ms panel,420–850ms escena; observar en navegador antes de afirmar resultado.

TextMorph deriva de Motion Primitives@120f64f6ca60348e251f929e9c81f11ccbe45eda. Source y licencia se leyeron al mismo SHA. packages/ui/components/TextMorph.NOTICE.md conserva atribución y MIT. Se adapta a framer-motion, span, preferencia desconocida/reducida estática y primer árbol de hidratación igual al SSR. No se instala motion ni paquetes Pro.

GSAP candidato: descartado para esta iteración de historias con selección manual, porque el motor existente y WAAPI permiten la secuencia finita sin instalar sobre junctions compartidas. La aceptación es equivalente demostrado, no un placeholder ni una afirmación de GSAP usado. No se justifica smooth-scroll/WebGL/vídeo ni nuevas fuentes por efecto decorativo.

## Ciclo de vida y acceso

Sin opacity0 en contenido esencial SSR. Elementos de input no se remontan para animar un número; cancelar efectos previos y cleanup de animaciones, temporizadores/listeners al desmontar. No autoplay con sonido ni escenas permanentes fuera de vista. Preferencia reducida/unknown usa estado final útil; CSS también respeta reduce.

Mobile-first: texto y controles fluidos, CTA accesible, focus-visible, áreas táctiles44px como meta y sin hover exclusivo. Clipping solo decorativo. Comprobar contención horizontal de contenido esencial, no exigir que todo el contenido esté sobre el primer pliegue. No ocultar overflow global como arreglo.

## Verificación y métricas

Baseline visual capturado a320/390/768/1440 y no-JS390. La matriz final ampliará360/375/412/430/1024 y667×375 landscape, normal/reduce, teclado/touch emulado, zoom200% y datos largos. Registrar lo no ejecutado. Screenshot/axe/Chromium emulado no certifican WCAG o dispositivo físico.

Coste: medir JS inicial/diferido y gzip con metodología comparable; sin baseline compilado equivalente no afirmar delta. LCP/INP/CLS p75 requieren datos de campo; Lighthouse no sustituye RUM. No acreditar runtime compilado con next dev. Gates pendientes y evidencia final en STATE.md.

## Contratos preservados

Producción creativa OFF en landing/onboarding; proyección y quote comparten fuente existente y se presentan como ejemplo no vinculante. No se escoge nueva tarifa real al retirar copy técnico/tabla redundante. Driver conserva15 anuncios, ventas y referidos elegibles sin cap comercial del helper, mensual/eventos y precisión segura. Signup, identidad, pagos, esquema y Player no cambian.
