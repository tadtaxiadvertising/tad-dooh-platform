---
name: tad-landing-experience-multirol-v3
description: 'Diseñar, implementar y verificar una landing pública TAD DOOH de alto impacto, rápida, accesible,
  interactiva y multirol; reutiliza onboarding existentes, componentes gratuitos compatibles y las reglas
  de seguridad, finanzas y offline.

  '
metadata:
  version: 3.0.0
  project: tadtaxiadvertising/tad-dooh-platform
  activation: '["Ejecuta la skill tad-landing-experience-multirol-v3", "Rediseña la landing interactiva
    multirol TAD", "Implementa TAD Landing Experience V3"]'
---

# TAD Landing Experience V3 — Skill para agente de diseño y desarrollo

> **MANDATO:** Crear una experiencia digital premium, clara, sorprendente y entretenida que convierta visitantes en anunciantes, conductores y oportunidades comerciales de flotas, **sin** convertir la landing pública en un portal privado ni duplicar las reglas de negocio.
>
> **Principio de producto:** «No explicar TAD con un folleto: permitir vivir TAD mediante demostraciones visuales veraces, rápidas y accesibles».
>
> **Principio técnico:** La experiencia más memorable es la que carga rápido, responde al tacto, guía al siguiente paso y nunca compromete seguridad ni integridad.

## 0. Modo de operación y límites

Actúa como Principal Product Designer + UX Writer + Frontend Staff Engineer + Arquitecto de Aplicaciones + Accessibility Lead + QA + Security Reviewer de TAD. Ejecuta el ciclo:

`EVIDENCIA → DECISIÓN ARQUITECTÓNICA → STORYBOARD → PROTOTIPO FUNCIONAL → IMPLEMENTACIÓN INCREMENTAL → PRUEBAS → VALIDACIÓN VISUAL → DOCUMENTACIÓN → PR`.

- Comienza revisando el **HEAD real de `main`**, scripts, rutas, middleware, layouts, UI existente y flujos reales. No confíes ciegamente en esta especificación si el código cambia.
- No hagas cambios directos en producción, DB productiva, políticas RLS, secretos, registros financieros o identidad.
- Usa rama de feature y PR revisable; no auto-merge, no force push y no despliegue productivo sin autorización.
- Implementa el **cambio mínimo seguro** y evita nuevas dependencias si se puede usar el stack ya instalado.
- Ante secretos en el repositorio: tratar como **P0**, detener mutaciones e informar para aislamiento/rotación. No reproducirlos en logs, tickets ni PRs.
- No generar loops infinitos: máximo 3 intentos de diagnóstico/fix por bloque; documenta bloqueo real y avanza tareas independientes seguras.
- Entregable final: código + evidencias de verificación + documentos UX + PR. No describir como «verificado» aquello que no se ejecutó.

## 1. Evidencia de proyecto observada (2026-10-31; reconfirmar en HEAD)

| Área | Ubicación / comportamiento constatado | Implicación obligatoria |
|---|---|---|
| Stack | `apps/advertiser/package.json`: Next 15.5.24, React 19, Tailwind 4, `framer-motion`, `lucide-react`, `sonner`, `@tad/ui` | Reutilizar antes de instalar |
| Tailwind | `apps/advertiser/styles/globals.css` ya define `@theme`, tokens TAD y `.stitched-card`, `.animate-float`, `.tad-slider` | Extender, no duplicar sistema visual |
| Skill visual | `.agents/skills/tad-ui-ux/SKILL.md` | Mantener estética «Stitched UI» premium |
| Landing raíz | `apps/advertiser/pages/index.tsx` no existía en inspección | Crear solo tras contrato de rutas |
| Redirect 1 | `apps/advertiser/next.config.js`: `/` → `/login` | Adaptación necesaria, sin romper login |
| Redirect 2 | `apps/advertiser/middleware.ts`: `/` → login o dashboard | Definir comportamiento guest/auth explícito |
| Layout público | `apps/advertiser/pages/_app.tsx`: `isPublic` no contempla `/`; `PaymentLockOverlay` y `AntigravitySync` aparecen en composición global | Auditar render, seguridad y efectos antes de exponer raíz; no desactivar controles privados globalmente |
| Onboarding advertiser | `apps/advertiser/pages/advertiser/onboarding.tsx`: Beneficios → Simulador → Compromiso → Éxito | **4 pasos**, no inventar 3; conservar validaciones y aprobación del servidor |
| Onboarding advertiser autenticado | `apps/advertiser/components/advertiser/OnboardingWizard.tsx`: Ciudad → Presupuesto → Proyección | No duplicarlo ni colocarlo anónimo sin permisos |
| Impacto | `apps/advertiser/components/advertiser/simulatorPricing.ts` integra `@tad/impact-calculator` | Fuente preferida: estimador compartido; mostrar incertidumbre/calibración |
| API privada | `apps/api/src/modules/campaign/campaign.controller.ts`: `simulate-budget` requiere ADMIN/ADVERTISER | Jamás eludir RBAC para demo pública |
| Onboarding driver | `apps/driver/pages/driver/onboarding.tsx`: Bienvenida → Simulador → Registro → Éxito | Preservar ruta y flujo existente; verificar también `/onboarding` |
| Telemetría | `apps/admin/utils/driverStatus.ts` | Verde online, amarillo offline <24h, rojo offline ≥24h / sin señal |
| Identidad | `docs/security/advertiser-identity-onboarding-contract-2026-10-29.md` | Verificar aprovisionamiento Supabase Auth, email, aprobación, pago y estados antes de habilitar signup como producción |
| Monorepo | `pnpm` y workspaces `@tad/*` | No asumir comandos npm ni crear paquetes redundantes |

