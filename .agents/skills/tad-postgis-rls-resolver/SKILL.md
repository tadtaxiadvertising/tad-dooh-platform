---
name: tad-postgis-rls-resolver
description: "Diagnóstico PostgreSQL/Supabase PostGIS, RLS y error 42501 de solo lectura para TAD. No modifica propietarios, grants, extensiones, triggers, tablas ni datos; requiere recuperación revisada para cualquier DDL."
---

# TAD — PostGIS/RLS: diagnóstico seguro de solo lectura

**Estado: procedimiento de investigación, NO de reparación automática.** Actualización 2026-11-21. Incidente P0 [#217](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/217); controles de credenciales [#244](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/244) y publicación [#313](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/313).

## Contexto comprobado y límites de confianza

El proyecto Supabase conectado `ltdcdhqixvbpdcitthqf` aparece activo, pero **no está demostrado que sea el destino canónico de EasyPanel**. Su catálogo consultado el 2026-11-21 tenía **PostGIS ausente** y **23 tablas esperadas por Prisma ausentes**. Otro proyecto, `tadprod`, estaba inactivo. La presencia de `public.spatial_ref_sys`, su propietario y los privilegios no se pueden asumir ni inferir de una plantilla o documento histórico. Un error `42501` puede deberse a ownership; no concede permiso para cambiar la extensión o RLS.

## Prohibiciones para agentes autónomos

- **No ejecutar SQL de escritura, DDL/DML, cambios de propietario, cambios de GRANT, cambios de RLS, instalación/eliminación de PostGIS ni migraciones en el proyecto investigado.**
- **No ejecutar scripts históricos retirados:** `apps/api/scripts/dba_remediation.cjs`, `apps/api/fix-rls.js` y `apps/api/fix-rls.ts`. Son stubs que rechazan la ejecución; sus implementaciones históricas están en Git.
- **No usar** `prisma db push`, `migrate resolve --applied`, reset, cambios masivos UUID/TEXT ni una operación destructiva para saltar el chequeo de arranque.
- No divulgar cadenas de conexión, variables secretas, tokens, cuerpos de logs, datos de pasajeros/conductores ni resultados de filas de negocio.
- No confundir RLS deshabilitado con exposición demostrada: verificar siempre también permisos de esquema y tabla.
- No proponer restauración sobre la base actual sin backup y ensayo de recuperación en una instancia **aislada**. El plan Free conectado no ofrece una garantía demostrada de backup diario o PITR.

## Flujo de diagnóstico

### 1. Identidad canónica y precondiciones

El responsable de infraestructura confirma en EasyPanel, **sin compartir credenciales**, el identificador del proyecto al que se conectan realmente `SUPABASE_URL`, `DATABASE_URL` y `DIRECT_URL`, y verifica dónde están los datos legítimos. El comprobador `scripts/verify-supabase-runtime-target.cjs` compara estas referencias con `TAD_EXPECTED_SUPABASE_PROJECT_REF` definido de forma independiente; solo certifica coherencia de referencias, no datos ni backup.

Si falta identidad canónica o no hay credenciales **de solo lectura** autorizadas para inspección de catálogo, detener el flujo. **No escalar privilegios** para superar errores del diagnóstico.

### 2. Inspeccionar extensión y objeto (solo catálogo)

Ejecutar únicamente después de confirmar el proyecto y el rol de consulta. Esta consulta no convierte una relación ausente a `regclass` obligatorio, y no falla si no existe `spatial_ref_sys`:

```sql
SELECT
  EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS postgis_installed,
  to_regclass('public.spatial_ref_sys') IS NOT NULL AS spatial_ref_sys_present,
  (SELECT tablename FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys') AS table_name,
  (SELECT tableowner FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'spatial_ref_sys') AS table_owner;
```

Si no existe PostGIS, marcar **EXTENSION_ABSENT**. No intentar reparación, cambios de ownership ni RLS en un objeto inexistente.

### 3. Diagnóstico de RLS y acceso efectivo (solo metadatos)

```sql
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
  AND c.relname IN ('devices', 'telemetry', 'driver_locations',
                    'subscriptions', 'campaigns', 'wallets')
ORDER BY c.relname;
```

Complementar con `has_schema_privilege('anon','public','USAGE')` y su equivalente para `authenticated`. Si faltan permisos, informar **INSUFFICIENT_READ_PRIVILEGES**; no otorgarlos automáticamente. Revisar políticas y ownership con el administrador, sin alterar el estado.

### 4. Dependencias, integridad de GPS y finanzas

Usar `docs/incidents/sql/2026-11-20-prisma-recovery-readonly-inventory.sql` únicamente contra el proyecto confirmado: inventario de tablas, tipos de identificadores, relaciones, RLS, migraciones y conteos agregados. No leer filas ni copiar cuerpos de `_prisma_migrations.logs`. Registrar si las 23 tablas siguen ausentes, PostGIS está instalado y hay incompatibilidades UUID/TEXT. Mantener colas offline, telemetría y ledger como invariantes.

### 5. Propuesta de recuperación (no ejecución)

Producir una propuesta `EXPAND → MIGRATE → CONTRACT` con evidencia y pruebas, nunca comandos de escritura para ejecución inmediata. Solo considerar cambios de extensiones, políticas o tablas si:

1. El propietario confirma la base canónica y dispone de una exportación verificada **restaurable** fuera del proyecto actual.
2. Se completó una prueba de restauración **aislada**, sin disparar webhooks, tareas cron, pagos o sincronizaciones con tablets reales.
3. La migración nueva fue revisada por seguridad y base de datos, preserva RLS y acceso, integridad de ledger/idempotencia y GPS, y se verificó en esa restauración.
4. Los tests relevantes, la paridad Prisma, el arranque API, CI con runners y aprobación de despliegue son satisfactorios.

## Resultado del agente

Entregar: `PROYECTO_CONFIRMED/UNKNOWN`, `POSTGIS_PRESENT/ABSENT`, `SPATIAL_REF_SYS_PRESENT/ABSENT`, lista de tablas sensibles con estado RLS/grants, dependencias, pruebas de restauración disponibles y bloqueos P0. Si faltan precondiciones, concluir **DIAGNÓSTICO DE SOLO LECTURA; REPARACIÓN NO AUTORIZADA**. No marcar "resuelto" por un cambio documental o por un guard sin ejecutar.
