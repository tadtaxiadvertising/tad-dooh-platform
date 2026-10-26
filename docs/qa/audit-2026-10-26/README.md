# TAD DOOH Platform — Auditoría documental y loop de corrección

- **Fecha:** 2026-10-26
- **Base auditada:** `main` (manifiestos y documentos leídos mediante GitHub)
- **Rama de trabajo:** `audit/doc-error-loop-2026-10-26`
- **Tipo:** auditoría estática documental; no equivale a ejecución local/CI ni a verificación de producción.
- **Estado:** PARCIAL — discrepancias documentadas; correcciones de código pendientes de pruebas ejecutables.

## Resumen ejecutivo

La evidencia estática confirma inconsistencias de configuración y un comando de despliegue Prisma que acepta pérdida de datos. No se ejecutaron `tsc`, builds, tests, validación Prisma contra base de datos ni pruebas de dispositivos; por tanto, no se declara el monorepo compilable ni R1–R9 verificados.

## Hallazgos

### TAD-LOOP-001 — Comandos Prisma permiten pérdida de datos

- **Evidencia:** `apps/api/package.json` define `start:migrate` como `prisma db push --accept-data-loss --skip-generate && node dist/main.js` y `deploy:migrate` como `prisma db push --accept-data-loss --skip-generate`.
- **Impacto:** un despliegue puede aceptar cambios de esquema destructivos y causar pérdida de datos.
- **Causa:** scripts operativos que usan `db push` con la opción de aceptar pérdida de datos.
- **Severidad:** P1 (potencial P0 si se ejecuta y produce pérdida real).
- **Recomendación:** retirar el uso rutinario de `--accept-data-loss`; usar migraciones versionadas con `prisma migrate deploy` solo después de comprobar que el historial de migraciones representa fielmente el esquema desplegado y de validar backup/rollback. No ejecutar migraciones en producción desde esta auditoría.
- **Estado:** confirmado por inspección estática; ejecución/impacto real no medido.

### TAD-LOOP-002 — Estrategia de gestor de paquetes inconsistente

- **Evidencia:** el manifiesto raíz define npm workspaces y existe `package-lock.json`; `pnpm-lock.yaml` también existe y `Dockerfile.api` instala pnpm y ejecuta `pnpm install --filter api...`.
- **Impacto:** las instalaciones locales/CI y los builds Docker pueden resolver árboles de dependencias diferentes o divergir.
- **Severidad:** P1.
- **Recomendación:** elegir un único gestor canónico, alinear lockfile, CI, documentación y Dockerfiles en un cambio controlado; verificar reproducibilidad antes de borrar cualquier lockfile.
- **Estado:** discrepancia confirmada; no se ha probado que cause el fallo de build actual.

### TAD-LOOP-003 — Documentación de orquestación no coincide con los scripts raíz

- **Evidencia:** el README y `package.json` describen npm workspaces; el script raíz `build` usa `npm run build --workspaces --if-present`. La documentación menciona Turborepo, pero su adopción también figura como trabajo futuro en `docs/qa/audit-2026-10-14/07-remediation-backlog.md`.
- **Impacto:** comandos esperados, caché y orden de builds pueden interpretarse incorrectamente.
- **Severidad:** P2.
- **Recomendación:** documentar la configuración actualmente ejecutable y mantener Turborepo como propuesta hasta que exista configuración y CI verificadas.

### TAD-LOOP-004 — La auditoría previa no demuestra el estado actual

- **Evidencia:** `docs/qa/audit-2026-10-14/README.md` registró ESLint con fallos, pruebas API fallidas, TypeScript/build/Prisma bloqueados y pruebas E2E dependientes de entornos externos.
- **Impacto:** no es válido asumir que esos resultados siguen iguales ni que se resolvieron sin una re-ejecución contra el HEAD actual.
- **Severidad:** P1 por ausencia de evidencia fresca para gates críticos.
- **Recomendación:** repetir cada gate en el commit actual y registrar comando, entorno, SHA, exit code y artefacto/log redactado.

