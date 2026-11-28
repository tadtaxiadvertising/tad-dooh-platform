# Taxi Driver con fondo transparente

- Pedido: «quitale el fondo a la imagen».
- Fecha: 2026-11-11, America/La_Paz.
- Base: `c2b0272c`, después del PR #251 fusionado.
- Rama: `codex/driver-transparent-taxi-20261111`.
- Estado: implementación y verificación local completadas.
- Commit de producto: `680e940e7c44c262c4a5d0e38270cb8a73e94d62`.

Se utilizó **ImageGen integrado**, modo edición, con `transparent_background=true`. El archivo adjuntado por el usuario fue el objetivo de edición. Se retiró el fondo exterior negro/gris y el resplandor ambiental; se conservaron el taxi, letrero TAXI, pantallas TAD, línea amarilla y círculo de ampliación con su fotografía interior. El resultado fue revisado visualmente sobre un checkerboard de navegador; ese patrón no está incrustado en el PNG.

El recorte sustituye `apps/driver/public/tad-driver-taxi-headrest.png` (1536 × 1024, 1.745.272 bytes). SHA-256: `ea9119cb6ac802791f534ffea941bf46815d5efb0c9edac4633c98aef71aa44c`. El PNG generado permanece en el directorio original de ImageGen y existe una copia descargable en la carpeta local de evidencia. El adjunto fuente en Downloads no se modificó.

Al inspeccionar los píxeles del PNG: 821.262 de 1.572.864 tienen alfa 0 (52,2%); 727.662 tienen alfa ≥250 (46,3%). No se presume transparencia por la extensión del archivo. El smoke ahora lee los píxeles decodificados de la variante realmente entregada por Next, y exige contenido transparente y contenido prácticamente opaco; así detecta tanto una imagen aplanada como una vacía.

Se retiró del CSS el marco con fondo, borde, sombra y resplandor; el taxi se integra directamente en la superficie de la landing. Se conservaron proporción 3:2, caption, alt, prioridad, controles, copy, calculadora y gates. `sizes` refleja el ancho sin padding del antiguo marco.

## Prompt final

> Image 1 is the edit target. Perform BACKGROUND EXTRACTION ONLY on this exact TAD taxi composition. Remove the entire exterior black/gray background, floor/background shadows and exterior yellow atmospheric glow, replacing all exterior negative space with genuine fully transparent alpha. Preserve the complete gray taxi, all wheels, headlights, windows and interior, the yellow TAXI roof sign, both yellow TAD screens and their exact black lettering/play icons, the yellow connector line and dot, and the entire yellow-bordered circular inset of the passenger seat/headrest/screen. The interior photograph inside the circular inset must remain opaque and intact; it is an inset, not the exterior background. Keep the same 3:2 landscape composition, framing, placement, scale, colors, realistic rendering and sharp edges as the source. Do not redesign, redraw, add anything, change the car, change any text, crop any subject, or move the circular callout. Clean cutout edges, no black/gray matte, no artificial outline, no halo, no baked checkerboard, no solid white background. Deliver a transparent PNG suitable for placing directly on the existing dark website.

## Evidencia local

`C:/Users/Arismendy/.codex/visualizations/2026/11/11/01a1c8ea-df4e-7ed2-894a-18736d7e3b0b/driver-transparent/`

Incluye `tad-driver-taxi-transparent.png`, `checkerboard-preview.png`, `source.json`, `alpha.json`, pruebas y logs. La previsualización de checkerboard sirve únicamente para inspección; el archivo entregable es el PNG transparente.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `node --test scripts/driver-landing.test.cjs` | 13/13 PASS, salida 0 |
| `tsc --noEmit --project apps/driver/tsconfig.landing.json` | PASS, salida 0 |
| ESLint de `DriverLandingPage.tsx` con configuración Driver | PASS, salida 0 |
| Build de producción Driver | PASS, salida 0; 13 páginas estáticas |
| `node scripts/driver-landing-smoke.cjs` sobre standalone compilado | 15/15 PASS, salida 0 |
| `git diff --check` y sintaxis del smoke | PASS |
| Revisión independiente del diff y alfa | APPROVE, sin defectos dentro del alcance |

El smoke comprueba imagen completa y transparencia real, reflow a zoom CSS 200%, teclado, movimiento reducido, SSR sin JavaScript, controles y ausencia de solicitudes remotas o errores JavaScript. No incluye login autenticado, registro real ni datos financieros.

La variante realmente recibida fue WebP con alfa: HTTP 200 en 320, 390, 768 y 1440 px; 39.052–47.896 bytes, 51,4–51,8% de píxeles transparentes y 45,4–45,9% casi opacos. La revisión visual de capturas móvil/escritorio confirmó taxi y círculo completos sobre la superficie de la landing. Ver `delivery.json`, `hero-*.png`, `smoke.log`, `tests.log` y `build.log` en la carpeta de evidencia.

Las dependencias locales compartidas se mantuvieron. Se preservó la caché anterior fuera del repo y se compiló con una nueva para evitar reutilizar los snapshots de junctions que fallaron en la intervención previa. No se alteró configuración del producto para el build. Los SW/Workbox generados se restauraron; no forman parte del diff.

No se certifican CI ni rendimiento general por este cambio de imagen; los pendientes previos no se consideran resueltos. Sin merge, despliegue, cambios de API, DB, pagos o autenticación.
