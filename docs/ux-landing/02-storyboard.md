---
type: plan
status: maintained
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Storyboard y tarjetas de implementación

| Escena | Interacción y resultado observable |
| --- | --- |
| 1. Ciudad en movimiento | Selector visible desde el hero. Cada perfil cambia titular, escena, beneficio y CTA; estado inicial determinista anunciante. |
| 2. Vida de una campaña | Cuatro hitos: campaña, pantalla, reproducción y reporte. Botones, flechas, inicio/fin y anterior/siguiente; sin autoplay. Los cuatro resúmenes están en SSR. |
| 3. Tu perspectiva | Anunciante cambia ciudad, objetivo y presupuesto RD$5,000–150,000, sin promesa de alcance. Conductor explora 15 slots y CPA validados. Flota inspecciona dispositivos ficticios y diagnostica desconexión. |
| 4. Operación ilustrativa | SVG local con ciudades conceptuales, sin posiciones de taxis reales ni atribución de cobertura. Conexión online / <24 h / ≥24 h, ausente o inválida; finanzas independientes. |
| 5. Aprende a medir | Diferencia explícita entre reproducción, impresión estimada y reporte consolidado; ninguna equivale por sí sola a venta o atención individual. |
| 6. Tres historias y preguntas | Tarjetas editoriales SSR de anunciante, conductor y flota, además de FAQ contextual. Sin clientes ni testimonios inventados. |
| 7. Siguiente paso | CTA por perfil: login anunciante, landing del taxista, acceso administrativo. Registro solo con el gate existente. |

Tarjetas de trabajo: (1) evidencia/rutas y elección de componentes; (2) componentes disjuntos recorrido y flota; (3) integración de estado, modelo, metadatos y eventos; (4) pruebas y revisión visual; (5) documentación y PR aislado. Ninguna tarjeta cambia identidad, dinero o permisos.

Eventos: `landing_view`, `perspective_selected`, `story_step_viewed`, `budget_demo_used`, `earnings_demo_used`, `fleet_demo_opened`, `cta_clicked`. Se usa el helper compartido que comprueba consentimiento en cada envío y elimina query/referrer/title. Los rangos emiten al confirmar interacción y deduplican valores. No se reenvían interacciones previas al consentimiento.

Sin JavaScript permanecen hero, los cuatro resúmenes, ejemplo inicial, explicación de medición, tarjetas de los tres perfiles y enlaces a portales. Un aviso explica que las demos interactivas necesitan JS; los enlaces siguen funcionando.