### TAD-LOOP-005 — CI y Docker usan Node/pnpm mientras la documentación raíz describe npm/Node 20

- **Evidencia:** `Dockerfile.api` usa `node:22-alpine` y pnpm; README documenta Node 20.x y `npm install`; la auditoría anterior también describe un objetivo Node 22.
- **Impacto:** diferencias de runtime/instalación entre desarrollo y producción, y mayor dificultad para reproducir fallos.
- **Severidad:** P2.
- **Recomendación:** inspeccionar todos los Dockerfiles y workflows; establecer una matriz de versiones coherente antes de actualizar documentación o runtime.

## Verificación de reglas de negocio R1–R9

| Regla | Invariante a verificar | Estado de esta auditoría |
|---|---|---|
| R1 | Playback offline hasta 48 h y cola local durable | Pendiente de pruebas del Player/PWA y reconexión |
| R2 | Telemetría GPS agrupada con intervalo de 5 min | Documentado; no probado en runtime |
| R3 | Kill-switch de pago HTTP 402 | Documentado; no probado end-to-end |
| R4 | Máximo 15 campañas activas por dispositivo | Documentado; falta verificar backend y asignación |
| R5 | Realtime en canal `fleet_sync` | Referencias encontradas; falta probar listener, filtros y reconexión |
| R6 | Fórmula de compensación V12 | Documentada; falta prueba de cálculo y conciliación |
| R7 | MP4 H.264 con límite de 55 MB | Documentado; falta verificar validación real de upload |
| R8 | Idempotencia financiera y transacciones atómicas | Riesgo prioritario; falta probar concurrencia, retries y ledger |
| R9 | RBAC estricto y ownership por recurso | Falta auditoría de guards, políticas y pruebas IDOR |

**Ninguna regla se marca como verificada** sin pruebas ejecutables específicas.

## Plan de corrección priorizado

1. **P1 — Migraciones:** inspeccionar `apps/api/prisma/migrations`, entrypoint Docker, estado de migración y política de backup; proponer cambio mínimo de los scripts sin ejecutar comandos contra producción.
2. **P1 — Toolchain:** determinar gestor canónico a partir de CI, lockfiles y Dockerfiles; reproducir instalación limpia en entorno aislado.
3. **P1 — CI actual:** ejecutar lint, typecheck, pruebas API, Prisma validate/generate y builds por workspace en el HEAD auditado; separar bloqueos por falta de secretos/infraestructura.
4. **P1 — Reglas financieras y seguridad:** agregar pruebas de regresión para idempotencia, concurrencia, RBAC/IDOR y kill-switch.
5. **P1 — Offline-first:** validar 48 h de reproducción, persistencia de cola y sincronización idempotente después de reconexión.
6. **P2 — Documentación:** actualizar los documentos canónicos solo después de que los resultados ejecutables confirmen las versiones y comandos correctos.

## Evidencia y límites

- Revisados en GitHub: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/prisma/schema.prisma`, `Dockerfile.api`, `README.md`, `docs/qa/audit-2026-10-14/README.md` y `docs/qa/audit-2026-10-14/07-remediation-backlog.md`.
- No se imprimieron secretos ni se consultaron valores de variables sensibles.
- No se modificó el esquema de base de datos ni se ejecutó despliegue.
- La integración GitHub permite inspección/edición de archivos, pero no proporciona aquí un checkout local con Node, Docker y un entorno de pruebas aislado; por ello no se afirma que `npx tsc --noEmit` o los builds hayan pasado.

## Criterio de cierre

La auditoría solo puede pasar a **VERIFICADA** cuando los gates pertinentes se ejecuten contra un SHA identificado, los fallos tengan pruebas de regresión y R1–R9 se validen en sus límites reales. Cualquier migración de producción requiere revisión separada, backup comprobado y autorización de despliegue.
