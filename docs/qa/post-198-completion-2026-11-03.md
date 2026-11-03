# Continuación después de #198 — 2026-11-03

## Alcance y estado

Base: `10774bb43c8190bdb3ebb0bd98d640ec144ea6cc`, merge de [#198](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/198). Rama de trabajo: `codex/post-198-completion-20261103`. Fecha local: 3 de noviembre de 2026, America/La_Paz.

El pedido es revisar el estado del proyecto y continuar la tarea pendiente. El documento de Downloads sobre CRO/Motion se leyó como contexto; sus prompts de ejemplo no iniciaron cambios adicionales. La continuación conserva el Creative Reframe V4 integrado en #189 y repara su verificación después de #198. El checkout principal histórico `1d668d95`, sus skills modificadas y sus archivos sin commit se preservaron. Se trabaja en un worktree separado desde la base actual.

Estado de esta intervención: **IMPLEMENTADO, PENDIENTE DE VERIFICACIÓN**. No es una certificación global ni una autorización de merge/despliegue.

## Evidencia de la base

Las siguientes observaciones corresponden al SHA base, no a los cambios nuevos:

| Comprobación | Resultado observado | Fuente |
| --- | --- | --- |
| CI Quality Gates | FAIL | [run 41637407917](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41637407917) |
| API | PASS, 29 suites / 132 pruebas | Job Tests del mismo run |
| Contratos de presentación | PASS, 47 pruebas | Job Tests del mismo run |
| Contratos seguridad/Next | PASS, 8 pruebas | Job Tests del mismo run |
| Nuevo guard E2E | FAIL, `SyntaxError: Invalid regular expression flags` | `scripts/ci-e2e-isolation.test.cjs:18`, reproducción con `node --check` |
| TypeScript global / Prisma | PASS | CI Quality Gates |
| Prettier | PASS | Job Format & Lint |
| ESLint | FAIL, 231 warnings / 0 errors en Admin; se detiene antes de los demás workspaces | Job Format & Lint, `--max-warnings 0` |
| Auditoría dependencias | FAIL, 65 hallazgos: 18 high, 39 moderate, 8 low, 0 critical | Job Security Audit; son contadores de pnpm, no CVE únicos |
| Landing Focused Gates | PASS: lógica/tipos y browser smoke de ambos builds | [run 41637407872](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41637407872) |
| Docker independiente | PASS: api, admin, driver, player | [run 41637407941](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41637407941) |

No se deduce salud de producción de estas compilaciones y pruebas aisladas. Los checkpoints antiguos sobre #176/#177 no describen el código actual; en particular SSR del H1 y snapshots de analítica ya están corregidos en main.

## Tarjetas y criterios

1. **Guard E2E:** reparar escapes y saltos LF/CRLF. Probar clasificación de comandos peligrosos/seguros, comentarios y tabs, sin ejecutar esos comandos. Conservar contratos/API y browser fixture; no activar los E2E de producción.
2. **Copy público:** describir las 15 campañas como simultáneas; producción creativa como parte del ejemplo; advertencia comercial comprensible. No cambiar tarifas, helpers, handlers, atribución, consentimiento ni signup.
3. **QA adaptable:** añadir estrés CSS zoom 200% en 390×844, 844×390 y 1440×900, con controles reales, foco, opacidad y ausencia de overflow. Mantener la matriz de ocho anchos, no-JS y movimiento reducido. CSS zoom no equivale a certificar zoom nativo del navegador.
4. **Cierre verificable:** ejecutar checks relevantes sobre el diff final, revisar capturas y registrar métricas si se miden. Entregar PR revisable con límites reales y checkpoint vigente.

## Cambios y causa raíz

- `scripts/ci-e2e-isolation.test.cjs`: el doble escape invalidaba el literal regex e impedía ejecutar el guard. La función usada por el guard real se prueba con 15 comandos peligrosos y 10 seguros, incluyendo rutas directas mediante Node/npx. Clasifica texto; no pretende interpretar todo Bash/YAML.
- Los tres componentes de landing: solo copy y nombre accesible de slots. El simulador Driver ya documentaba campañas simultáneas en su nota; se alinean subtítulo/FAQ/desglose. El checkbox de Advertiser sigue siendo opcional y reversible, inicialmente OFF.
- `scripts/landing-creative-reframe.test.cjs`: conserva el contrato de simulación y exige copy público sin detalles internos.
- Los dos smokes y su helper: estrés de reflow adicional, captura externa opcional y restauración de zoom/viewport en `finally`. No se relajan interceptores de red, errores, SW ni timeouts.

## Verificación de la intervención

Entorno local: Windows, Node 22.20.0. Dependencias bloqueadas mediante pnpm 10.34.0; el pnpm 11 predeterminado rechazó la instalación congelada porque ignora `pnpm.overrides`, por lo que se usó la misma línea mayor que la CI general. No se cambió el lock para acomodar el entorno.

| Gate | Estado | Evidencia / límite |
| --- | --- | --- |
| Guard — RED/GREEN | PASS | El guard previo falla al parsear. Tras reparar el harness, fixtures revelaron comandos no detectados; corrección final `node --check` exit0 y `node --test scripts/ci-e2e-isolation.test.cjs` 5/5, exit0 |
| Creative Reframe | PASS | `node --test scripts/landing-creative-reframe.test.cjs`, 7/7, exit0 |
| Sintaxis de smokes/helper y diff whitespace | PASS | `node --check` y `git diff --check`, exit0 |
| Suites de producto y cookies finales | NOT RUN | Pendiente completar instalación congelada |
| Tipos estrictos de ambas landings | NOT RUN | Pendiente instalación |
| Lint del alcance / formato | NOT RUN | Pendiente instalación |
| Ambos builds con fixtures | NOT RUN | Sin credenciales reales, signup OFF, destinos de API loopback |
| Browser final, capturas y reflow | NOT RUN | Pendiente builds locales |
| Lighthouse | NOT RUN | Sin métricas inventadas; no sustituye datos de campo |
| CI del candidato | NOT RUN | Se comprobará el SHA exacto después de publicar el PR |

## Bloqueos independientes y siguiente acción

- **Seguridad de dependencias:** [triage por paquete](../security/post-198-dependency-triage-2026-11-03.md). Las cifras históricas de 27/29 high quedaron superadas. La remediación incluye compatibilidad de Zod/Nodemailer y build PWA; no se mezclan cambios major de API/Auth con el fix de CI/presentación.
- **Lint global:** 231 warnings observados en Admin no constituyen un inventario global; hace falta auditar los workspaces posteriores y corregir tipos/usos sin suprimir reglas ni elevar umbrales.
- **Referidos Driver:** los CTA actuales no conservan `ref` hasta el formulario. Requiere definir y verificar el contrato de registro/atribución; no se cambia dentro de copy.
- **Contratos comerciales:** se mantienen ejemplos ilustrativos y subtotal sin impuestos. No se concilian por intuición las fuentes de 1500/2500/500 ni se alteran cobros.
- **QA fuera del alcance aislado:** autenticación real, envío de registro, sesiones/RBAC, staging/estado de migraciones, pagos, SW instalado, dispositivo físico, WCAG completa e INP/p75 de campo no están acreditados por estos smokes.

Primera acción tras cerrar este PR: corregir la deuda lint en una tarjeta propia y remediar dependencias con pruebas de compatibilidad. Mantener los E2E autenticados/mutantes fuera del push/PR estándar hasta disponer de entorno sintético dedicado. No ejecutar migraciones ni escrituras productivas siguiendo documentación histórica.

## Reversión

Revertir únicamente los commits de esta intervención tras revisar el diff y dependencias. No hay cambios de DB ni estado financiero que revertir. No restaurar el checkout histórico completo. Mantener #198 y su aislamiento de E2E.
