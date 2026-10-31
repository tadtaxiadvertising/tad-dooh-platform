---
type: decision
status: accepted
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Componentes gratuitos y coste — alcance dual

Antes de instalar componentes de catálogo, se inspeccionaron
React 19, Next 15, Tailwind v4, CSS Modules, Lucide, el modelo
de landing y `@tad/impact-calculator`. El alcance de dos públicos
no necesita una dependencia pesada adicional.

| Necesidad | Elección | Razón |
| --- | --- | --- |
| Hero / selector dual / tablet | React, CSS Modules y Lucide existentes | Ligereza, SSR y control visual |
| Recorrido educativo | `CampaignJourney` local | 4 pasos, teclado, sin autoplay ni carrusel dependiente |
| Presupuesto y R6 | Controles HTML `range`, `output`, modelo TypeScript puro | Accesible, validable y sin backend público |
| FAQ | `details/summary` | Funciona sin JS ni otra librería |
| Consentimiento | `CookieBanner` + cookie-consent compartido | Evita tracking previo al consentimiento |
| Onboarding | Enlaces a rutas canónicas de cada portal | No duplicar identidad, contrato ni pagos |
| Impacto publicitario | Simulador de dominio solo tras contrato verificable | No fingir impresiones derivadas de RD$ |

No se añaden kits, mapas, GSAP, WebGL, animadores masivos ni
servicios de terceros. React Bits, Embla y shadcn/ui son opciones
futuras sujetas a licencia y medición, **no dependencias requeridas**.
Objetivo de incremento sobre baseline comparable: <=60 KiB gzip.
Registrar coste del bundle y no atribuir datos de laboratorio a
Core Web Vitals de producción.
