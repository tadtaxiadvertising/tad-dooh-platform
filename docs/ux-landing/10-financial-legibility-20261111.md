# Legibilidad financiera en las dos landings — 2026-11-11

## Objetivo

Mejorar la claridad de condiciones, supuestos y controles de simulación para visitantes en móvil. Esta intervención no modifica tarifas ni cálculos y conserva la transparencia de las advertencias comerciales.

Base: `main@73eaa9216f9eb29d59f66ce79cc65455453a673f`. Rama: `fix/landing-financial-legibility-20261111`. Sin merge ni deploy.

## Evidencia y causa

CSS inspeccionado desde `main`:

- Driver `driver-earnings-lab.module.css`: notas del control a 11 px, condiciones de pago a 11 px, texto de aprobación a 11 px, aviso y límites del simulador a 11 px en pantallas de hasta 400 px. El `input[type=range]` tenía `min-height:36px`.
- Anunciante `landing.module.css`: labels de formulario a 12 px, notas del alcance a 12 px, advertencias a 11 px, checkbox de producción opcional a 12 px, leyenda del rango a 10 px, aviso comercial a 11 px. El preview tiene fondos claros, por lo que las reglas de color y contraste existentes no se cambian sin medición.
- Ningún tamaño aislado demuestra por sí mismo un fallo WCAG; se trata de un riesgo de legibilidad basado en el CSS que requiere verificación real a 320/390 px, zoom 200 % y móvil físico.

## Cambio mínimo seguro

- **Driver:** eleva a 13 px las condiciones de compensación, notas, desglose, resúmenes y límites del simulador, incluida la regla móvil de `.rangeNote`. El selector nativo de rango tiene mínimo 44 px de altura. El desglose puede envolver el contenido para evitar cortes de cantidades con textos más grandes. Las áreas de números y el helper económico permanecen intactos.
- **Anunciante:** sube a 14 px las etiquetas de inputs, selector y checkbox de producción; a 13 px resúmenes, condiciones, tasas y advertencias; a 12 px las etiquetas auxiliares del rango, con área táctil mínima de 44 px también para los sliders del anunciante. Sin cambio de contraste, contratos, presupuesto, ni opt-in de producción creativa.
- **Regresión:** `scripts/landing-creative-reframe.test.cjs` incluye 13 comprobaciones nuevas de mínimos de legibilidad y área táctil.

## Evidencia ejecutada / límites

13/13 comprobaciones del nuevo test de CSS ejecutadas contra los textos de los archivos obtenidos directamente desde la rama GitHub, mediante una función JS aislada. No se ha ejecutado el test completo con `node --test` desde un checkout del monorepo; el entorno no tiene acceso a una copia con dependencias y GitHub Actions sigue bloqueado al preparar runners. Esta prueba **no valida la geometría real del browser, CSS Modules, WCAG ni rendimiento**.

### Verificación requerida en un runner habilitado

```bash
pnpm install --frozen-lockfile
node --test scripts/landing-creative-reframe.test.cjs scripts/landing-cinematic.test.cjs scripts/landing.test.cjs scripts/driver-landing.test.cjs scripts/driver-preview-arithmetic.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
pnpm --filter @tad/advertiser build
pnpm --filter driver build
```

Probar capturas de la landing y del simulador en 320/360/390/768/1440, zoom 200 %, landscape, navegación por teclado, selección de producción OFF/ON, rango 0/15 y cantidades de 100; comprobar que no hay texto cortado ni desbordamiento lateral. Comprobar `prefers-reduced-motion` y flujos de registro. Comparar LCP y TBT del mismo SHA y equipo antes de aprobar.

## Invariantes y rollback

Sin cambios en cálculos, comisiones, wallet, pagos, API, RBAC, PostgreSQL, Supabase, Player, GPS, offline queue ni feature flags. El PR es reversible sin migraciones: cerrar sin merge, o `git revert` sobre sus commits si se incorpora después de verificación.

La falta de ejecución CI en `main` se documenta en [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147); la protección de `main` está pendiente de [#255](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/255). **No fusionar sin evidencia real.**

**Estado: IMPLEMENTADO, VERIFICACIÓN PARCIAL DE FUENTE; QA DE NAVEGADOR Y BUILD PENDIENTES.**
