---
type: decision
status: accepted
reviewed: 2026-10-31
area: frontend
tags: [tad/reference, tad/area/frontend]
---

# Selección de componentes y coste

Se revisaron los manifiestos, estilos, componentes y calculador de impacto disponibles en el repositorio. No se necesita instalar un catálogo para las interacciones seleccionadas.

| Necesidad | Elección y motivo |
| --- | --- |
| Hero/perspectiva/tablet | React, CSS Modules y Lucide existentes; arte nativo que responde al perfil y conserva SSR. |
| Recorrido | `CampaignJourney`, cuatro botones y panel local. Evita librería de carrusel, autoplay y contenido oculto para SEO. |
| Rangos económicos | Controles HTML nativos y modelo puro; entrada normalizada y salida educativa. |
| Flota/ciudad | `FleetExperience`, SVG y fixtures propios. No hay proveedor de tiles aprobado; no solicita claves, permisos ni datos reales. |
| FAQ | `details/summary`, funcional sin JavaScript y sin dependencia de acordeón. |
| Consentimiento | CookieBanner y helper compartidos; adaptador App Router sin dependencia de `next/router`. |
| Impacto compartido | Inspeccionado `simulatorPricing.ts`/`@tad/impact-calculator`; requiere pantallas, meses, frecuencia y calibración. Se omite una conversión presupuesto→alcance sin contrato público verificable. |

No se incorporó código externo nuevo; no hay licencias de componentes adicionales que revisar. No se instalaron mapas, Recharts, GSAP ni kits visuales. El coste de JS se debe medir sobre los chunks del build, sin sumar doble los compartidos. Meta de incremento: ≤60 kB gzip frente a baseline equivalente; si no existe captura previa comparable, registrar esa limitación y el total actual sin inventar delta.
