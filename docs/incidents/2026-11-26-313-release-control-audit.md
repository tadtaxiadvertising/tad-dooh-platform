# #313 — auditoría de controles de publicación, 26 de noviembre de 2026

Base inicial: `cd0e8a04657d816a27cfa34b71796c7b82e2ce84`. La rama se actualizó con `a367fe4682fe21156de512f16bb7c681056a503b`, fusión de #558 observada durante la auditoría. Rama: `codex/release-control-audit-20261126`.
Alcance: verificar protecciones existentes mediante lecturas y mejorar el diagnóstico local. No modifica GitHub, Railway, EasyPanel, credenciales ni datos de aplicación.

## GOAL / PLAN / LOOP / STOP

Objetivo: distinguir protección parcial de una configuración que cumple el contrato de revisión independiente definido en `scripts/protect-main-branch.cjs`. Leer metadatos actuales, reproducir la ausencia del modo de auditoría, añadir `--verify`, verificar casos positivos/negativos y registrar los pendientes operativos. Un ciclo rojo-verde, seguido de prueba CLI y revisión del diff. Detener la ejecución antes de cualquier escritura de configuración o promoción.

## Hechos medidos y límites

La auditoría del 26-nov, aproximadamente 15:22 UTC / 11:22 La Paz, sustituye como estado actual la observación de noviembre 21 del [checkpoint anterior](2026-11-21-p0-313-main-protection-admin-checkpoint.md), que se conserva como historia.

| Control | Evidencia actual | Resultado |
| --- | --- | --- |
| Protección de `main` | API pública: `protected=true`; Summary de GitHub Actions app 15368, enforcement `everyone` | PASS para estos campos |
| Check estricto y administradores | GitHub CLI autenticado: `strict=true`, `enforce_admins.enabled=true` | PASS |
| Force push, borrado y conversaciones | Force push y borrado deshabilitados; resolución de conversaciones obligatoria | PASS |
| Revisión de PR | API de protección completa devuelve `required_pull_request_reviews=null` | FAIL: faltan revisión independiente, descarte de aprobación obsoleta y aprobación del último push |
| Rulesets | API devuelve `[]` | No hay reglas adicionales observadas |
| Acceso del conector GitHub a la protección completa | HTTP 403, `Resource not accessible by integration` | Acceso limitado del conector; se contrastó por la CLI ya autenticada sin mostrar tokens |
| Railway | Fuente `main`, commit configurado `f3e105362eb598cde5739ed38c6028593ff2fee2`; último intento `724a31a3-40c2-4ad2-8aac-b60bc7bcd50f` FAILED del 19-nov; nombres de variables directamente configuradas: ninguno; `healthcheckPath=/health` | No acredita un runtime listo para promoción |
| Gate de Railway por check suites | La respuesta actual no expone `source.checkSuites` | UNKNOWN; no reutilizar la observación histórica como valor actual |
| Imagen activa de EasyPanel | Inventario de navegador devuelve `Local browser use is disabled in Work settings` | NOT RUN; digest/SHA activo sin acreditar |

El [contrato oficial de GitHub](https://docs.github.com/en/rest/branches/branch-protection) define la revisión de PR por separado de los status checks; `null` desactiva el requisito de revisión. Un Summary verde no demuestra revisión independiente ni prueba que las reglas bloqueen un intento real de merge.

Railway no está acreditado como origen del dominio público de la API. La ausencia de nombres de variables del servicio tampoco demuestra ausencia de todas las variables compartidas o de plataforma. No se consultaron valores de variables ni logs de build que pudieran contener credenciales.

## Cambio mínimo

El script anterior solo permitía planificar o instalar protección en una rama sin protección. Al encontrar `main` protegido se negaba a continuar, sin auditar sus reglas. El modo nuevo:

```powershell
node scripts/protect-main-branch.cjs --verify
```

solo ejecuta GET. Verifica identidad de `main`, configuración completa según el contrato existente y Summary completado/success del mismo SHA; relee la rama antes de informar éxito. Devuelve código 1 ante protección ausente/incompleta, lectura prohibida, Summary no verde o cambio de SHA. Los errores muestran identificadores fijos de controles, no la salida cruda del proveedor.

Se conserva el comportamiento de `--plan`/`--apply`: el instalador sigue rechazando ramas protegidas y rulesets existentes. `--verify` no repara controles ni adquiere permisos de escritura aunque exista la variable de aprobación del instalador.

## Verificación y evidencia

Entorno local: Windows, Node 22.20.0. Ejecución real; no se instalaron dependencias.

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `node --test scripts/protect-main-branch.test.cjs`, antes de implementar | 1 | Cuatro casos nuevos fallan por `UNKNOWN_MODE`; nueve existentes pasan |
| Mismo comando después de implementar y completar fixtures CLI | 0 | 14/14 PASS, incluidos tres escenarios CLI aislados |
| `node --test scripts/protect-main-branch.test.cjs scripts/check-api-readiness.test.cjs scripts/api-health-route-contract.test.cjs`, después de incorporar #558 | 0 | 27/27 PASS |
| `node scripts/protect-main-branch.cjs --verify`, contra configuración real | 1 | FAIL esperado: `REQUIRED_PR_REVIEWS`, `STALE_REVIEW_DISMISSAL`, `LAST_PUSH_APPROVAL` |
| `git diff --check` y `node --check` | 0 | PASS |
| CI del nuevo candidato | — | Pendiente hasta publicar/verificar el SHA exacto del PR |

La primera versión del fixture CLI importaba el módulo sin ejecutar su entrypoint; ese fixture falló por falta de salida y se corrigió con un preload de proveedor sintético y ejecución del archivo como CLI. No fue un fallo del modo implementado ni se relajaron sus asserts.

La suite ya se ejecuta en el job Tests de `.github/workflows/ci.yml`. Cubre éxito con configuración completa, ausencia de reviews aun con aprobación de instalación presente, controles parciales, acceso denegado, rama cambiante y fallos del Summary. Las pruebas de instalación existentes siguen aprobadas.

## Riesgo, acción del administrador y reversión

El cambio de código es P2, diagnóstico. El hallazgo operativo sigue dentro del incidente P0 #313: aún falta el control de revisión independiente solicitado en su política. No prueba por sí solo una explotación ni una promoción indebida actual.

Un administrador debe revisar y activar la regla de al menos una aprobación independiente, descarte de aprobaciones obsoletas y aprobación del último push, conservando strict Summary, administrador sujeto a reglas, conversaciones y prohibiciones existentes. No usar `--apply` para sobrescribir la protección actual. Después ejecutar `--verify` y probar en un entorno que no despliegue producción que la falta de aprobación y Summary rojo impiden fusionar.

Siguen separados: identidad/configuración de la imagen activa de EasyPanel, promoción Railway, contención/rotación #244 y pruebas de Auth/player offline/finanzas. No hay autorización de cambios productivos en este reporte. Revertir el commit de esta tarjeta retira solo el modo de diagnóstico y sus pruebas; ninguna configuración externa necesita rollback.

Estado: **VERIFICADO para la herramienta local; configuración completa pendiente**. #313 permanece abierto.
