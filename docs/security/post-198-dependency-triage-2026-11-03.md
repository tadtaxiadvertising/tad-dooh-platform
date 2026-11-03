# Dependencias después de PR #198: diagnóstico y tarjetas de remediación

Fecha: 2026-11-03, America/La_Paz. Destinatarios: mantenimiento, revisión de seguridad y responsables de CI de TAD DOOH.

**Veredicto del gate de seguridad: FAIL.** El job ejecutado sobre `main` tras #198 terminó con código 1 al ejecutar `pnpm audit --audit-level=high`. Este documento conserva el diagnóstico y separa propuestas futuras del cierre de CI/E2E y QA de las landings. **El alcance actual no altera dependencias, manifiestos, lockfile, API, datos ni producción. Ninguna remediación descrita aquí fue implementada.**

## Evidencia y límites

| Evidencia | Resultado medido y alcance |
| --- | --- |
| Ref inspeccionada con `git rev-parse origin/main` | `10774bb43c8190bdb3ebb0bd98d640ec144ea6cc`; merge de PR #198. Se leyeron fuentes con `git show origin/main:ruta`, porque el checkout principal no representa ese estado. |
| [Run 41637407917, job Security Audit 125921973633](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41637407917/job/125921973633) | Paso de audit, 2026-11-03 12:41:03 UTC, equivalente a 08:41:03 America/La_Paz. Comando `pnpm audit --audit-level=high`; salida 1. |
| Resumen textual del job | `65 vulnerabilities found`; `Severity: 8 low | 39 moderate | 18 high`. El resumen no enumera critical. No convertirlo en un audit actualizado del worktree de continuación. |
| [Issue #195](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/195) | Abierta. Conserva un snapshot anterior de 76 hallazgos, incluidos 27 high, para SHA `72af9a1b4596d2e2421022630c65cee198a2cb13`. Es contexto histórico; no es el resultado de #198. |
| Manifiestos y `pnpm-lock.yaml` de la ref anterior | Confirman versiones instaladas, padres y coexistencia de versiones parcheadas y vulnerables. Una copia segura del paquete en otra rama no elimina la copia vulnerable. |
| Metadatos públicos de npm y releases oficiales | Se consultaron versiones, engines y contratos de los cambios major propuestos. No se instalaron paquetes ni se regeneró el lockfile. |

Los **18 high son el contador reportado por pnpm, no 18 CVEs ni 18 advisories únicos**. La salida formateada presenta 17 bloques high y agrupa rutas/versiones; body-parser aparece en ramas 1.x y 2.x, mientras el lock contiene dos versiones vulnerables de 1.x. Para una contabilización futura por instancia y advisory debe conservarse el resultado de `pnpm audit --json` en el worktree exacto. Este diagnóstico no inventa una equivalencia entre el contador agregado y CVEs únicos.

Procedencia reproducible: `gh run view 41637407917 --job 125921973633 --log-failed`. El análisis extrajo únicamente títulos, paquetes, rangos, rutas, advisory URLs y resumen. No se copiaron tokens, credenciales, archivos de entorno ni logs de autenticación al reporte. No se ejecutó un audit local contra el checkout antiguo ni pruebas de explotación contra servicios públicos.

## Matriz de hallazgos y corrección mínima propuesta

Los mínimos de parche provienen de los bloques del audit del job. Las versiones adicionales ya presentes se indican como opciones de consolidación, no como cambios aplicados. Los overrides de selectores concretos son candidatos que requieren validación; no constituyen una recomendación para forzar indiscriminadamente todas las versiones de un paquete.

| Paquete: versión vulnerable en lock | Padre/ruta observada | Parche mínimo del audit | Remediación propuesta y riesgo |
| --- | --- | --- | --- |
| `body-parser`: 1.20.4, 1.20.8, 2.3.0 | `@nestjs/platform-express@10.4.22` directo; Express 4.22.1/4.22.3; MCP SDK → Express 5.3.0 | 1.x: **1.20.9**; 2.x: **2.4.0** | Mantener las dos líneas major y actualizar cada rama con selector acotado si los padres siguen fijando versiones antiguas. No forzar body-parser 2 sobre Nest/Express 4. Riesgo: parsing, errores y límites de cuerpos comprimidos. |
| `nodemailer`: 8.0.11 | Dependencia directa API `^8.0.4` | **10.0.6**, cubre los tres high listados | Major necesario según los rangos del audit. Revisar API/tipos, TLS y SMTP pool en tarjeta independiente. No basta actualizar a 9.0.1 o 9.1.0: queda afectado el advisory con rango `<=10.0.5`. |
| `zod`: 3.25.76 | Admin, Driver, API y paquetes compartidos; peer de MCP SDK | **4.6.6** | Migración major explícita y pruebas de validación; no hay parche 3.x indicado por el audit. Actualizar o retirar declaraciones innecesarias en los manifiestos reales del workspace. No usar un override que oculte una migración sin comprobar consumidores. |
| `lodash`: 4.17.21 | `@nestjs/config@3.3.0`; `@nestjs/swagger@7.4.2` | **4.18.0** | Consolidar únicamente la rama vulnerable de 4.x; el lock ya contiene 4.18.1 por otros padres. No exige migrar NestJS de major. No se demostró una ruta de entrada atacante a `_.template`. |
| `js-yaml`: 4.1.0 | `@nestjs/swagger@7.4.2` fija 4.1.0 | **4.3.2**, cubre tres high listados | Actualizar la rama 4.x fijada por Swagger; el lock ya contiene 4.3.2. No sustituir globalmente 3.x por 4.x. Riesgo: generación/exportación de documentación y parsing; entrada YAML no confiable en esta aplicación no demostrada. |
| `glob`: 10.4.5 | `@nestjs/cli@10.4.9` fija 10.4.5 | **10.5.0** | Selector acotado 10.4.5 → 10.5.0 si no hay release compatible del padre que lo resuelva. El lock ya contiene 10.5.0. Es toolchain de API; inyección por CLI `-c` no reproducida en el proyecto. |
| `picomatch`: 4.0.1 | Nest CLI → `@angular-devkit/core@17.3.11` | **4.0.4** | Actualizar esa rama 4.x; el lock ya contiene 4.0.7. No actualizar a otro major toda la familia de globbing. Riesgo: selección de archivos en build/generadores. |
| `tmp`: 0.0.33 | Nest CLI → schematics/inquirer → `external-editor@3.1.0` | **0.2.6** | Evaluar padre compatible o sustitución focal del hijo y probar creación/limpieza de temporales. Cambio de minor en 0.x puede romper contratos; tratarlo como riesgo de compatibilidad. No se demostró prefijo/postfijo controlado por atacante. |
| `semver`: 5.5.0 | `@tad/permissions` → `typescript-eslint-parser@22.0.0` → `typescript-estree@18.0.0` | **5.7.2** | Preferir retirar el parser obsoleto y declarar los scoped modernos que `eslint.config.cjs` ya requiere: `@typescript-eslint/parser` y plugin. Alternativa focal: mantener semver 5 y parchearlo. No imponer semver 7 globalmente. |
| `postcss`: 8.4.31 | `next@15.5.28` fija 8.4.31; el directo del portal ya resuelve otra versión | **8.5.18**, cubre dos high listados | Actualizar la rama 8.x fijada por Next; el lock ya contiene 8.5.31. Subir el directo del portal no basta. Riesgo: compilación CSS, source maps y resultado visual. No se demostró procesamiento de CSS atacante en producción. |
| `serialize-javascript`: 6.0.2 | Driver → `@ducanh2912/next-pwa` → workbox-build → `@rollup/plugin-terser@0.4.4` | **7.0.3** | Major del hijo necesario según audit: plugin-terser declara `^6.0.1`. Evaluar padre actualizado o override focal, comprobando generación del service worker y navegación offline. No modificar estrategia/cache offline solo para quitar el hallazgo. |

## Advisories que sostienen los mínimos

| Familia | Evidencia primaria del audit |
| --- | --- |
| body-parser: DoS con bytes tras cuerpo comprimido | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), una entrada por rango 1.x y 2.x. |
| Nodemailer: raw/SSRF y complejidad de addressparser | [GHSA-p6gq-j5cr-w38f](https://github.com/advisories/GHSA-p6gq-j5cr-w38f): >=9.0.1; [GHSA-2x7j-588g-ccc2](https://github.com/advisories/GHSA-2x7j-588g-ccc2): >=9.1.0; [GHSA-v53p-9fqp-m79j](https://github.com/advisories/GHSA-v53p-9fqp-m79j): >=10.0.6. |
| Zod: agotamiento de memoria | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): >=4.6.6. |
| Lodash: inyección de código en template | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc): >=4.18.0. |
| js-yaml: complejidad de merge/omap | [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m): >=4.3.0; [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj): >=4.3.1; [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh): >=4.3.2. |
| Glob CLI | [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2): >=10.5.0. |
| Picomatch | [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj): >=4.0.4. |
| tmp | [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65): >=0.2.6. |
| semver | [GHSA-c2qf-rxjj-qqgw](https://github.com/advisories/GHSA-c2qf-rxjj-qqgw): >=5.7.2. |
| PostCSS: lectura de archivos/source maps | [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q): >=8.5.12; [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849): >=8.5.18. |
| serialize-javascript | [GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq): >=7.0.3. |

## Tarjetas futuras y criterios de aceptación

Todas las tarjetas siguientes están **PROPUESTAS / NO IMPLEMENTADAS / NO VERIFICADAS**. No se incorporan al cambio de CI/E2E y QA de landings.

| Tarjeta | Alcance acotado | Contraejemplos y evidencia necesaria antes de aceptación |
| --- | --- | --- |
| SEC-A: parsers y dependencias Nest compatibles | body-parser 1 y 2 por separado; lodash 4; js-yaml 4; conservar major Nest/Express | Eliminar todas las instancias afectadas, no solo el directo. Frozen install y audit JSON del nuevo SHA; API unit/integration; cuerpos JSON válidos, inválidos, vacíos, comprimidos con bytes residuales y límites de tamaño; documentación Swagger. No probar contra producción. |
| SEC-B: toolchain API y permisos | glob 10, picomatch 4, tmp y parser ESLint obsoleto | Build real de Nest, lint/typecheck de permissions y comportamiento de temporales; ningún override global entre majors. Un lint sin ejecutar el parser del archivo real no satisface aceptación. |
| SEC-C: compilación CSS y PWA | PostCSS 8 fijado por Next; serializador del worker de Workbox | Builds de portales y Docker; service worker generado y minificado sin error; E2E Driver carga online → offline → recarga → reconexión, sin borrar cachés para simular éxito; comparación visual de landings. Un build verde solo no demuestra integridad offline. |
| SEC-D: correo API | Nodemailer >=10.0.6, tipos e integración SMTP | Pruebas locales con stream transport o servidor SMTP de prueba: destinatario y asunto, PDF como Buffer, mensajes malformados, fallos de transporte, pool y retry. No enviar mensajes reales. Un audit verde no demuestra entrega ni ausencia de regresiones. |
| SEC-E: validación Zod | Migración declarada a >=4.6.6 en workspace y consumidores | Cambiar `.error.errors` a `.error.issues` en wallet (2), PortalAuth (3) y UpdatePassword (1). Verificar formularios auth, recuperación/contraseñas, wallet y payment intent, valores omitidos/defaults, UUIDs y mensajes inválidos, además de tipos y MCP. No relajar reglas de auth para resolver incompatibilidad. |
| SEC-F: cierre de #195 | Integración de tarjetas anteriores, reporte del SHA final | `pnpm install --frozen-lockfile`, `pnpm audit --json` y `pnpm audit --audit-level=high`; API tests, estrés/replay/idempotencia de telemetría, integridad offline Driver, tipos y Docker según #195. Conservar resultados/limitaciones; no bajar threshold ni introducir allowlist para convertir FAIL en PASS. |

## Riesgos de migración ya identificados

La [guía oficial de Zod 4](https://zod.dev/v4/changelog) confirma que `.errors` fue retirado en favor de `.issues`; `.uuid()` ahora exige bits de variante RFC y los defaults tienen diferencias semánticas. Las seis referencias de error citadas se observaron en el código, no se corrigieron. Los schemas inspeccionados de auth, wallet y pagos usan principalmente escalares; eso limita la evidencia sobre exposición al advisory de colecciones y **no demuestra ausencia general de riesgo**. El peer del MCP SDK 1.32.1 acepta `^3.25 || ^4.0`; verificar además su conversión JSON Schema y resolución de subpaths tras cualquier migración.

Nodemailer 10.0.6 y serialize-javascript 7.0.3 declaran Node >=20. Los Dockerfiles API/Admin/Driver usan Node 22; los variants inspeccionados de agents y simulator usan Node 20. La [release Nodemailer 10](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.0) incluye tipos y builds ESM/CommonJS; [Nodemailer 9](https://github.com/nodemailer/nodemailer/releases/tag/v9.0.0) cambió la validación TLS de recursos remotos. `EmailService` usa SMTP y adjuntos Buffer; no se observó que expusiera raw/href mediante su contrato tipado. Esto no sustituye una prueba de todas las rutas ni demuestra explotabilidad. La [release serialize-javascript 7](https://github.com/yahoo/serialize-javascript/releases/tag/v7.0.0) documenta el requisito Node 20; su compatibilidad con el consumidor Workbox debe probarse.

## Estado de verificación y cierre del diagnóstico

**Ejecutado:** lectura del job fallido y issue; inspección de manifiestos/lock/código de la ref exacta; consultas read-only a metadatos y fuentes oficiales. **No ejecutado por este diagnóstico:** instalación, regeneración de lock, auditoría local nueva, tests funcionales, build, Docker, E2E, pruebas ofensivas, migraciones, despliegue o aceptación de riesgo. Las validaciones de la matriz son requisitos futuros, no resultados obtenidos.

El gate conserva **FAIL** para el snapshot de #198. La certificación de seguridad de cualquier SHA posterior permanece **INCOMPLETE** hasta disponer de evidencia fresca de ese SHA. No se afirma un incidente ni explotación comprobada en producción. La continuación autorizada de CI/E2E y landings puede documentar su propio resultado sin presentar este backlog como resuelto.
