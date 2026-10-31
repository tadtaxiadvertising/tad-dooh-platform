---
type: plan
status: maintained
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Storyboard TAD — dos historias, una experiencia

**Principio:** una landing de producto para comprender, probar y
continuar con el onboarding real; no reemplaza contratos ni operaciones.

| Escena | Interacción y resultado |
| --- | --- |
| 1. Ciudad en movimiento | Hero con dos perspectivas (Anunciante y Conductor). Cambia titular, escena, beneficio, FAQ y CTA sin navegación forzada. |
| 2. Vida de la campaña | Cuatro hitos accesibles: preparar → pantalla → reproducción → reporte. Sin autoplay, controles por teclado. |
| 3. Laboratorio del anunciante | Ciudad, objetivo, presupuesto RD$5,000–150,000 y creatividad ficticia. Sin alcance o disponibilidad prometidos. |
| 4. Laboratorio del conductor | Quince slots ilustrativos, CPA de ejemplo, desglose R6 y advertencias sobre elegibilidad y liquidación. |
| 5. Métricas con contexto | Diferenciar reproducción, impresión estimada, reporte y venta aprobada. No equivalencias falsas. |
| 6. Dos historias y FAQ | Tarjetas editoriales SSR de Anunciante y Conductor; preguntas reactivas al perfil; contenido sin JavaScript. |
| 7. Próximo paso | Acceso al anunciante / portal de taxista; registro solo con gate validado; enlaces seguros y evidentes. |

Flujo de exploración: **Selecciona → Prueba → Comprende → Continúa**.
En móvil el Hero prioriza CTA y lectura, sin vídeos obligatorios. Sin
JavaScript permanecen los textos de ambos públicos, explicación de
métricas y enlaces legales/portal.

Eventos con consentimiento: `landing_view`, `perspective_selected`,
`story_step_viewed`, `budget_demo_used`, `earnings_demo_used`,
`cta_clicked`. No guardar query completa, token o información personal.

Criterios: exactamente 2 botones por selector, 2 tarjetas editoriales,
2 conjuntos de FAQ, cero destinos comerciales de administración;
rutas privadas operan sin cambios. Tests, screenshot y QA se registran
en `05-qa-handoff.md`.
