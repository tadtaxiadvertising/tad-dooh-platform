# Change control — TAD: arranque tras #209

## GOAL / PLAN / LOOP (1..5) / STOP

Corregir el diagnóstico de configuración ausente del entrypoint de API, conservando su rechazo del arranque sin JWT y la secuencia de migraciones. Se observó el proceso desplegado, se reprodujo el fallo con el script real, se aplicó el cambio mínimo y se verificó de forma aislada (LOOP 1). Restaurar configuración del proveedor y ejecutar CI remoto quedan bloqueados por causas externas; no se sustituyen credenciales ni se modifican proveedores.

## Línea base SHA, permisos y alcance

- PR [#209](https://github.com/tadtaxiadvertising/tad-dooh-platform/pull/209) fusionado el 2026-11-05 a las 09:02:42Z; merge `01d22cec2b1216156457dfed8e4f1f68d19ac58f`.
- El árbol del merge es idéntico al head revisado `c0d3472aaab4029d11d5dcd1d80735646dcb01fc`: `f77d18db3dfb12f92758a2e746a24573eaaac973`. La evidencia anterior de API, contratos, imágenes y landings sigue describiendo esa fuente; no se presenta como una nueva ejecución.
- Rama de esta corrección: `codex/post-209-startup-diagnostics-20261105`.
- Fuente verificada: `c18f83af7843840607ba80ef90491bdfc3748a28`; este informe es posterior y sólo añade documentación.
- Autorización: revisión y corrección autónoma solicitadas por el usuario. Cambios limitados a `apps/api/docker-entrypoint.sh`, su nuevo contrato en `scripts/api-entrypoint-env.test.cjs` y su ejecución en `.github/workflows/ci.yml`.
- Checkout original preservado. No se leyeron valores secretos, ni se ejecutaron migraciones, sesiones autenticadas, escrituras de datos o cambios de proveedor.

## Invariantes y matriz de riesgo

| Hallazgo                                          | Evidencia e impacto                                                                                                                                | Causa / corrección                                                                                                                           | Riesgo                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Railway no inicia la API                          | Cinco secuencias de arranque con errores fijos `parameter not set` para JWT_SECRET, DATABASE_URL y SUPABASE_URL, entre 09:05:16Z y 09:05:19Z       | Esas variables están ausentes en el proceso. El operador debe restaurar la configuración real del servicio; el parche no proporciona valores | P1 para ese servicio; no se atribuye una caída a los dominios canónicos |
| Diagnóstico de JWT ausente aborta antes del FATAL | `set -u` termina el script al expandir JWT_SECRET en el guard; las expansiones de los estados también fallan en subshells                          | Usar `${VAR:-}` en tres estados y en el guard JWT; mensaje independiente del proveedor                                                       | P2; corrección de diagnóstico                                           |
| CI no ejecuta código                              | Tres workflows de main fallidos; doce jobs fallidos sin pasos ni runner y uno omitido. Una anotación por workflow confirma bloqueo de pagos/límite | Resolver la cuenta de GitHub y ejecutar los controles. No cambiar tests ni umbrales                                                          | P2; verificación remota bloqueada                                       |

El JWT ausente o vacío sigue produciendo salida 1 antes de cualquier migración. El guard de DIRECT_URL, el comando Prisma y `exec node` permanecen sin cambios. Los logs muestran SET/MISSING, sin valores. NODE_ENV y PORT siguen provistos por Dockerfile.api; no se cambia ese contrato.

## Procedimiento mínimo y evidencia (PASS/FAIL/BLOCKED/NOT RUN)

**Observaciones posteriores a la fusión:**

- Railway: despliegue `3b2a5541-10c6-4df0-b6db-b783134ab8b7`, commit exacto del merge, metadato SUCCESS a las 09:05:20Z. Ese estado no acreditó el arranque: los registros filtrados confirmaron el aborto previo a Node.
- Puerto efectivo 8080, coincidente con targetPort 8080. No hay evidencia para cambiar puertos.
- Dominio generado Railway: GET sin bytes HTTP en 12 segundos con curl, después de completar DNS, TCP y TLS; sondeo independiente previo también agotó 15 segundos. Fallos conservados.
- A las 09:09:12Z, GET públicos: API canónica `/api/health` 200; Admin 307 a `/login`; Anunciante 200; Driver 200. No acreditan DB, login ni que esos dominios usen este despliegue Railway.
- CI main: [Quality Gates](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41999152829), [Docker](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41999153148), [Landing](https://github.com/tadtaxiadvertising/tad-dooh-platform/actions/runs/41999153232). Las anotaciones consultadas confirman que no comenzaron por pagos fallidos o límite de gasto. El aviso Ubuntu de Landing es informativo; no hay ejecución del código para atribuirle un fallo.

**Corrección y pruebas:**

- RED: `node --test scripts/api-entrypoint-env.test.cjs` → salida 1, cuatro casos: tres fallos del diagnóstico y uno aprobado.
- GREEN final: `node --test scripts/api-entrypoint-env.test.cjs scripts/ci-e2e-isolation.test.cjs` → salida 0, 9/9, sin omitidas.
- Los cuatro casos ejecutan el script real en un shell POSIX. Entorno construido desde cero, PATH vacío y directorio temporal vacío. Se reemplaza únicamente la frontera pnpm por una función que comprueba sus cinco argumentos y falla con código 17: no se ejecutan Prisma, DB ni la API.
- Los mismos cuatro casos pasan en Linux/BusyBox de la imagen API ya validada `tad-post208-api:d4997a33`, IID `sha256:a0d9fcb6cf458f258d0c688879c3450073b57bcc9b36d6b9152ddbf015c33da0`. Contenedor efímero sin red ni puertos; dos archivos actuales montados en sólo lectura y entrypoint reemplazado por el ejecutor Node de tests. No es una imagen reconstruida con el parche ni una prueba del arranque operativo.
- Formato: `corepack pnpm@10.34.0 dlx prettier@3.9.10 --check --end-of-line auto scripts/api-entrypoint-env.test.cjs .github/workflows/ci.yml` → PASS. Primer intento con exec no encontró instalación local de Prettier; se utilizó la versión fija ya usada por el proyecto.
- `git diff --check` → PASS. Revisión independiente del diff y de los fixtures → sin hallazgos bloqueantes.
- NOT RUN: nuevas compilaciones de las cuatro apps, batería API completa o E2E de portales; no cambian TypeScript, dependencias, UI ni sus artefactos. La comprobación nueva relevante es el proceso shell.
- Registros privados conservados: `post209-main-ci-verification.json`, `post209-public-http-probe.json`, `post209-railway-verification.json`, `post209-railway-health-diagnostic.json`, `post209-railway-entrypoint-unset-vars.json`, `post209-entrypoint-red.log`, `post209-entrypoint-final-green.log` y `post209-entrypoint-busybox-final-green.log`.

## Plan y prueba de reversión por capa

- Código: revertir únicamente el commit de fuente citado, revisando conflictos. Restaura el diagnóstico anterior, incluido su defecto; no revierte configuración del proveedor.
- DB, claves, anuncios, eventos y proveedores: sin cambios realizados; no hay reversión de datos pendiente.
- Fixtures: contenedor con eliminación automática y temporales eliminados por cada caso. La consulta posterior no encontró el contenedor de pruebas.
- No se inició ningún despliegue, ni se ejecutó el entrypoint operativo de la imagen.

## Aprobaciones pendientes y riesgos residuales

1. En Railway, un administrador debe configurar las credenciales reales ausentes del servicio production; no publicarlas en el PR o chat. Revisar también DIRECT_URL, que el script exige antes de migrar, y las demás variables del servicio. Su presencia efectiva no se ha certificado.
2. Aplicar la configuración por el procedimiento autorizado del proveedor, considerando que el entrypoint ejecuta migraciones antes de Node. Verificar después el FATAL o arranque y el endpoint público. Este parche por sí solo no restaura Railway.
3. Resolver pagos/límite de gasto de GitHub y ejecutar CI sobre la revisión que se vaya a fusionar.
4. Sin cambios de healthcheck del proveedor. El metadato SUCCESS observado fue insuficiente para certificar disponibilidad.
5. La auditoría de dependencias anterior conserva once moderadas y cinco bajas; este cambio no la vuelve a ejecutar ni altera esas dependencias.

## Estado: BLOQUEADO

Corrección del diagnóstico implementada y verificada localmente. Restauración de Railway y validación remota pendientes de configuración real del proveedor y disponibilidad de GitHub Actions.
