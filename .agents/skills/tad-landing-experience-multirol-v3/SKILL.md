---
name: tad-landing-experience-multirol-v3
description: >-
  Diseñar, implementar y verificar una landing pública TAD DOOH de dos perspectivas
  (anunciante y conductor), interactiva, rápida, gratuita y compatible con Next.js 15,
  integrando los onboarding oficiales sin comprometer seguridad ni finanzas.
metadata:
  version: 3.1.0
  project: tadtaxiadvertising/tad-dooh-platform
  scope: advertiser-and-driver-only
---

# Skill TAD Landing Experience V3.1 — Anunciante + Conductor

## 0. Instrucción principal
Eres Principal Product Designer, Staff Frontend Engineer y Security/QA Lead de TAD.
Desarrolla una experiencia interactiva editorial premium para SOLO dos públicos:
**ANUNCIANTE** y **CONDUCTOR (DRIVER/TAXISTA)**. La landing no es una consola
operativa. **No incluir selector, demo, CTAs, cifras, formularios, historias ni páginas
comerciales de Flota o Administrador.** El portal Admin sigue funcionando por
sus rutas privadas independientes; no modificarlo.

Proceso: EVIDENCIA → DISEÑO → CAMBIO MÍNIMO → TEST → CAPTURAS → DOCUMENTACIÓN → PR.
Usa una rama revisable; jamás tocar producción, secretos, RLS, DB, wallets ni payouts.
No declarar verificaciones ejecutadas si solo fueron planeadas. Respetar el trabajo ya
existente del PR #168 y del branch actual; nunca sobrescribir cambios ajenos.

## 1. Baseline técnico real
- Repo: `tadtaxiadvertising/tad-dooh-platform`.
- `apps/advertiser/app/page.tsx` monta `LandingPage`, con App Router.
- `apps/advertiser/app/layout.tsx` define SEO y carga el tema global.
- `apps/advertiser/middleware.ts` permite `/` a invitados y redirige
  sesiones anunciantes a dashboard; `next.config.js` no debe sobreescribir
  esa raíz con un redirect. Mantener guardas de páginas privadas.
- `apps/driver/pages/index.tsx` usa `DriverLandingPage` (Pages Router),
  conservando middleware, PWA y rutas privadas del conductor.
- Stack ya disponible: React 19, Next 15, Tailwind CSS v4 con `@theme`,
  Framer Motion, Lucide, CSS Modules, SVG, CookieBanner y consentimiento
  `@tad/services`. No añadir dependencias por decoración.
- La landing de anunciante usa `apps/advertiser/lib/landing/model.ts` y
  `content.ts`, un recorrido `CampaignJourney`, escena `CityScene`
  y laboratorios locales.
- Los flujos transaccionales existentes son
  `/advertiser/onboarding`, `/driver/onboarding` y el registro Driver
  `/register`, cada uno con contratos diferentes: inspeccionar rutas
  y decidir URL canónica ANTES de enlazar; no duplicar formularios.

## 2. Narrativa visual de dos perspectivas
Idea global: **«Tu ciudad se mueve. Tu marca también.»**
En el Hero hay dos botones de perspectiva, accesibles por teclado y touch:
- **Anunciante:** «Haz que tu marca viaje por la ciudad».
- **Conductor:** «Tu taxi puede llevar más que pasajeros».

Cambiar la perspectiva debe actualizar, sin reload, el Hero, escena,
beneficios, laboratorio, FAQ contextual y CTA. El contenido editorial
de **ambos** roles debe ser visible sin JS y rastreable por buscadores.
La experiencia se explica con animaciones discretas, no pantallas vacías.

**Escenas propuestas:**
1. Hero cinematográfico con CSS/SVG taxi + tablet; selector dual.
2. «De la idea a la pantalla»: campaña → distribución → reproducción →
   reporte, con controles teclado, pausa y un estado inicial SSR.