**Importantísimo:** la landing no estará realmente pública si solo se agrega `pages/index.tsx`: hay que resolver coherentemente las redirecciones tanto de `next.config.js` como de `middleware.ts`, y el tratamiento de `/` en `_app.tsx`. Mantener guardas y rutas privadas intactas.

## 2. Norte creativo: una experiencia, tres historias

### Idea central
**«Tu ciudad se mueve. Tu marca también.»**\
Subtítulo configurable, sin claims falsos: **«Descubre cómo TAD conecta anunciantes, conductores y tecnología publicitaria en movimiento».**

### Diseño emocional
El visitante no debe leer una larga página institucional. Debe explorar un **viaje interactivo**:

`DESCUBRE (5–10 s) → ELIGE TU PERSPECTIVA → PRUEBA UNA DEMO → ENTIENDE CÓMO FUNCIONA → ACTÚA`.

- **Tecnología visible:** taxis, tablets, pantallas, calles, métricas y flujos explicados mediante animaciones que transmitan conceptos reales.
- **Edición editorial:** grandes titulares, texto breve, escenas progresivas, comparaciones y tarjetas de decisión; evitar bloques densos.
- **Contexto dominicano:** Santiago y Santo Domingo; moneda RD$; contenido en español natural; no inventar cobertura, testimonios, cifras, logos de clientes ni capacidad operativa.
- **Interacción con propósito:** cada animación debe explicar estado, cambio, consecuencia o siguiente paso. Nunca añadir efectos solo porque existen en un catálogo.
- **Humor/entretenimiento responsable:** pequeños mensajes positivos y logros de exploración («Ya sabes cómo funciona una impresión», «Ruta simulada completada») sin ruedas de premio, recompensas engañosas ni urgencia artificial.
- **Diseño multirol auténtico:** cambiar la perspectiva actualiza titular, escena, tarjeta de beneficios, simulador, FAQ contextual y CTA, preservando acceso al contenido SEO de los tres públicos.

### Storyboard principal, 7 escenas
| Escena | Promesa | Interacción concreta | Salida |
|---|---|---|---|
| 1. Hero «Ciudad en movimiento» | Entender TAD en un vistazo | Selector Advertiser / Driver / Flota; vista tablet/taxi animada | CTA contextual |
| 2. «Del anunciante al pasajero» | Mostrar flujo del anuncio | Secuencia controlada de 4 hitos: campaña → pantalla → reproducción → reporte | Conocer producto |
| 3. «Pruébalo tú» | Reducir incertidumbre | Simulador del rol seleccionado con resultados explicados | Onboarding |
| 4. «Explora una ruta» | Contextualizar la red | Mapa demo para SD/Santiago con puntos ficticios y leyenda | Ver funcionamiento |
| 5. «Cómo se mide» | Educar sin exagerar | Cards de impresiones, reproducciones verificadas y limitaciones | Confianza |
| 6. «Elige tu siguiente paso» | Orientar decisión | Historias deslizadas, FAQ contextual, requisitos y compromisos claros | CTA |
| 7. «Únete al movimiento» | Convertir | CTA principal, enlace secundario, rutas por rol y ayuda | Flujo real |

La escena 4 puede desplazarse después de la 3 en móvil; mantener SSR de contenido editorial para SEO.

## 3. Experiencias por rol: interactivas, entretenidas y veraces

### A) ANUNCIANTE: «Diseña el recorrido de tu marca»
**Hero:** «Haz que tu marca acompañe la ciudad».\
**Demo 1 / Constructor visual:** escoger Santiago o Santo Domingo; elegir tipo de objetivo publicitario (reconocimiento / visitas / interacción) **solo como preferencia de simulación**, sin prometer targeting no implementado. Ver tablet ilustrativa con creatividad ficticia TAD y una secuencia «preparar → reproducir → medir».\
**Demo 2 / Laboratorio de presupuesto:**
- Slider RD$5,000–RD$150,000 **como rango de experiencia pública propuesto**, verificable contra el producto antes de publicarlo; el wizard autenticado maneja un rango diferente.
- No usar `presupuesto × 120` ni `ceil(presupuesto/5000)` como si fueran datos reales.
- Reutilizar `@tad/impact-calculator`, `estimateCampaignDetailed` o su contrato seguro más reciente, **solo tras inspeccionar inputs, salidas, advertencias y reglas**. El simulador existente opera por pantallas/meses/frecuencia; no forzar equivalencias arbitrarias con RD$.
- Si hace falta convertir RD$ → pantallas/meses, la regla de precio debe provenir del dominio o de un producto respaldado; de otro modo mostrar presupuesto y composición *ilustrativa* sin impresiones ni alcance ficticios.
- Mostrar **rango**, «Estimación educativa» y nota de calibración cuando proceda; jamás proyectar ROI garantizado ni disponibilidad en vivo.
- Una barra explicativa revela de dónde surge cada resultado; las métricas cambian suave y conservan valor legible para lectores de pantalla.
**CTA primario:** «Planificar mi campaña» → onboarding advertiser real.\
**CTA secundario:** «Ver cómo funciona una campaña» → escena educativa, sin exigir login.

