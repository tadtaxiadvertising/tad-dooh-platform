# TAD Anunciante — Vista previa de marca local (2026-11-11)

## Objetivo y decisión

Convertir el hero de la landing Anunciante en una demostración personalizada y reversible, sin modificar el contrato comercial ni introducir dependencias de animación, assets remotos, formularios persistentes o nuevos endpoints.

- Base de trabajo: `main@1b41c8e53dcf417eb823b05be168eef2a584b33c`.
- Rama: `feat/advertiser-local-brand-preview-20261111`.
- Alcance: componentes públicos `LandingPage.tsx`, `CityScene.tsx`, CSS del hero y regresiones de landing.
- **Sin merge ni despliegue** hasta superar QA. PR previsto en draft.

## Evidencia del problema

En el estado previo, el hero permitía alternar ciudad y objetivo de campaña, pero la creatividad de ejemplo no aceptaba ninguna información de la marca visitante. La vista conceptual mostraba exclusivamente textos fijos. Esto limitaba la capacidad del anunciante de imaginar su propio mensaje en una pantalla TAD. La imagen sigue siendo una ilustración CSS del taxi, no una fotografía real ni prueba de dispositivo activo.

## Implementación

1. **Campo de marca opcional:** `hero-brand-name` (texto, `maxLength=24`, autocompletado desactivado) en el hero, con etiqueta explícita y estado local `useState`.
2. **Contenido del anuncio ilustrativo:** `CityScene` acepta `brandName` opcional y muestra la marca como texto React escapado en el titular de la pantalla. Se aplica `trim`, colapso de espacios y límite de longitud solo para visualización; dejarlo vacío restaura el texto de ejemplo anterior.
3. **Accesibilidad:** el nombre, si existe, se incluye en la descripción accesible de la escena `role="img"`. El campo tiene label nativa, enfoque visible y altura mínima de 44 px. Layout dos columnas cuando hay espacio; una columna por debajo de 580 px.
4. **Privacidad:** el texto **no** forma parte de `recordPreview`, `trackAnalyticsEvent`, URL, `localStorage`, backend ni requests. Se mantiene únicamente como estado React durante esta visita. El texto ingresado se interpola mediante JSX; nunca `dangerouslySetInnerHTML`.
5. **Transparencia:** el hero informa que es una vista previa ilustrativa y que no equivale a una campaña publicada. No cambia la lógica del estimador, la elegibilidad del inventario ni el consentimiento de producción creativa, que inicia desactivado.

## Contratos de regresión

- `scripts/landing.test.cjs`: cuando se escribe una marca, debe cambiar el valor controlado, mantenerse el presupuesto y no emitirse un evento de analítica con el nombre, aun cuando se cambie la ciudad.
- `scripts/landing-cinematic.test.cjs`: 12 aserciones de fuente para los límites, estado, binding, estilos de enfoque y ausencia de cambios al flag de producción.
- `scripts/landing-v3-smoke.cjs`: la marca aparece en la pantalla del taxi, se conserva al cambiar objetivo, aparece en la descripción accesible, no cambia el presupuesto, texto que parece HTML se muestra literalmente y entradas largas se limitan a 24 caracteres.

## Evidencia disponible y gates pendientes

Las 12 aserciones nuevas de fuente se ejecutaron sobre los tres archivos de la rama recuperados desde GitHub con un evaluador JS aislado y pasaron. **No se han ejecutado** el test completo de Node, TypeScript estricto, compilación Next.js, Chromium ni Lighthouse para el HEAD. `main` permanece sin protección y los workflows recientes fallan antes de registrar pasos, documentado en issues [#147](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/147) y [#255](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/255).

### QA antes de aprobar

```bash
pnpm install --frozen-lockfile
node --test scripts/landing.test.cjs scripts/landing-cinematic.test.cjs scripts/landing-creative-reframe.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm --filter @tad/advertiser build
# Iniciar el build local según workflow vigente; luego:
LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-smoke.cjs
```

Capturar hero de 320/360/390/768/1440 px, zoom 200 %, teclado, `prefers-reduced-motion`, nombres de 24 caracteres, caracteres acentuados y nombres vacíos. Verificar que el contenido cabe en la pantalla CSS sin clipping, que no hay overflow horizontal, y que ninguna variable de marca aparece en la telemetría. Repetir contrastes y performance respecto a un build de `main` en el mismo entorno.

## Reversión e invariantes

Se puede cerrar el PR sin merge o revertir sus commits; no hay migraciones ni cambios de datos persistidos. No se tocaron pagos, comisiones, wallets, payouts, API, RBAC, Driver, Player, service workers, GPS, colas offline ni inventario real.

**Estado: implementado, pendiente de verificación ejecutable y visual.**