3. Laboratorio Anunciante: seleccionar ciudad, objetivo y presupuesto
   RD$5,000–RD$150,000, sin estimar alcance sin contrato verificable.
4. Laboratorio Conductor: 15 slots visibles, CPA de ejemplo y desglose
   RD$ sin claims de ganancias garantizadas.
5. Educación: diferencia entre reproducciones, impresiones estimadas
   y resultados verificados; no confundir exposición con persona única.
6. Dos rutas claras: «Soy anunciante» / «Soy conductor», FAQs y CTA
   conducente a portales reales.
7. Cierre: objetivo comercial con llamada principal y alternativa
   informativa, nunca urgencia falsa.

La landing Driver dedicada (`apps/driver`) debe ofrecer una entrada
coherente con la experiencia dual y explicar requisitos, condiciones,
contrato y siguiente paso sin capturar identidad o banca en una demo.
La interfaz puede enlazar su registro solo cuando el gate de producto
esté habilitado y el contrato de identidad esté validado.

## 3. Herramientas gratuitas, velocidad y licencias
Primero reutilizar Tailwind 4, CSS Modules, Framer Motion, Lucide y
`@tad/ui`. HTML nativo `details/summary`, `input type=range`,
`button`, `output`, SVG local y `next/image` suelen ser suficientes.
Agregar componentes individuales shadcn/ui, Embla o React Bits SOLO
tras justificar utilidad real, licencia, compatibilidad React19/Next15,
peso y mantenimiento. No introducir mapas, WebGL, Three, GSAP,
carousels pesados, tiles, trackers o reproducción de vídeo para adornos.
Para dos públicos, la navegación clara supera la sofisticación inútil.

Conservar estilo «Stitched UI»: fondo `#0a0a0a`, TAD Yellow `#FFD400`,
superficies oscuras, texto contrastado, tarjetas glassmorphic moderadas.
Mantener CSS actual, sin `tailwind.config.js`. No mezclar arbitrariamente
`#FFD400` con el token `#FDCB01`; documentar su uso.

Accesibilidad WCAG 2.2 AA como objetivo: focus visible, teclas,
44 px de hit target, `aria-pressed` coherente, `aria-valuetext` de
monedas, contraste, lectura con poco movimiento, `prefers-reduced-motion`,
CTA usable en 320px y sin hover. Sin scroll-jacking ni autoplay con sonido.

Objetivos medidos, nunca asumidos: LCP <= 2.5 s, INP <= 200 ms,
CLS <= 0.1 p75 móvil, incremental JS <= 60 KiB gzip respecto baseline
comparable. Sin JS el copy editorial y los enlaces permanecen visibles;
con conexión lenta mantener layout y acceso.

## 4. Integridad del laboratorio financiero (R6)
Usar una función pura e inputs acotados:
`ingresoBrutoEjemplo = min(max(trunc(slots),0),15)*500 + max(trunc(cpaValidado),0)*500`
con comprobación `Number.isFinite`; el límite superior de CPA que
muestre la UI se marca como **límite de demo**, no negocio. No sumar
referidos pendientes como si fueran CPA ni mostrar saldo, payout o
retribución garantizada. Reglas server-side y ledger prevalecen.

Para Anunciante usar presupuesto como selector ilustrativo. No emplear
`budget * 120` o `ceil(budget/5000)` sin fuente/calibración y contrato
de producto. `@tad/impact-calculator` requiere inputs específicos
(pantallas, meses, frecuencia): no forzar una conversión engañosa.
La API `simulate-budget` requiere RBAC y no se habilita para anónimos.
Advertir que la demo NO confirma pantallas, alcance, ROI o cobertura.

## 5. Onboarding auténtico y seguridad
La landing no recopila RNC, cédulas, contraseñas ni cuentas bancarias.
Un selector de perspectiva no es autorización, un completado visual
no implica cuenta ACTIVE ni suscripción pagada.
- Advertiser: el onboarding oficial consta actualmente de 4 etapas
  (Beneficios, Simulador, Compromiso, Éxito), con revisión backend.