### B) CONDUCTOR: «Tu ruta también puede generar oportunidades»
**Hero:** «Tu trabajo mueve la ciudad. Descubre cómo participar en TAD».\
**Demo 1 / Calculadora de ganancias R6:** anuncios elegibles [0..15], eventos CPA **validados** [0..N acotado para demo]. Fórmula y reglas vigentes deben concordar con el servidor:

```ts
export function estimateDriverEarnings(ads: number, verifiedCpa: number) {
  const slots = Number.isFinite(ads)
    ? Math.min(15, Math.max(0, Math.trunc(ads)))
    : 0;
  const cpa = Number.isFinite(verifiedCpa)
    ? Math.min(100, Math.max(0, Math.trunc(verifiedCpa)))
    : 0; // Límite de la UI demo, NO un tope de negocio.
  return {
    eligibleSlots: slots,
    adsRD: slots * 500,
    cpaRD: cpa * 500,
    totalRD: slots * 500 + cpa * 500,
  };
}
```

- La suma **no** es saldo, pago prometido ni previsión contractual; es ilustración matemática condicionada a elegibilidad y reglas actuales.
- **Referidos ≠ CPA automáticamente**. No sumar referidos incompletos ni enseñar ganancias futuras garantizadas.
- El máximo de anuncios **siempre** es 15, incluso con input manipulado.
- Representar visualmente «15 espacios» como chips dinámicos / indicador progresivo; añadir desglose, condiciones y diferencia entre oportunidad y pago confirmado.
**Demo 2 / Ruta del conductor:** escenas «Conocer requisitos → Registro y contrato → Verificación/activación → Operación y reportes»; sin suplantar trámite real.
**Onboarding real:** `apps/driver` (4 etapas actuales) y HaaS / banco / datos de cuenta únicamente en flujos propios protegidos; **nunca** capturar cuentas bancarias en landing ni inventar alta instantánea.
**CTA:** «Quiero ser conductor TAD» → URL canónica del portal conductor.

### C) ADMINISTRADOR / OPERADOR DE FLOTA: «Un centro de control explicado en segundos»
**Hero:** «Visualiza el movimiento. Entiende el estado de la operación».\
**Demo 1 / Mini Command Center:** escenarios sintéticos claramente rotulados **«Datos de demostración»**; resumen de dispositivos, tarjetas de alerta e historial **ficticio**; semáforo:
- **Verde** `online` según señal válida de la fuente de demostración.
- **Amarillo** `recent_offline` cuando no online y `lastSeen` <24h.
- **Rojo** `long_offline` cuando desconectado ≥24h, sin `lastSeen` o fecha inválida.
- El estado **financiero** (`PENDIENTE_PAGO`, etc.) es un indicador diferente del estado de conexión; NO colorear rojo por mora en la capa de conectividad.
**Demo 2 / «Resuelve la alerta»:** elegir un dispositivo ficticio, inspeccionar ping/última señal/estado, descubrir por qué es amarillo o rojo; feedback breve («Correcto: lleva más de 24 horas desconectado»). Sin mecánicas competitivas invasivas.
**Mapa:** Leaflet client-only, vistas SD/Santiago, marcadores ficticios, rutas ilustrativas sin trazados GPS reales. Tiles y atribución según proveedor; si falla, ofrecer ilustración SVG / tabla de dispositivos demo.
**CTA público:** «Solicitar una demostración» únicamente hacia un canal comercial realmente implementado; o «Acceder al portal administrativo» → login seguro. NO existe «Acceso Demo Admin» que fabrique sesión ADMIN.
**Nota de producto:** si se vende solución a flotas, hablar de «operador / flota» como perfil comercial, no como rol RBAC ADMIN del sistema.

## 4. Librerías: selección gratuita, rápida, actual y gobernada

Regla base: **Primero CSS nativo + componentes existentes. Después dependencias selectivas justificadas.** Nunca agregar paquetes por moda.

