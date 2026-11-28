# Optimización del runtime de movimiento público — 2026-11-11

## Estado / base

- Rama: `perf/public-landings-no-motion-runtime-20261111`.
- Base: `main@4d56b03c50d5a2216895abf6ef73629df5ac4ce0` (PR #253 fusionado).
- Modo: SAFE DEVELOPMENT, sin merge ni deploy.
- Objetivo: reducir JavaScript de entrada en componentes públicos sin alterar contratos ni comportamiento relevante para usuarios.

## Evidencia y causa de la intervención

- `apps/advertiser/components/landing/LandingPage.tsx` importaba `useReducedMotion` desde `framer-motion` únicamente para controlar una breve animación de resultado.
- `apps/driver/components/landing/DriverEarningsLab.tsx` importaba `motion` y `useReducedMotion`: las tarjetas declaraban `initial={false}`, `whileInView={{ opacity: 1, y: 0 }}` y ninguna variante visible distinta de su estado inicial. El resultado numérico también se animaba mediante `Element.animate`.
- En la documentación anterior hay un Lighthouse móvil de Driver de 52/100 y LCP de 4,4 s, pero ese resultado no permite atribuir causalidad a Framer Motion y se obtuvo en otro SHA y una máquina limitada.
- El PR #253 fue fusionado aunque los workflows GitHub Actions mostraron fallo sin registrar pasos. `main` figura como no protegida en el API de ramas. Se necesita intervención de CI/administración independiente.

## Cambios

1. Los dos componentes públicos dejan de importar `framer-motion`. Se conserva el motor de movimiento en los flujos privados/onboarding donde sí puede aportar comportamiento real.
2. Los outputs de dinero conservan animación de 180 ms **solo cuando el valor ha cambiado**; se comprueba soporte de Web Animations y `matchMedia("(prefers-reduced-motion: reduce)")` al ejecutar el efecto. Sin esas APIs, se conserva el resultado estático. Se mantiene `cancel()` en limpieza.
3. Los tres controles del laboratorio Driver emplean `div` semánticos en vez de envoltorios `motion.div` sin animación diferenciada, sin alterar inputs, labels, estructura ni cálculo.
4. La prueba de regresión `landing-creative-reframe.test.cjs` verifica las nuevas invariantes y elimina la expectativa obsoleta `reduceMotion !== false`.

## Verificación realizada

- Inspección de los tres fuentes mutados desde el conector GitHub.
- 21/21 aserciones estáticas independientes sobre importaciones, flags, WAAPI, reduced motion, outputs, total anterior, límites y contrato de registro.
- **No ejecutado en este entorno:** tests de Node, TypeScript, build, Playwright ni Lighthouse, debido a la ausencia de checkout de dependencias y a que los jobs de GitHub Actions aún no inician pasos. Esta inspección no acredita mejora porcentual, ausencia de regresiones en browser ni carga de chunks.

## QA requerido

```bash
pnpm install --frozen-lockfile
node --test scripts/landing-creative-reframe.test.cjs scripts/landing-cinematic.test.cjs scripts/landing.test.cjs scripts/driver-landing.test.cjs scripts/driver-preview-arithmetic.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
pnpm --filter @tad/advertiser build
pnpm --filter driver build
```

Adicionalmente: local Chromium `landing-v3-smoke.cjs` y `driver-landing-smoke.cjs`, emulación 320/390/768/1440, inputs por teclado, cambio de cantidad con/ sin reduced motion, sin `window.matchMedia`, y análisis de chunks/compresión y Lighthouse en mismo hardware/config antes-después. **No fusionar** hasta tener evidencia suficiente.

## Impacto / riesgos

- La aplicación puede continuar incluyendo Framer Motion por otras rutas o componentes; no se afirma su eliminación global.
- Sin modificación de API, DB, RLS, wallets, liquidaciones, player, offline, URLs, tarifas, assets, creative opt-in ni feature flags.
- Reversión: cerrar PR no fusionado o revertir commits de esta rama; no hay migración de esquema ni side effects externos.

**Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN EJECUTABLE.**
