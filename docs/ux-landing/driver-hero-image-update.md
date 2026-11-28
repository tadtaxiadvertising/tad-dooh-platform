# Driver — actualización de imagen horizontal

- Fecha: 2026-11-11, America/La_Paz.
- Base: `3aef4a8c` (PR #250 ya fusionado).
- Rama: `codex/driver-hero-image-update-20261111`.
- Producto verificado: `7aaec506e2efc920016bc7cc0fb92cdfef8f6000`.
- Estado: **VERIFICADO LOCALMENTE EN EL ALCANCE**; CI y rendimiento general no se certifican como verdes.

El usuario pidió «Actualiza la imagen» y adjuntó `ChatGPT Image Nov 11, 2026, 01_04_55 AM.png`. Se copió exactamente ese PNG a `apps/driver/public/tad-driver-taxi-headrest.png`, retirando el WebP anterior. No se generó otra imagen, no se modificaron sus píxeles y el archivo de Downloads permanece intacto.

| Propiedad | Valor |
| --- | --- |
| Dimensiones originales | 1536 × 1024, proporción 3:2 |
| Tamaño original | 1.773.502 bytes |
| SHA-256, copia y original | `6fbe575ef471c801f53d355bd98316addd2586c6497ba47c61c1a01e93bc242a` |
| Entrega observada, móvil 320 px DPR2 | WebP de 36.956 bytes, HTTP 200 |
| Entrega observada, móvil 390 px DPR2 | WebP de 45.542 bytes, HTTP 200 |
| Entrega observada, 768/1440 px DPR1 | WebP de 36.956 bytes, HTTP 200 |

`next/image` conserva import estático, prioridad y alt accesible. Se actualizaron dimensiones y `sizes`; el marco usa 3:2, `contain` y el ancho móvil disponible, con máximo de 600 px. El PNG original se conserva en el repositorio como fuente y el optimizador de Next genera las variantes de entrega. No se cambiaron copy, calculadora, tabs, login, onboarding, permisos ni feature flags.

## Verificación

Windows, Node 22.20.0, Next 15.5.28 y dependencias locales existentes, sin nueva instalación frozen. Configuración sintética y URL loopback; sin datos productivos.

| Comando/escenario | Exit | Resultado y evidencia |
| --- | ---: | --- |
| `node --test scripts/driver-landing.test.cjs` | 0 | PASS, 13/13; `tests.log` |
| `node apps/driver/node_modules/typescript/bin/tsc --noEmit --project apps/driver/tsconfig.landing.json` | 0 | PASS; `checks.json` |
| `node node_modules/eslint/bin/eslint.js --config apps/driver/eslint.config.mjs apps/driver/components/landing/DriverLandingPage.tsx` | 0 | PASS; `checks.json` |
| Primer `next build apps/driver`, reutilizando caché | 1 | FAIL interno de WasmHash al resolver snapshots de contextos symlink; `build.log` |
| Mismo build con caché nueva y sin otros cambios de producto | 0 | PASS, 13 páginas estáticas; `build-fresh-cache.log` |
| `DRIVER_LANDING_BASE_URL=http://127.0.0.1:3404/ node scripts/driver-landing-smoke.cjs` | 0 | PASS, 15 comprobaciones sobre standalone compilado; `smoke.log` |
| Probe de entrega y capturas en 320/390/768/1440 px | 0 | PASS, recurso optimizado HTTP 200, sin peticiones externas; tap de Ventas/Pantalla a 390 px; `delivery.json` y `hero-*.png` |
| `git diff --check` | 0 | PASS |

La caché del build fallido se preservó fuera del repositorio antes de repetir. El stack apunta a snapshots de symlinks/junctions de las dependencias compartidas, no al loader de PNG. El segundo build pasó sin cambiar código; no se afirma una causa raíz de infraestructura demostrada ni se añadieron workarounds de configuración al producto.

El smoke comprueba 320, 360, 375, 390, 428, 430, 768, 1024, 1440 y 1920 px con y sin JavaScript, imagen pública y decodificada, proporción sin recortes, geometría sin overflow y puntos de oclusión. También conserva fixtures independientes de calculadora, teclado, CSS zoom 200%, reduced motion, flag y aislamiento público. No hubo errores de consola/JavaScript, requests HTTP fallidos, llamadas API o registro de SW. Las pruebas de formato se actualizaron a firma PNG, IHDR real e IEND sin debilitar controles financieros o de permisos.

La revisión visual de las capturas desktop/móvil confirma que se usa la nueva composición horizontal y se conservan completos el taxi y el callout. Son pruebas emuladas, no dispositivos físicos ni certificación WCAG completa. No se repitió Lighthouse para esta sustitución: el resultado previo de Performance 52/LCP 4,4 s corresponde al commit anterior y sigue documentado como pendiente en [el informe #249](driver-hero-249-verification.md). Tampoco se declara CI verde con pruebas locales.

## Artefactos y entrega

Evidencia local fuera de Git: `C:/Users/Arismendy/.codex/visualizations/2026/11/11/01a1c8ea-df4e-7ed2-894a-18736d7e3b0b/driver-image-update/`.

Los SW/Workbox generados por el build se restauraron a la base y no se incluyen en el cambio. El servidor propio se detiene al cerrar QA. Reversión: `git revert 7aaec506e2efc920016bc7cc0fb92cdfef8f6000`, revisando dependencias. Sin merge, deploy, migraciones ni operaciones de datos.