| Prioridad | Recurso / licencia a revisar | Aplicación permitida | Condiciones |
|---|---|---|---|
| P0 — instalado | Tailwind 4 + `globals.css` + `@tad/ui` | Layout, tipografía, estados, tarjetas, grid, tokens | Extender tokens existentes, no introducir `tailwind.config.js` |
| P0 — instalado | `framer-motion` | Transición hero, selector, cards, transform/opacity, gestos moderados | NO instalar `motion` simultáneamente sin decisión de migración |
| P0 — instalado | `lucide-react` | Iconos con consistencia | Importar solo iconos usados; etiquetas accesibles |
| P0 — instalado | `sonner` | Feedback no invasivo | Preferir mensajes inline en formularios; no toasts para contenido esencial |
| P1 — selectivo | shadcn/ui (fuente editable, revisar dependencias/licencia por primitivo) | Tabs, Dialog, Slider, Accordion, Tooltip | Solo componentes necesarios y compatibles con React19/Tailwind4/Pages Router; auditar `components.json`, aliases, CSS |
| P1 — opcional | Embla Carousel (MIT) | Tarjetas de storytelling táctiles | Si CSS scroll-snap cumple, no instalar; controles teclado y pausa |
| P2 — opcional | React Bits (MIT + Commons Clause) | Uno o dos efectos ligeros de texto/tarjetas | Revisar licencia **del componente y dependencias**, no revender componentes; NO traer WebGL/Three/GSAP para un adorno |
| P0 — solo donde aplica | Leaflet y paquete React compatible (Leaflet BSD-2-Clause; revisar wrappers) | Demostración de geografía/flota | SSR off; carga diferida; licencia y límites de tiles |
| P0 — nativo | `next/image`, SVG local, WebP/AVIF, CSS transforms | Mockup de tablet/taxi, poster del hero, ilustraciones | Assets propios o con licencia verificada; nada de embeds externos costosos |

**Fuentes oficiales para verificación del agente:**
- shadcn/ui React 19 + Tailwind 4: https://ui.shadcn.com/docs/tailwind-v4
- Motion: https://motion.dev/docs/react-installation (TAD actualmente usa `framer-motion`; API/docs no autorizan migración automática)
- Embla: https://github.com/davidjerleke/embla-carousel
- React Bits licencia: https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md
- Next Pages Router lazy loading: https://nextjs.org/docs/pages/guides/lazy-loading
- Next Pages Router imágenes: https://nextjs.org/docs/pages/getting-started/images
- OSM tile policy: https://operations.osmfoundation.org/policies/tiles/

Antes de instalar cualquier componente de catálogo:
1. Revisar licencia actual, prohibiciones, mantenimiento y cadena de dependencias; registrar fuente/fecha.
2. Validar React19/Next15/Pages Router/Tailwind4, tipos y SSR; no invocar comandos `--force`.
3. Medir peso añadido, red y ejecución sobre Android gama media.
4. Copiar / adaptar **solo el componente necesario** bajo revisión de seguridad y licencia.
5. Favorecer CSS/SVG si la animación equivalente es más económica.
6. Si un componente requiere plan de pago, credenciales o recurso remoto obligatorio, **rechazarlo** y usar alternativa libre.

**Prohibiciones por defecto:** Three.js, WebGL/WebGPU, shaders animados, vídeos 4K, partículas continuas, canvas infinito, música/autoplay sonoro, smooth-scroll que secuestra scrolling, plugins de mapas de pago y dashboards reales embebidos públicamente. Excepciones solo mediante ADR + presupuesto + pruebas.

## 5. Sistema visual, responsive y motion language

### Identidad
- Fondo premium: `#0a0a0a` y tonos de superficie ya existentes en `globals.css`.
- Amarillo TAD principal: `#FFD400`; el repo usa también `#FDCB01`: **documentar diferencia de tokens, no mezclar indiscriminadamente**.
- Semáforo **operativo**: verde `#22c55e`, amarillo offline `#eab308`, rojo `#dc2626` (según `driverStatus.ts`).
- Acento de error global `#ef4444` si corresponde al sistema, sin reemplazar semáforo técnico.
- Glassmorphism **moderado**; evitar blur grande en capas superpuestas, especialmente móvil.
- Tipografía Inter/Outfit si ya funciona, fallback local/system; no depender de múltiples descargas.

### Lenguaje de movimiento
- Animaciones de entrada: 150–450 ms; transiciones de escena: 250–600 ms cuando aportan claridad.
- Preferir `opacity` + `transform`; evitar animar `width`, `height`, `top`, blur y box-shadow pesado por frame.
- Movimiento del hero controlado; máximo 1–2 loops visuales concurrentes en móvil.
- Animación interrumpible, reversible y con salida clara. Nada de scroll-jacking ni navegación sorpresiva.
- Respetar `prefers-reduced-motion: reduce` y `useReducedMotion`; en ese modo, usar transiciones simples o estados estáticos equivalentes.
- Ningún contenido vital dependerá de hover, scroll o animación para ser entendido.

### Diseño por dispositivos
- 320–390 px: hero legible en primera pantalla, CTA visible, navegación simple, simulador con sliders/touch targets 44–48 px, sin mapa pesado por defecto.
- 391–768 px: storytelling vertical, carruseles con swipe opcional y flechas accesibles.
- 769–1024 px: layout editorial mixto; controles y escena visible sin saturar.
- 1025 px+: hero en dos columnas con mockup de taxi/tablet y panel interactivo.
- Dark mode prioritario, respetar el theme system existente si hay modo claro; no crear un toggle falso.

## 6. Arquitectura de información y componentes

**Ruta candidata:** `apps/advertiser/pages/index.tsx`, únicamente si conviene al dominio público tras análisis de `next.config.js`, `middleware.ts`, `_app.tsx`, layout, PaymentLockOverlay, PWA, SEO y despliegue.

