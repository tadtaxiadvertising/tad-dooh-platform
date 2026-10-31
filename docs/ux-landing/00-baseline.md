---
type: evidence
status: maintained
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Landing V3.1 — baseline y cambio de alcance

PR: https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/168
Rama: `codex/landing-experience-v3`, derivada de `main`.

## Evidencia previa y limitaciones
El PR V3 inicial incorporaba una landing pública App Router para Advertiser y una
landing Pages Router específica del Driver. La rama no altera API, DB, RLS, pagos,
player ni paquetes compartidos. El registro público se mantiene desactivado
por defecto con `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED`. Las credenciales y sesiones
requieren sus propias validaciones; una landing pública no autoriza roles.

Resultados **históricos** del PR antes del ajuste dual: 38 pruebas locales
registradas, 14 escenarios de browser de desarrollo, builds Advertiser/Driver
reportados como aprobados y 119,048 bytes gzip inicial Advertiser (+6,171 vs
baseline anterior). Estos datos se conservan como referencia del estado previo:
**no acreditan por sí solos esta revisión V3.1**. CI remota no llegó a ejecutar
trabajos por configuración de facturación/cupo según el reporte original.

## Alcance de producto aprobado — únicamente dos perspectivas

- **Anunciante:** narrativa campaña → pantalla → reproducción → reporte,
  selector de ciudad, objetivo y presupuesto ilustrativo; sin proyección de
  impresiones ni ROI garantizado.
- **Conductor:** calculadora educativa R6 con máximo de 15 slots,
  CPA validado de ejemplo, explicación de condiciones, enlaces al portal
  del taxista y al onboarding oficial cuando esté habilitado.
- Dos opciones en hero, demo, tarjetas SEO y preguntas; ningún rol
  comercial adicional. El portal privado Admin permanece intacto.
- Interactividad CSS/SVG local, controles HTML accesibles, cookie consent
  y analítica opcional sin transmisión de PII.
- No duplicar onboarding oficial ni desactivar autorización backend.

## Verificación requerida tras V3.1

Repetir unit tests, smoke y revisión visual de 320, 390, 768 y 1440 px,
accesibilidad de teclado, no-JS, reduced motion, cookie consent,
rutas cross-domain, builds independientes y tipado/lint del alcance.
Registrar resultados nuevos con SHA y entorno exactos en
[05-qa-handoff.md](05-qa-handoff.md).

Documentos relacionados:
[ADR rutas](01-adr-public-routing.md),
[storyboard dual](02-storyboard.md),
[sistema visual](03-design-system.md) y
[componentes](04-component-selection.md).
