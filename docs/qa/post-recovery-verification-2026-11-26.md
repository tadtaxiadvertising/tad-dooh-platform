# Verificación posterior a recuperación — 26 de noviembre de 2026

Base: `cd0e8a04657d816a27cfa34b71796c7b82e2ce84` (`origin/main`, PR #557).
Rama: `codex/post-recovery-verification-20261126`.
Entorno local: Windows, Node 22.20.0, Python 3.12.12. Checkout del usuario preservado; cambios aislados en otro worktree.

## Estado y alcance

Verificación local aprobada de dos correcciones P2 en herramientas de QA. No cambia el servidor, esquema, pagos ni colas offline. La [incidencia #217](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217) registra recuperación productiva a las 14:17:59 UTC (10:17:59 de La Paz). Esta intervención comprobó después la disponibilidad mediante HTTPS; no repitió A–J.

## Hallazgos y correcciones

| Hallazgo confirmado | Causa | Cambio y evidencia |
| --- | --- | --- |
| El gate rápido devolvía código 0 aunque mostrara FAIL; podía omitir ESLint API y validar otro checkout | Faltaba propagar el resultado al proceso; raíz absoluta, ejecución al importar y herramienta ausente tratada como N/A | `scripts/run_fast_gates.py` deriva la raíz de su ubicación, usa argumentos sin shell y configuración flat de cada workspace con formatter incluido, registra las tres comprobaciones y sale con 1 ante fallo, timeout o herramienta ausente. Cinco pruebas fallaban contra el original; cinco pasan con la corrección, incluyendo cuatro escenarios CLI con herramientas simuladas |
| La sonda podía pasar aunque `/health/ready` devolviera 503 o un cuerpo degradado | Consultaba solo `/health` y `/health/full` | Comprueba también `/health/ready` y exige `status=up`. Tres regresiones nuevas fallaban antes del arreglo. Una prueba CLI adicional usa un servidor local para 503, degradación con 200, sanitización y éxito. Conserva los tres flags exportados |

Las regresiones del gate rápido se añaden al job Tests de CI. Las de readiness ya se ejecutan en ese job. El runbook de EasyPanel recoge las tres rutas y el nuevo código de error.

## Resultados ejecutados

| Comando o comprobación | Resultado |
| --- | --- |
| `node --test scripts/api-health-route-contract.test.cjs scripts/check-api-readiness.test.cjs` | 13/13 PASS, incluyendo CLI real contra servidor loopback |
| `python -B -m unittest discover -s scripts -p test_run_fast_gates.py -v` | 5/5 PASS; herramientas simuladas, cuatro escenarios CLI |
| `node scripts/check-api-readiness.cjs https://tad.api.ibusiness.com.do` | PASS con las tres rutas reales |
| Sonda independiente HTTPS, 2026-11-26 14:38:10 UTC / 10:38:10 La Paz | 9/9 PASS con validación TLS estricta |
| `git diff --check` | PASS |

La sonda independiente confirmó `/health`, `/health/ready` y `/health/full` con 200 y `status=up`; el último confirmó DB conectada y vista master-sync disponible. `GET /api/v1/drivers`, `/api/v1/system-settings` y `/api/v1/bi/kpis` devolvieron 401 tanto sin credenciales como con un token sintético inválido. No se guardaron cuerpos de rutas protegidas ni credenciales.

Se revisó el CI de la base exacta por separado: [Quality Gates](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/45751749603), [Docker](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/45751749611) y [Landing](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/45751749625) terminaron SUCCESS. Esos resultados pertenecen a la base; el PR de esta rama debe acreditar su propio SHA.

## Límites y siguiente trabajo

Los tests del runner verifican su comportamiento con fixtures; no certifican que todo el proyecto pase TypeScript/ESLint. No se instalaron dependencias ni regeneró el cliente Prisma compartido. Los contratos de promoción ampliados presentan falsos fallos locales por CRLF; no se usan como prueba de fallo productivo y quedan fuera de este cambio.

Las sondas públicas no acreditan login de proveedor, autorización entre tenants/roles autenticados, pagos, recuperación offline del player ni carga sostenida. Siguen pendientes los controles de #217: copia externa reciente y custodia independiente, recuperación completa de configuración y digest desplegado, y cierre con evidencia de #244/#313. No se declara la plataforma lista para una nueva promoción ni se cierra el incidente.

## Riesgo y reversión

La sonda realiza un GET adicional con su timeout existente de 8 s. Un servidor antiguo sin `/health/ready` ahora se rechaza, coherente con el contrato vigente. Revertir únicamente el commit de esta rama restaura las herramientas anteriores; no requiere rollback de datos ni despliegue. La reversión reintroduce los falsos positivos documentados.