```text
apps/advertiser/
  pages/
    index.tsx                             # candidato; si cambia, ADR
  components/landing/
    LandingShell.tsx                      # SSR/editorial, navegación/footer
    LandingHero.tsx                       # Hero + visual sin JS innecesario
    PerspectiveSwitcher.tsx               # Tabs accesibles, roles de marketing
    TaxiTabletStory.tsx                   # Maqueta con SVG / assets locales
    HowTADWorks.tsx                       # Narrativa en 4 hitos
    ExperienceStage.tsx                   # Contenedor del rol activo
    advertiser/
      AdvertiserBudgetLab.tsx
      CampaignJourney.tsx
    driver/
      DriverEarningsLab.tsx
      DriverJourney.tsx
    fleet/
      FleetHealthStory.tsx
      FleetMapDemo.client.tsx             # Leaflet con dynamic({ ssr:false })
      OfflineDiagnosisChallenge.tsx
    StoryCarousel.tsx                     # Embla SOLO si añade valor
    TrustProof.tsx
    RoleFAQ.tsx
    ConversionFooter.tsx
  lib/landing/
    experience-config.ts                  # Copy, escenas, CTA e indicadores
    route-manifest.ts                     # Orígenes públicos allowlist
    events.ts                             # Analytics con consent
    demo-fixtures.ts                      # Solo datos ficticios
    earned-income-preview.ts              # Puro, sin DB
  tests/landing/                          # Seguir convención real
```

**No crear estructura por obligación**: adaptar nombres al patrón existente y mantener el número de componentes razonable. No mover automáticamente código a `packages/ui`; hacerlo solo si lo usan dos o más aplicaciones reales, sin dependencias de router, DOM o Auth.

### Separación de capas
1. **Editorial SSR**: texto de SEO, navegación, promesa, beneficios, legal, CTA.
2. **Interacción local**: tabs, animaciones, demos, calculadora pura; sin secretos.
3. **Demo client-only**: Leaflet, animaciones intensivas si fueron aprobadas; cargar tras intención / viewport.
4. **Portal transaccional**: advertiser/driver/admin canónicos; login, contratos, pagos, PII, datos bancarios y activación permanecen en sus flujos actuales.
5. **Telemetría / Reporting real**: solo APIs autenticadas y autorizadas de portal, jamás en landing.

### Contrato del selector
`ExperienceRole = "advertiser" | "driver" | "fleet"` = **perspectiva de marketing**, NO `UserRole` ni claim Supabase.

- Persistencia opcional `tad_landing_selected_role`, no tokens ni PII.
- Carga sin hydration mismatch (`useEffect`, default estable o configuración SSR segura).
- Sin full-page reload al cambiar roles; `aria-selected`/tab semantics y foco consistente.
- Los demás roles conservan páginas/enlaces indexables y contenido que lectores de pantalla pueden descubrir.
- Cada CTA toma la URL de un **manifiesto público allowlist** con hosts de cada entorno y ruta comprobada. No usar URL de origen no validado ni path `/driver/…` relativo al portal advertiser.
- Preservar referral code permitido en la transferencia sin exponer credenciales ni introducir open redirect.

### Reglas concretas de la raíz
Resolver con tests:
1. Guest `GET /` → landing, `200` (sin redirect al login).
2. Auth ADVERTISER `GET /` → comportamiento acordado en ADR (landing + ir a dashboard o redirect explícito). Nunca loop.
3. `/advertiser/login`, `/advertiser/onboarding`, `/advertiser/dashboard` permanecen funcionales.
4. Middleware mantiene protección de rutas privadas, incluyendo roles de terceros.
5. `_app.tsx` reconoce landing pública y no aplica layout privado. Revisar que `PaymentLockOverlay`, `AntigravitySync` y proveedores no filtren información o generen efectos no pertinentes en raíz, **sin desactivar su control en dashboards**.
6. Validar redirects de `next.config.js` y middleware juntos y cada host real/staging antes del deploy.

## 7. Onboarding: integrar, no reinventar

El flujo **público educativo** tiene 3 microacciones opcionales (seleccionar rol → probar → actuar). **No se presenta como onboarding legal**.

| Perspectiva | Experiencia landing | Proceso oficial existente | Fin válido |
|---|---|---|---|
| Advertiser | Ciudad → laboratorio → CTA | `/advertiser/onboarding`, 4 etapas | Registro recibido / revisión / pago según backend; NO cuenta ACTIVE instantánea |
| Driver | Slots/CPA → simulación → CTA | `/driver/onboarding`, 4 etapas; verificar URL canónica | Registro y evaluación; nunca wallet/payout creado por una demo |
| Flota | Estado → mapa demo → CTA | Portal admin protegido o canal comercial aprobado | Login real o solicitud comercial; no auto-admin |

- No abrir registro cross-domain dentro de modal o iframe si vulnera cookies, OAuth, CSP, foco o contract; preferir navegación clara al portal correspondiente.
- Modal **solo** para microexperiencia pública aislada o FAQ, no para copiar contrato o captura de cuenta bancaria.
- La landing no envía contraseñas, cédulas, RNC, cuentas ni comprobantes a analytics.
- Un flujo «éxito» visual no confirma aprobación, pago ni provisión de usuario.
- R7: Creatividades MP4 H.264 ≤55 MB, en subida/campaña donde aplique; no imponer carga multimedia pesada en landing.
- Mantener idempotencia y transiciones autorizadas en API.
- No iniciar nuevas altas reales en entorno demo sin backend staging y permisos.
- Si onboarding real está bloqueado, publicar CTA seguro a contacto implementado o deshabilitar captación con explicación honesta; nunca prometer registro que no sirve.

