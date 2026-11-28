# Driver hero #249 — integración y verificación

- Estado: **VERIFICADO EN FUNCIONALIDAD LOCAL; rendimiento y CI pendientes para merge**.
- Fecha: 2026-11-11, America/La_Paz (ejecuciones aproximadamente 04:43–05:10 UTC).
- Base: `4905b307` (`origin/main`, después de los PR #247 y #248).
- Commit de producto verificado: `86b2db0b30878c59584cad781688e4c62b9edd27`.
- Rama: `codex/driver-hero-249`; checkout aislado, sin modificar el checkout original ni sus cambios pendientes.
- Entorno: Windows, Node 22.20.0, Next 15.5.28, TypeScript 5.9.3, Chromium 156.0.8078.4. Dependencias locales existentes enlazadas al checkout aislado; no se ejecutó una instalación completa con frozen lockfile.

## Problema y resultado

El [PR #247](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/247) ya estaba fusionado. El [PR #248](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/248) había incorporado un WebP como data URI y cambiado el titular. Se continuó desde main actualizado para cumplir el [issue #249](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/249), sin reabrir ni modificar main directamente.

El usuario confirmó en esta sesión: **«Sí, usar la imagen del PR #248»**. Se extrajeron exactamente sus bytes, sin generar otra imagen ni recomprimirla:

| Propiedad | Valor |
| --- | --- |
| Archivo | `apps/driver/public/tad-driver-taxi-headrest.webp` |
| Formato y dimensiones | WebP, 520 × 779 |
| Tamaño | 16.258 bytes |
| SHA-256 | `9427f57168d5b339c0082290226e345cc6e374625bcef8f51711af8fa827c4f4` |

Un import estático permite que `next/image` emita el recurso bajo `/_next/static/media/` y genere variantes responsive. Esas rutas ya están excluidas del middleware: no fue necesario ampliar permisos ni cambiar auth. La imagen usa dimensiones explícitas, `sizes`, `priority` y alt que identifica el reposacabezas del copiloto y la orientación hacia los pasajeros. El marco conserva toda la fotografía con su proporción intrínseca y `contain`; no añade otra pantalla encima del callout.

Se restauraron el titular «Convierte tus viajes en oportunidades de ingresos con TAD», la explicación de la pantalla detrás del copiloto, el CTA de simulación y el SEO congruente. Se ajustó el tamaño del titular tras revisar las capturas. Se preservaron las tres oportunidades, condiciones de aprobación, calculadora, login, enlaces, onboarding y feature flag. No se cambiaron importes, API, DB, pagos o configuración productiva.

## Verificaciones ejecutadas

Todos los comandos de esta tabla se ejecutaron sobre el mismo código del commit de producto. El build omite tipos/lint por configuración existente; por eso ambos se ejecutaron por separado.

| Comando o escenario | Exit | Resultado | Evidencia local |
| --- | ---: | --- | --- |
| Baseline: `node --test scripts/driver-landing.test.cjs scripts/driver-preview-arithmetic.test.cjs scripts/landing-creative-reframe.test.cjs` | 1 | FAIL inicial: 21 pasan, 1 falla por stub de React desactualizado | Ejecución inicial; corregida la prueba sin debilitar destinos ni montos |
| `node --test scripts/driver-landing.test.cjs scripts/driver-preview-arithmetic.test.cjs scripts/landing-creative-reframe.test.cjs scripts/cookie-management.test.cjs` | 0 | PASS: 38/38 | `tests.log` |
| `node apps/driver/node_modules/typescript/bin/tsc --noEmit --project apps/driver/tsconfig.landing.json` | 0 | PASS, tipos estrictos del alcance | `checks.json` |
| `node apps/driver/node_modules/typescript/bin/tsc --noEmit --incremental false --project apps/driver/tsconfig.json` | 0 | PASS, workspace Driver completo | `checks.json` |
| Primera invocación de ESLint desde la raíz, sin config explícita | 2 | FAIL de invocación: la configuración vive en el workspace | `lint.log` |
| `node node_modules/eslint/bin/eslint.js --config apps/driver/eslint.config.mjs apps/driver/components/landing/DriverLandingPage.tsx apps/driver/components/landing/DriverEarningsLab.tsx` | 0 | PASS | `checks.json` |
| `node apps/driver/node_modules/next/dist/bin/next build apps/driver` | 0 | PASS: build completo y 13 páginas estáticas generadas | `build.log` |
| `DRIVER_LANDING_BASE_URL=http://127.0.0.1:3404/ node scripts/driver-landing-smoke.cjs` | 0 | PASS: 15 comprobaciones sobre servidor standalone compilado | `smoke.log`, `responsive/` |
| Prueba táctil aislada, 320 y 390 px, DPR2, CPU ×4, latencia 150 ms, descarga 204.800 B/s | 0 | PASS: taps en tres oportunidades, CTA y slider; total independiente coherente | `touch-slow.json`, `touch-slow.log`, `hero-touch-*.png` |
| Lighthouse 12.8.2, perfil móvil predeterminado, CPU ×4 y red simulada | 0 | Informe generado; **rendimiento por debajo del objetivo** | `lighthouse-mobile.report.json`, `.html` |
| `node --check scripts/driver-landing-smoke.cjs` y `git diff --check` | 0 | PASS | Ejecución y revisión final del diff |

Los fixtures usan `NEXT_PUBLIC_LANDING_SIGNUP_ENABLED=false`, Supabase sintético `fixture.supabase.invalid` y backend loopback sin datos reales. Los tests unitarios comprueban el flag apagado y encendido. Se restauraron únicamente los SW/Workbox que el build regeneró; no forman parte del cambio.

La prueba heredada también trataba el enlace canónico SEO como navegación. Ahora conserva la excepción exacta `<link rel="canonical">`, exige enlaces nativos para la navegación y mantiene las comprobaciones de destinos privados. El smoke dejó de exigir las tarjetas del SVG retirado en #248: comprueba las tres descripciones accesibles y sus estados reales.

## Responsive, accesibilidad y motion

| Superficie | Cobertura y resultado |
| --- | --- |
| Imagen y layout | 320, 360, 375, 390, 428, 430, 768, 1024, 1440 y 1920 px, con y sin JavaScript. Imagen decodificada y pública, proporción completa, sin recortes, superposición en puntos muestreados ni overflow horizontal. Capturas completas guardadas. |
| Oportunidades | Teclado y taps: Pantalla → Ventas → Referidos → Pantalla; una opción activa, `aria-controls`, resumen `role=status` y `aria-live=polite`. |
| Calculadora | Fixtures independientes: 0/15 anuncios, ventas/referidos hasta 100, total máximo 107.500, restauración de valores, foco y orden de teclado. La UI no acredita pagos. |
| Motion | Foto estática sin nuevos motores, listeners o animaciones. Reduced motion sin animaciones relevantes. Feedback de importe existente: 180 ms al cambiar, sin animación inicial ni pérdida de foco. |
| Navegación/SSR | HTML inicial y no-JS conservan titular, foto y controles; menú y FAQ por teclado; login y destinos oficiales preservados. |
| Robustez | Cero errores JavaScript/consola, HTTP fallidos/404, peticiones externas, llamadas API o registro de SW en el smoke. CSS zoom 200% en portrait, landscape y desktop. |

Las pruebas de viewport y táctiles son emulación Chromium, no teléfonos físicos. CSS zoom no certifica zoom nativo. No se afirma conformidad WCAG completa ni verificación de login real, registro, Player offline o finanzas.

## Rendimiento: limitación visible

Una ejecución Lighthouse sobre el build compilado, a las 05:06:07 UTC:

| Métrica | Resultado |
| --- | ---: |
| Performance | **52/100** |
| Accessibility | 100/100 |
| Best Practices | 100/100 |
| SEO | 92/100 |
| LCP | **4.414 ms** |
| CLS | 0 |
| Total Blocking Time | **5.337 ms** |

El objetivo orientativo Performance ≥90 y LCP ≤2,5 s **no se alcanzó**. Lighthouse advierte que la CPU del host es más lenta que la esperada (benchmark 659,5). El elemento LCP fue el H1; el informe atribuye 89% del tiempo a render delay. El trabajo del hilo principal fue 8,6 s. Esto requiere perfilar el render/hidratación y repetir mediciones en un entorno controlado; no demuestra que la foto cause el retraso. No existe baseline compilado comparable para atribuir una regresión o mejora porcentual. No se midieron p75, INP de campo ni delta de bundle. El build informa 210 kB de First Load JS para `/`.

El descuento SEO proviene de `/robots.txt`, que devuelve el HTML de login por el routing existente. Ese routing no se cambió. No se amplió este arreglo visual a una modificación de middleware o infraestructura.

## Revisión del PR #247 y CI

La revisión independiente leyó su diff completo: cambios de copy y alt, sin defectos funcionales importantes encontrados. La revisión de código positiva del bot no acredita build.

Para el head `19274af94832e267676949e23f0269c00b1dab97`, GitHub informa 12 checks fallidos y uno omitido:

- [Docker Image CI](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/42952297184)
- [Landing V5 Focused Gates](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/42952297188)
- [CI Quality Gates](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/42952297272)

El merge `be8db7a78b20b16c0ff086076dbdf9e94c03aebf` también mostraba 12 fallidos y uno omitido. Los jobs consultados no devolvieron steps; logs 404 y annotations inaccesibles. No se pudo atribuir una causa. El CI del nuevo PR debe evaluarse sobre su HEAD exacto; estas pruebas locales no lo sustituyen.

La revisión independiente del nuevo diff de app, CSS y pruebas concluyó APPROVE en corrección semántica. Build, tipos, lint y smoke fueron comprobados posteriormente por el proceso principal. El PR se entrega en borrador con el rendimiento y el CI claramente pendientes; sin merge ni deploy.

## Artefactos y reversión

Directorio local de evidencia, fuera de Git:

`C:/Users/Arismendy/.codex/visualizations/2026/11/11/01a1c8ea-df4e-7ed2-894a-18736d7e3b0b/driver-hero-249/`

Incluye baseline dev (`before-1440.png`, `before-390.png`, `baseline.json`), capturas compiladas `responsive/driver-landing-*.png`, capturas táctiles, informes Lighthouse y logs. Las capturas no están publicadas remotamente; las del job CI estarán disponibles solo si su ejecución llega a generarlas.

Reversión del producto: `git revert 86b2db0b30878c59584cad781688e4c62b9edd27`, tras revisar dependencias de la rama. No hay migraciones ni efectos de datos que revertir. Los servidores propios se detienen al cerrar la verificación.