- Driver: el onboarding `/driver/onboarding` consta de 4 etapas
  (Bienvenida, Simulador, Registro, Éxito); existe además `/register`
  con otro wizard. Validar el flujo canónico y comunicar sus condiciones.
- El gate `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED` permanece cerrado
  salvo verificación de signup en staging, identidad Supabase/Auth,
  aprobación y pago. Si no habilitado, CTA a página informativa/login.
- Referrals: admitir solo token acotado, transferir únicamente a destino
  fijo y compatible con el portal. No recoger ni registrar PII o tokens.
- No exponer telemetría privada, añadir permisos ADMIN, alterar wallets,
  contratos, sync offline, middleware de sesión privada, RLS o Prisma.

Eventos consentidos: `landing_view`, `perspective_selected`,
`story_step_viewed`, `budget_demo_used`, `earnings_demo_used`
y `cta_clicked`. Sin datos identificables ni parámetros URL completos.
No simular `onboarding_completed` por interacción de landing.

## 6. Implementación incremental
1. **Inspección:** HEAD de PR #168 y `main`, diff, baseline,
   middleware/redirects, contenido, pruebas y documentos.
2. **Enfoque dual:** retirar la perspectiva tercera por completo de
   modelos, tarjetas, escenas, CSS, metadata, mocks, analytics, tests,
   skill y narrativa. Eliminar archivos sin usos.
3. **Pulido UX:** navegación dual, copy preciso, CTAs sin confusión,
   transición suave de estado, escena táctil/keyboard, diseño móvil,
   SEO por públicos y FAQ contextual.
4. **QA:** unit tests de R6 y URLs, smoke de navegador para dos roles,
   consent, SSR/no-JS, 320/390/768/1440, reduced motion y red lenta.
5. **Handoff:** documentación y PR actualizado con resultados reales.
   No auto-merge ni deploy.

No crear un nuevo portal ni duplicar landing de Driver en Advertiser.
No añadir un esquema de flota al tiempo que se retira el rol de flota.

## 7. Pruebas y Definition of Done
- `node --test scripts/landing.test.cjs scripts/driver-landing.test.cjs`.
- `node scripts/landing-v3-smoke.cjs` sobre servidor loopback,
  previa configuración `LANDING_BASE_URL` y dependencias disponibles.
- `pnpm --filter @tad/advertiser build` y build Driver si se modifica.
- `pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json`.
- Lint del alcance según scripts reales. Next build puede ignorar
  errores de TypeScript/ESLint: ejecutar checks separados.
- Reproducir navegadores en dispositivos móviles; comprobar 2 perfiles,
  ninguna opción visible de Flota, enlaces funcionales, 15 slots tope,
  no emisión de eventos sin consentimiento, accesibilidad, no-JS,
  tiempos medidos, inexistencia de llamadas API privadas.
- Documentar limitaciones de CI y pruebas no ejecutadas de forma
  explícita; no resolver bloqueos suprimiendo validaciones.

**Resultado exigido:** landing de 2 perfiles verificable, código
legible, componentes nativos rápidos, documentación de cambios,
rollback por commits acotados, cero alteraciones en portales
administrativos. `VERIFICADO` solo con evidencias, o
`IMPLEMENTADO PENDIENTE DE VERIFICACIÓN`.

### Prompt breve para agente
«En PR #168, conserva la experiencia de anunciantes y taxistas y
elimina totalmente la perspectiva Flota de la landing (código,
estilos, SEO, tests y documentación). Pulsa los CTAs correctos y
garantiza que el registro siga protegido. Prioriza interacción
ligera con componentes gratis ya instalados, diseño móvil,
accesibilidad, claridad financiera R6, seguridad y pruebas.
No modificar portal Admin, backend, DB, pagos ni el player.
Haz cambios mínimos, registra evidencia, deja el PR en borrador
y no hagas merge/despliegue».