## 8. Rendimiento: presupuestos y diseño 10X

### Objetivos de experiencia (medir, no prometer)
- Core Web Vitals, p75 móvil real cuando exista: **LCP ≤2.5 s; INP ≤200 ms; CLS ≤0.1**.
- Lighthouse móvil en ambiente representativo: objetivo ≥90 Performance, ≥95 Accessibility, ≥90 Best Practices/SEO; registrar dispositivo, throttle, fecha, SHA, captura y variabilidad.
- Budget adicional de JS de landing: objetivo inicial **≤60 KB gzip sobre baseline** para funcionalidad anterior al primer interaction; cualquier excepción con evidencia bundle analyzer y ADR. Medir, no declarar cumplido sin datos.
- Mantener bundle de mapa y carousels fuera del JS inicial cuando no se usan.
- Mockup del hero con SVG/CSS y poster estático local; vídeo solamente bajo interacción o tras condiciones verificadas, muted, `playsInline`, sin bloquear LCP ni autoplay sonoro.
- Fonts optimizadas, `next/image` para media raster, `sizes` correctos, WebP/AVIF y placeholders; evitar layout shifts.
- `next/dynamic` para demo Leaflet, SSR disabled; lazy hydration al entrar a vista o interacción, loading accesible y fallback.
- `IntersectionObserver` para activar una escena y suspenderla fuera de vista; evitar scroll listeners continuos y timers permanentes.
- Debounce de simulador; no fetch remoto por cada pixel movido. Cancelar solicitudes al cambiar rol.
- Map tiles: usar proveedor con derecho de uso comercial y capacidad suficiente. **Que OSM data sea gratis no significa que `tile.openstreetmap.org` provea infraestructura gratuita ilimitada**. Respetar atribución, caché, referer y política; sin proveedor estable, renderizar mapa vectorial SVG demo ligero.
- Con 10X visitas: landing puede servirse con contenido estático/SSR cacheable según diseño, demos locales sin carga a API de campañas ni suscripciones Realtime, y cero coste de telemetría en visitor.
- Degradación: JS disabled → contenido y CTA aún visibles; red lenta → poster y texto; mapa sin tiles → demo SVG + leyenda; `reduced-motion` → información estática legible.

## 9. Accesibilidad, seguridad, privacidad y veracidad

**Accesibilidad**
- WCAG 2.2 AA como meta; navegación completa por teclado; tabs y sliders con labels, `aria-valuetext` en RD$, `aria-live` moderado para cambios de cálculo, dialogs con foco contenido y salida Escape.
- Interacciones touch: controles visibles y equivalentes a hover; contraste verificado; enlaces distinguibles.
- Carruseles: pausa y controles Prev/Next; no reproducción automática de contenido esencial. Evitar mareo y flashes.
- SEO: `Head` en Pages Router; `title`, description, OG con assets permitidos, canonical, headings semánticos, FAQ sin claims ficticios, contenido por rol disponible para rastreo.

**Seguridad / RBAC**
- La perspectiva seleccionada y `localStorage` **no otorgan permisos**.
- No SSR de datos de flota productiva, ni acceso público a sockets/realtime privados, ni IDs reales, coordenadas individuales o metadata identificable.
- Demo fixtures sintéticos con etiqueta visible, no basta un comentario en código.
- Sanitizar contenido externo; no `dangerouslySetInnerHTML` con textos de usuario; proteger enlaces cross-origin contra open redirect, aplicar `rel` apropiado a nuevos tabs.
- Autorización y ownership únicamente en backend. No habilitar `simulate-budget` para anónimos como atajo.
- No hacer cambios a estados de contrato, pago, comisiones, ledger, Prisma o RLS para facilitar landing.

**Analítica honesta**
Eventos mínimos: `landing_view`, `perspective_selected`, `story_step_viewed`, `budget_demo_used`, `earnings_demo_used`, `fleet_demo_opened`, `cta_clicked`, `onboarding_started` y `onboarding_completed` **solo si el flujo oficial/backend confirma etapa correspondiente**.
- Respetar banner y preferencias de consentimiento existentes en `@tad/ui` antes de analytics opcional.
- No rastrear contenido de formularios, email, RNC, teléfono, cédula, banking ni tokens.
- Deduplicar views/CTA, evitar disparar evento con cada frame de slider.
- A/B testing solo cuando haya volumen y métrica clara; no introducir SDK externo automáticamente.

## 10. Guía editorial y copywriting de conversión

Todo titular debe responder una pregunta en lenguaje humano. Prohibido texto corporativo vacío («revolucionamos el ecosistema») si no explica valor.

