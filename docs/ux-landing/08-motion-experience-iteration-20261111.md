# TAD Motion Experience — Iteración 01 (2026-11-11)

## Objetivo y alcance

Mejorar comunicación del producto, coherencia de la interacción y experiencia móvil de las dos landing pages públicas sin alterar contratos económicos, acceso, onboarding, dispositivos ni offline-first. Rama independiente `feat/landing-motion-experience-20261111` desde `main` `64ccc14147cde3481fee55493842652b895d973a`. No merge ni despliegue.

## Diagnóstico (evidencia de fuente)

- Driver `DriverLandingPage.tsx`: tres capítulos cambiaban la descripción, pero la imagen aprobada del taxi no incluía una representación complementaria del proceso comercial.
- Anunciante `LandingPage.tsx` y `CityScene.tsx`: el hero variaba por ciudad, pero la creatividad de ejemplo solo cambiaba en el simulador inferior con el objetivo seleccionado.
- `scripts/landing-cinematic.test.cjs` buscaba `TaxiIllustration`, componente retirado en anteriores iteraciones del hero, y suponía la firma anterior de `CityScene`.
- La medición Lighthouse histórica de Driver era 52/100 con LCP 4,4 s en host limitado. No se ha repetido para este SHA; no atribuir ese resultado a estas modificaciones.
- La auditoría V5 documenta diferencias de precios entre calculador y backend. No son resueltas por una intervención visual.

## Cambios aplicados

1. **Driver:** se conservan el PNG estático aprobado, `next/image`, dimensiones, `sizes`, prioridad y `alt`. Los selectores Pantalla/Ventas/Referidos muestran ahora una secuencia compacta de tres hitos inmediatamente debajo de los controles, visible al cambiar de opción también en móvil. La fotografía queda intacta a continuación. Los estados de aprobación se explican sin simular un saldo ni añadir una segunda tablet sobre la imagen.
2. **Anunciante:** `CityScene` acepta `objective`, cambia el texto de la creatividad en función de `awareness / launch / local` y refleja los datos elegidos en sus atributos accesibles. Un selector de objetivo situado junto al hero usa exactamente el mismo estado del simulador de presupuesto inferior. La elección de ciudad desde el hero también registra el mismo evento de preview sin datos personales.
3. **Copy:** se hace explícito el producto en el primer bloque del anunciante y se describe el acceso al portal sin prometer inventario.
4. **Responsive y movimiento:** nuevos estilos fluidos y controles táctiles de 44 px; en móvil se anula la animación continua decorativa del taxi y tablet ilustrativos para preservar atención y minimizar trabajo de composición.
5. **Regresión:** se actualiza la suite cinematográfica para la imagen real del Driver y los nuevos contratos de presentación.

## Invariantes verificados en código

- `includeProduction` empieza en `false`; no hay cambio de precios, simuladores, comisiones, wallet o liquidaciones.
- El Driver conserva el límite de 15 campañas de su helper existente, el reparto entre ingreso mensual y bonos/eventos y los CTAs sujetos al feature flag.
- Sin cambios en Auth, API, RLS, DB, player, service workers, GPS, sincronización o cobros.
- Sin dependencias nuevas ni vídeo automático. La imagen fuente del taxi no se sustituye ni se altera.

## Pruebas obligatorias para aceptar el PR

```bash
pnpm install --frozen-lockfile
node --test scripts/landing-cinematic.test.cjs scripts/landing-creative-reframe.test.cjs scripts/landing.test.cjs scripts/driver-landing.test.cjs scripts/driver-preview-arithmetic.test.cjs scripts/cookie-management.test.cjs
pnpm exec tsc --noEmit --project apps/advertiser/tsconfig.landing.json
pnpm exec tsc --noEmit --project apps/driver/tsconfig.landing.json
pnpm --filter @tad/advertiser build
pnpm --filter driver build
LANDING_BASE_URL=http://127.0.0.1:3003 node scripts/landing-v3-smoke.cjs
DRIVER_LANDING_BASE_URL=http://127.0.0.1:3004 node scripts/driver-landing-smoke.cjs
```

Los smoke scripts requieren servidores locales de los builds correspondientes con `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED=false`, endpoints sintéticos y sin datos productivos. Adjuntar capturas 320 / 390 / 768 / 1440, navegación por teclado, zoom 200 %, reducción de movimiento y comparativa Lighthouse bajo condiciones equivalentes. Comprobar `data-objective`, las tres opciones y sincronización con la calculadora, que siguen siendo pruebas de navegador pendientes.

**Ejecución de comandos:** no realizada en el entorno del conector GitHub (sin checkout con dependencias ni navegador). Las pruebas añadidas y el diff requieren CI y revisión visual antes del merge. No declarar PASS de builds, E2E o CWV de este SHA.

## Rollback

Revertir los commits de la rama en orden inverso o cerrar el PR sin merge. No hay migraciones, datos persistidos ni cambios de secrets que revertir. Verificar rutas públicas y la suite enfocada después de la reversión.

**Estado: IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN DE CI Y NAVEGADOR.**
