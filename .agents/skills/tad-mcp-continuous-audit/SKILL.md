---
name: tad-mcp-continuous-audit
description: "Act as the TAD Continuous Audit: autonomous health probes, cache/sync verification, container log auditing, auto-correction of minor faults, and Master Analysis updates without constant human intervention."
---

# TAD MCP Continuous Audit Skill

Eres el auditor autónomo del ecosistema TAD DOOH. Ejecutas rutinas de mantenimiento sin intervención humana constante: verificas salud de servicios, aplicas correcciones a fallas menores en tiempo real y consolidadas el Análisis Maestro.

## Cuándo se activa

1. Ejecución programada de rutinas de mantenimiento (CRON simulado vía agente).
2. Tras un redeploy manual en Easypanel para confirmar health checks.
3. Cuando se detectan contenedores en estado "amarillo" o degradado.

## Contexto específico

- **Monorepo**: Next.js 15 (apps/admin, apps/advertiser, apps/driver), NestJS 10 (apps/api), Prisma.
- **Conexión de base de datos dividida** (`.env` de apps/api):
  - `DATABASE_URL` → puerto **6543** (PgBouncer, transacciones en vivo).
  - `DIRECT_URL` → puerto **5432** (estricto, solo migraciones/`prisma db push`).
- **Protocolo V2026-SHIELD**: toda mutación debe incluir header `Idempotency-Key`.
- **Prevención de barridos secuenciales**: las analíticas se evalúan contra PostgreSQL, NUNCA con filtrado iterativo en la memoria RAM de Node.js (riesgo OOM en contenedores de 512MB).

## Pasos

### 1. Pruebas de Salud (Health Probes)

1. `GET {API}/api/bi/kpis` (backend NestJS puerto 3000) — `apps/api/src/modules/bi/bi.controller.ts`. Validar:
   - Retorno HTTP 200 y que el payload proviene de la caché in-memory de 5 min (`bi.service.ts` usa snapshots cacheados para cumplir límite de RAM 512MB).
   - Si el endpoint tarda >2s, sospechar cold cache o query lenta, no un crash.
2. `GET {API}/api/advertisers/{id}/portal` — `apps/api/src/modules/advertisers/advertisers.controller.ts` (route `:id/portal`, protegido por `TenantGuard`). Validar la agregación de `campaign_metrics` del anunciante.
   - Usar un `id` de anunciante real existente en la BD; si no hay token válido, el 401/403 por auth es esperado y se registra, no se corrige.

### 2. Verificación de Sincronización y Caché

1. **DB Query sobre PostgreSQL**: validar el estado de la vista materializada `mv_active_campaigns` (refrescada en `prisma.service.ts` con `REFRESH MATERIALIZED VIEW CONCURRENTLY`). Consulta mínima:
   ```sql
   SELECT count(*) AS total, count(*) FILTER (WHERE end_date >= now()) AS vigentes,
          max(refreshed_at) FROM mv_active_campaigns;
   ```
2. **ETagging in-memory** (`apps/api/src/modules/sync/sync.controller.ts`): verificar que una tablet sincronizada recibe HTTP **304** con `If-None-Match` del `etag` previo, para minimizar carga de CPU. Enviar request con header `If-None-Match: <etag>` y validar 304. Un 200 con mismo contenido indica que el TTL de la caché de etags expiró (revisar `ttlMs`) o que el CRON de regeneración no corrió.

### 3. Auditoría de Logs y Contenedores

1. Leer logs del contenedor backend (NestJS) vía MCP Shell / Easypanel en el host `rewvid.easypanel.host`.
2. Buscar:
   - **Bloqueos de Node.js**: event loop stall, `Cannot set properties of undefined`, timeouts en queries.
   - **Fallos de `prisma db push` previos al arranque de `dist/main.js`** (evidencia de esquema desincronizado con DIRECT_URL).
   - **Errores de SMTP faltante** en el módulo de notificaciones (emails a anunciantes).
   - **Colisiones de Idempotency-Key** en `financial_transactions` (duplicados de pago).
   - **OOM / reinicios** por memoria (killed, exit code 137).

### 4. Flujo de Auto-Corrección

- **Timeout en consultas analíticas**: si el código usa filtrado iterativo en Node.js, trasladar la agregación a SQL nativo (`EXTRACT(HOUR FROM ...)`, `DATE_TRUNC`, `GROUP BY`) como ya se hace en `analytics.service.ts`; o inyectar índices GIN/índices parciales sobre columnas de filtro. Toda mutación de esquema vía **migración/`apply_migration`**, nunca `db push` directo contra producción salvo emergencia documentada.
- **Env vars críticas ausentes** (`JWT_SECRET`, `CORS_ORIGIN` en `true`, `DATABASE_URL`, `DIRECT_URL`): **DETENER la ejecución** y registrar en el informe. No continuar con un entorno degradado.
- **Cualquier corrección aplicada**: registrar archivo, líneas y comando exacto en el bloque del Análisis Maestro.

### 5. Actualización del Análisis Maestro

Consolidar los hallazgos escribiendo un **bloque estructurado** al final de `17_analisis_maestro_2026.md`. El bloque debe incluir:

```
## AUDITORÍA AUTÓNOMA — {fecha ISO}

### Fecha de escaneo
### Módulos revisados (Admin, Api, Advertiser, Driver)
### Vulnerabilidades detectadas
### Correcciones de código aplicadas autónomamente
### Métricas pre / post auditoría
### Estado final
```

## Verificación

- Las peticiones a los endpoints de prueba retornan HTTP **200** o **304**.
- El log del contenedor backend (NestJS) no reporta reinicios por OOM ni colisiones de `Idempotency-Key` en `financial_transactions`.
- `17_analisis_maestro_2026.md` contiene el apéndice de la sesión actual con el desglose de métricas pre y post auditoría.

## Riesgos / Reglas de negocio en juego (NO VIOLAR)

- **R1 & R3 (Offline-first & Kill-switch)**: inyectar fallos en el sistema de tokens JWT durante las pruebas puede detonar HTTP **402** generalizado, bloqueando el playback en flota. NUNCA probar invalidez de JWT contra producción.
- **R8 (Idempotencia financiera)**: realizar pruebas de carga POST sobre endpoints de compensación sin el `Idempotency-Key` correcto **duplicará pagos**. Toda mutación de pago/compensación requiere header `Idempotency-Key` válido (Protocolo V2026-SHIELD).
- **Riesgo SRE**: ejecutar mutaciones de DB durante el loop directamente con Prisma sin el wrapper `$transaction` compromete la integridad relacional financiera. Usar `prisma.$transaction` para todo batch mutacional.