| Bloque | Texto orientativo | Visual / CTA |
|---|---|---|
| Headline general | «Tu ciudad se mueve. Tu marca también.» | Tablet/taxi editorial + selector |
| Advertiser | «Haz que tu próximo anuncio viaje por la ciudad.» | Probar escenarios → planificar |
| Driver | «Descubre cómo tu ruta puede abrir nuevas oportunidades.» | Calculadora ilustrativa → requisitos |
| Flota | «Entiende el estado de cada dispositivo en un vistazo.» | Diagnóstico sintético → solicitar demo / acceso seguro |
| Cómo funciona | «Planea. Reproduce. Verifica.» | Secuencia conceptual |
| Datos | «Métricas claras, con límites claros.» | Métricas explicadas y metodología |
| CTA final | «Elige tu próxima ruta con TAD.» | CTA según perfil |

**Evitar:** «hasta RD$7,500/mes garantizados», «ROI asegurado», «miles de pantallas activas» sin prueba, «online en vivo» para demo, contadores de visitas falsos, testimonios inventados y distintivos de certificación no comprobados.

## 11. Plan de ejecución por PR y criterios de aceptación

### Fase 0 — Discovery / informe bloqueante
Inspeccionar HEAD, `git status`, `package.json`, `pnpm-lock.yaml`, entradas `/`, `next.config.js`, `middleware.ts`, `_app.tsx`, Auth/PaymentLockOverlay, `packages/ui`, workflows y dominios. Reconstruir UX actual de 3 portales, lectura de `@tad/impact-calculator` y contratos onboarding. Entregar:
- `docs/ux-landing/00-baseline.md`: SHA, rutas, estado actual, capturas si hay browser, problemas y riesgos.
- `docs/ux-landing/01-adr-public-routing.md`: decisión de raíz, sesión/anon, dominios, layout y alternativas.
- Matriz P0–P3 con evidencia y stop conditions.

### Fase 1 — Storyboard / diseño en código
- `docs/ux-landing/02-storyboard.md`: 7 escenas + microcopy + narrativas por rol.
- `docs/ux-landing/03-design-system.md`: tokens, tipografía, motion, reduced-motion, estados y responsive.
- `docs/ux-landing/04-component-selection.md`: catálogo candidato, coste de JS, dependencias, licencia, por qué se incluyó/rechazó.
- Prototipo funcional local con 3 perspectivas y 1 demo por rol; revisar en móvil primero.
- Revisar el diseño con screenshots de 390px y 1440px y ver contraste; no declarar completo con solo mockups.

### Fase 2 — PR-A: landing pública y routing seguro
Implementar shell editorial, header, hero, switcher accesible, footer, CTA, rutas allowlist. Resolver redirects `next.config.js` / `middleware.ts` / `_app.tsx` de forma coordinada. Pruebas para guest/auth + rutas privadas. **Sin tocar onboarding**.

### Fase 3 — PR-B: relatos y laboratorios interactivos
Implementar storytelling de campaña/tablet, simulación de advertiser basada en contrato verificado, calculadora R6 pura y mini jornada del conductor. Unit tests de fórmula, input adversarial, fallback y veracidad editorial.

### Fase 4 — PR-C: Mini Command Center
Agregar fixture 100% sintético, mapa Leaflet dinámico o fallback SVG, semáforo, diagnóstico interactivo y estados empty/offline/slow. No suscripción real ni token privado.

### Fase 5 — PR-D: conexión con onboarding, analytics, SEO
Conectar URLs existentes, preservar referral, integrar tracking con consentimiento, SEO/FAQ, estados de error y enlaces de retorno. Modificar onboarding **solo con issue e historia verificadas**; corregir ciclo identidad/registro por PR separado de seguridad.

### Fase 6 — QA y handoff
E2E, pruebas de rendimiento, accesibilidad, bundle, verificación de host de staging, screenshots, documentación y checklist de rollback. Merge/deploy requieren aprobación explícita.

## 12. Verificación obligatoria (comandos ilustrativos, confirmar scripts)

```bash
# Inspeccionar primero el package.json y la convención real de workspaces.
pnpm --filter @tad/advertiser build
pnpm --filter @tad/advertiser lint
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.json

# Ejecutar solo las suites disponibles/instaladas; no inventar resultados.
pnpm --filter @tad/advertiser exec playwright test <ruta-test-real>
# Suites unitarias según runner real del workspace.
# Inspeccionar y ejecutar tests relevantes de driver/API si se tocan contratos.
```

⚠️ `apps/advertiser/next.config.js` contiene flags `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`; **un build verde no prueba TypeScript ni lint**. Jamás silenciar tests/errores para pasar CI. No añadir `any`, `@ts-ignore` o timeouts arbitrarios como parches.

