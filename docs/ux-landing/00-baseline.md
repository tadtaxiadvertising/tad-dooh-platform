---
type: evidence
status: maintained
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Landing V3: evidencia y alcance

Petición: aplicar la [skill V3](../../.agents/skills/tad-landing-experience-multirol-v3/SKILL.md), conservando la landing propia del taxista. Integración en Windows, Node 22.20.0, Next 15.5.24. Base local `ee148dda42221fee8feb5e51c37e46b6509ed40d`; `main` remoto observado con `git ls-remote` el 2026-10-31: `a55d987a78e494503e0a887b09c874ffa2037f5b`. La evidencia local corresponde a la base más los archivos modificados, no acredita producción.

El árbol contiene numerosos cambios documentales anteriores y un worktree/submódulo ajeno. Se preservan. El PR debe aislar las superficies de esta intervención de los commits previos de autenticación y privacidad.

La publicación usa un worktree dedicado en `codex/landing-experience-v3`, padre `a55d987a78e494503e0a887b09c874ffa2037f5b`, y copia únicamente las fuentes de esta entrega. El baseline UX/build y el navegador se observaron en `ee148dda` más diff; los builds finales se ejecutaron en el worktree de main más el diff acotado. Los informes distinguen ambas procedencias. Las fuentes de aplicación copiadas se comprobaron por SHA-256 y las dependencias compartidas relevantes por blob frente a main.

## Hechos antes de la implementación V3

- Advertiser ya tiene `app/page.tsx` y una landing multirol inicial: no crear `pages/index.tsx`. Middleware y configuración ya permiten visitantes en `/`.
- Driver ya tiene una landing pública específica, con login separado y shell privado conservado para las demás rutas.
- Las dos landings usan CSS/SVG locales, consentimiento compartido y enlaces canónicos. El registro está desactivado por defecto.
- `node --test scripts/landing.test.cjs scripts/driver-landing.test.cjs`: 23/23 PASS antes de V3. No demuestra los nuevos componentes.
- El build anterior informa 9.91 kB propios / 113 kB First Load JS. Antes de reconstruir se capturaron sus manifiestos: build `opTZZMlG-lCaLG1r_MOAk`, manifiesto del 2026-10-31T16:19:20Z, 112,877 bytes gzip iniciales y 9,909 exclusivos de la ruta. La captura está fuera de Git como `landing-v3-baseline-v2.json`; permite comparar chunks con el mismo método, sin inferir rendimiento de campo.
- El tipado completo tiene errores previos: falta `@playwright/test` en Advertiser; `Buffer`/`BodyInit` en el proxy Driver. Next omite tipos/lint por configuración existente.
- No hay Lighthouse ni axe en las dependencias disponibles. Playwright está disponible en el runtime local. No se añaden dependencias.

## Objetivo y aceptación

Una perspectiva compartida actualiza hero, escena, beneficios, demo, FAQ y CTA. Cuatro pasos explican la campaña; la demo educativa de conductor limita slots a 15 y CPA a 100; la flota usa dispositivos ficticios y separa conexión de finanzas. Los tres perfiles mantienen contenido SSR accesible sin JavaScript. Las métricas distinguen reproducción, impresión y reporte.

Responsables: integración/modelo/estilos/documentación, agente principal; recorrido, agente CampaignJourney; flota, agente FleetExperience; navegador y medición, agente QA. Cada responsable escribe archivos disjuntos. Aceptación: pruebas de límites/rutas/consentimiento; tipos y lint independientes; build; navegador local en 320/390/768/1440, teclado, movimiento reducido, sin JS y red lenta; evidencia visual y documentación verificadas.

Sin cambios en API, identidad, DB/RLS, liquidaciones, reproductor o despliegues. El presupuesto no se convierte en pantallas ni alcance: el calculador compartido requiere otras entradas y calibración, y no acredita una tarifa pública vigente por RD$.

Ver [contrato de rutas](01-adr-public-routing.md), [storyboard](02-storyboard.md), [sistema visual](03-design-system.md), [selección de componentes](04-component-selection.md) y [QA/continuidad](05-qa-handoff.md).
