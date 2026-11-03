# Blueprints de experiencia creativa V2

Especificación de diseño derivada del material aportado el 2026-11-02, America/La_Paz. **No acredita componentes ya implementados.** Leer al planificar o construir el rediseño. Antes de crear algo, inspeccionar la experiencia actual y reutilizar componentes que ya satisfagan su aceptación.

Una interacción sustancial cambia información o un estado comprensible por input del visitante, con control, reversión y prueba. Un fade, hover decorativo o animación que se ejecuta sola no cuenta. Las cuatro interacciones son aceptación acumulada del rediseño completo, no requisito de cada corrección menor.

## Anunciante: la marca viaja a la pantalla

| Interacción | Estado y acción | Resultado, reversión y prueba |
| --- | --- | --- |
| A1. Taxi/tablet reactivo | Hero SSR con taxi/tablet local SVG o capas; seleccionar uno de 2–3 ejemplos y pulsar Ver demostración/Repetir | El creativo seleccionado pasa a la tablet mediante una trayectoria contenida. Texto y nombre del ejemplo permanecen visibles. Cambiar selección revierte/reproduce; control por tap y teclado. Probar selección, replay, reduced motion y primer render sin JS |
| A2. Historia de campaña | Cuatro pasos: Crear → Programar → Reproducir → Medir; botones Anterior/Siguiente y scroll nativo opcional | El paso actual cambia escena y explicación, con progreso semántico. GSAP/ScrollTrigger solo cuando mejore la relación entre escenas. En móvil los botones siempre funcionan; swipe es adicional. Sin pinning obligatorio. Probar ir/volver y contenido accesible con movimiento reducido |
| A3. Campaign Budget Studio | Pantallas, meses, ciudad y método del contrato; producción creativa inicialmente OFF | El mismo calculador de onboarding actualiza importe y desglose; producción ON revela ejemplos ilustrativos y su coste separado; OFF los revierte. No usar remount para animar el importe ni perder foco. Probar OFF→ON→OFF, teclado, valores extremos y handoff permitido |
| A4. Explicación de impacto | Elegir escenario o abrir Supuestos en una visualización SVG ligera | Relacionar entradas, supuestos y rango estimado; cambiar escenario actualiza fuente/incertidumbre y gráfico legible. No inventar GPS, métricas verificadas, usuarios únicos ni ROI. Probar que texto y gráfico representen el mismo resultado y puedan leerse estáticos |

CTA: enlace real al onboarding autorizado, con nombre accesible y explicación de los datos de escenario que se transfieren, si los hay. No introducir PII en URL, recoger datos bancarios ni mostrar éxito ficticio. El gate de signup no cambia por un rediseño.

## Conductor: taxi y tres vías elegibles

| Interacción | Estado y acción | Resultado, reversión y prueba |
| --- | --- | --- |
| D1. Taxi reactivo | Taxi/tablet visible en HTML; tap o botón para mostrar viaje ilustrativo/encender demo | La tablet responde y explica su función. Trayectoria y dimensiones adaptadas a teléfono; repetir/cancelar sin bloquear CTA. SVG/capas locales, no vídeo grande. Probar hit area, foco y alternativa estática |
| D2. Laboratorio de quince slots | Slider nativo de anuncios elegibles 0–15; quince slots numerados o con equivalente textual | Seleccionar n enciende n slots y actualiza el ejemplo mensual con el modelo compartido; reducir n apaga los restantes. Solo animar la diferencia, sin anunciar cada frame. Probar 0/15, teclas, foco, normalización del modelo para 16 y reduced motion |
| D3. Tres rutas | Seleccionar Anuncios, Ventas aprobadas o Conductores activados; modificar su contador | Mostrar condiciones y contribución de esa vía, sin mezclar mensual con eventos no recurrentes. Los contadores conservan sus valores al cambiar tarjeta y el desglose sigue disponible. El rango de demo no introduce cap contractual. Probar cada vía, suma/desglose y estados pendientes como explicación, sin acreditarlos |
| D4. Recorrido del referido | Pasos Compartir → Registro → Validación → Activación → Bono; avanzar/volver | Cada fase explica la condición siguiente. El bono solo aparece como ejemplo condicionado al hito elegible aprobado. No compartir mensajes ni crear registros por tocar la demo. Probar reversión, orden, texto de aprobación y enlace oficial si está autorizado |

Si el alcance incluye onboarding, orientar avance/retroceso, validación, errores y recuperación de foco. Éxito de solicitud no significa conductor activo ni pago realizado. No rehacer flujos privados para completar una escena pública.

## Storyboard y cobertura

Por componente documentar: audiencia, propósito, estado inicial, disparador, contenido que cambia, propiedad/motor, duración orientativa, estado final, reversión, foco, loading/error/slow, SSR/no-JS y alternativa reducida. La ilustración puede ser decorativa; las condiciones y datos esenciales siempre tienen texto equivalente.

Mantener en el checkpoint de implementación una tabla A1–A4/D1–D4 con archivo/componente, interacción demostrada, motor/fuente, evidencia y estado: PENDIENTE, IMPLEMENTADO o VERIFICADO. Completar una fila solo con artefactos del componente real. Una excepción de librería requiere motivo y equivalente demostrado; no reduce la exigencia de interacción.

Secuenciar según riesgo: layout y lectura móvil → controles y contratos → escena visual → coreografía → QA/perf. Elegir pruebas de aceptación del [plan de QA](responsive-motion-qa.md). Un PR puede cubrir una parte y seguir en borrador con pendientes claros.