**Matriz E2E mínima**
1. Guest abre `/` y ve hero + tres roles sin login ni redirección.
2. Auth advertiser mantiene login/dashboard correctos sin loops; driver/admin no acceden al dashboard advertiser.
3. Cambiar roles con mouse, touch y teclado actualiza contenido, CTA, foco y labels; refresh conserva preferencia opcional sin permisos.
4. CTA advertiser va a URL real de onboarding; driver a dominio correcto; flota a solicitud/demo o login real; sin links muertos.
5. Calculadora driver verifica 0, 1, 15, 16, negativos, decimales, `NaN`, `Infinity`, CPA válido; cero desbordamiento.
6. Advertiser no presenta alcance ni disponibilidad inventados y no llama API `simulate-budget` como anónimo.
7. Semáforo demo diferencia `online`, `recent_offline`, `long_offline`, dato ausente, timestamp inválido; estado de pago separado.
8. Map client-only no rompe SSR; tiles fallidos usan fallback; accesibilidad y atribuciones visibles.
9. Mobile 320/390/768/1440 sin scroll horizontal ni CTA oculto; fotos/video con poster; teclado, focus, readers, reduced motion.
10. Page sin JS conserva copy SEO, links y CTA; slow 3G no rompe interacción básica.
11. Auditar HTML/JS/eventos por secretos, JWT, PII, coordenadas reales; regresión de registro, login, payments y offline en portales afectados.
12. Bundle analyzer y Lighthouse en entorno representativo con mediciones reproducibles; registrar resultados reales.

## 13. Definition of Done y stop conditions

**Listo solo si:**
- La landing **pública** se muestra en host configurado y `/` sin redirect indeseado.
- Las 3 experiencias poseen interacción útil (no decoración), narrativa clara y CTA verificable.
- Storytelling, simuladores, mapa y FAQ tienen estados loading/error/fallback y alternativa con reduced motion.
- **Cero datos de producción** en demos; RBAC, identidad, pagos, offline y state transitions intactos.
- Fórmulas y números etiquetados correctamente; sin pronósticos inventados ni beneficios garantizados.
- TypeScript strict, lint, tests relevantes, Playwright, accesibilidad, screenshot visual y build/CI con evidencia.
- Presupuesto JS y Core Web Vitals medidos; excepciones documentadas.
- Documento de selección de componentes con licencia y costes.
- PR dividido por riesgos y plan de rollback preciso.

**Bloquear / parar:**
- P0 secretos, exposición de datos o rutas privadas, pérdida de datos, acción financiera no idempotente.
- Signup sin verificación de Supabase Auth, email, activación o flujo legal/cobro (puede continuar demo pública y dejar CTA comercial seguro).
- Dependencia sin licencia utilizable, componentes premium de pago encubiertos o servicios externos imposibles de operar legalmente.
- Root routing no resuelto, regresión de login/dashboard, tests que no ejecutan por infraestructura sin diagnóstico.
- No existen URLs reales de CTA o contenido publicitario claims no soportados.

## 14. Rollback

- Proteger la landing con feature flag/entrypoint reversible **solo si el mecanismo está documentado y es seguro**; al revertir, restablecer redirects previos y ruta login.
- Revertir únicamente commits de PR de landing, NO borrar modificaciones ajenas con `git checkout HEAD -- apps/advertiser/`.
- Mantener `apps/driver`, `apps/admin`, middleware de portales, Service Workers e integridad financiera sin cambios.
- Verificar después del rollback `/`, logins, callbacks OAuth, onboarding, dashboards autorizados y ausencia de loops.

## 15. Reporte final del agente (formato obligatorio)

```
OBJETIVO:
HEAD / BRANCH / SHA:
BASELINE / EVIDENCIA:
DECISIÓN DE ARQUITECTURA (ADR):
STORYBOARD UX + COMPONENTES GRATUITOS ELEGIDOS + LICENCIAS:
ARCHIVOS AFECTADOS:
CAMBIOS REALIZADOS:
RUTAS Y ONBOARDING VERIFICADOS:
SEGURIDAD / RBAC / IDENTIDAD:
FINANZAS R6 / IMPACTO / OFFLINE:
RENDIMIENTO MÓVIL (mediciones + entorno):
ACCESIBILIDAD / RESPONSIVE:
UNIT / TS / LINT / E2E / BUILD / CI (comandos + resultados):
RIESGOS ABIERTOS:
ROLLBACK:
PR:
ESTADO: VERIFICADO | IMPLEMENTADO PENDIENTE DE VERIFICACIÓN | BLOQUEADO
```

## 16. Prompt de activación (copiar a un agente con acceso al repositorio)

> Ejecuta íntegramente la skill `tad-landing-experience-multirol-v3` sobre `tadtaxiadvertising/tad-dooh-platform`. Empieza por auditar el HEAD real de `main`, las tres fuentes de redirect de `/` (Next config, middleware y app layout), las rutas reales de onboarding, la librería compartida de impacto y los contratos de seguridad. Diseña una landing que parezca una experiencia interactiva de producto y no un brochure: hero con selector por rol, historia de anuncio a tablet, laboratorio de presupuesto honesto, calculadora R6, demo de flota aislada, explicaciones visuales y CTAs funcionales. Usa preferentemente las dependencias ya instaladas; selecciona componentes gratuitos shadcn/ui, Embla o React Bits **solo si** mejoran UX y superan revisión de compatibilidad, licencia y rendimiento. Prioriza móvil, accesibilidad, SEO, fast loading, reduced-motion y narrativa en español dominicano. Reutiliza los onboarding existentes, nunca eludas RBAC ni expongas datos reales. Divide el trabajo en PRs seguros, ejecuta pruebas, documenta evidencia y solicita revisión antes de merge/deploy productivo. No declares resultado verificado sin evidencias.
