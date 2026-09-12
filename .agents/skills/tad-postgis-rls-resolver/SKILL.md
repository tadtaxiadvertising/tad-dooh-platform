---
name: tad-postgis-rls-resolver
description: "Use when debugging or resolving PostgreSQL ownership conflicts (Error 42501) on PostGIS system tables (spatial_ref_sys) in Supabase and Prisma ORM, ensuring seamless RLS manipulation and migration continuity without risking taxi fleet geolocation data."
---

# TAD PostGIS RLS & Ownership Conflict Resolver (DBA Master Skill)

## 📌 ROL Y PROPÓSITO
Actuar como DBA Senior de TAD DOOH Platform especializado en PostgreSQL, Supabase y Prisma ORM. Este skill define el protocolo de resolución determinista ante el error:
`Failed to toggle RLS: Failed to run sql ERROR: 42501: must be owner of table spatial_ref_sys`

---

## 🎯 OBJETIVO MÁXIMO
Resolver el conflicto de propiedad y permisos sobre la tabla de proyección de PostGIS (`public.spatial_ref_sys`), permitiendo que:
1. Las migraciones de Prisma ORM se apliquen limpiamente sin bloqueos de DDL.
2. Los paneles de administración (Supabase Studio / Easypanel) y scripts automatizados alternen RLS en tablas de negocio sin fallos.
3. Se garantice la persistencia e integridad del 100% de los datos de telemetría y geolocalización de la flota de taxis (`telemetry`, `driver_locations`).

---

## 🛑 RESTRICCIONES CRÍTICAS (NO VIOLAR)
1. **NO ELIMINAR NI RECREAR LA EXTENSIÓN POSTGIS**: Destruiría los tipos geográficos (`geography(Point, 4326)`) y purgaría los datos de GPS de los vehículos.
2. **NO APLICAR RLS DIRECTO SOBRE `spatial_ref_sys`**: Esta tabla es un catálogo de solo lectura del sistema de referencia espacial perteneciente a la extensión (`deptype = 'e'`).
3. **NO ASUMIR PERMISOS DE SUPERUSER PARA `postgres`**: Desde la actualización de seguridad de Supabase en 2024, el usuario `postgres` no posee el flag `rolsuper=true`. La tabla `spatial_ref_sys` pertenece a `supabase_admin`.

---

## 🔄 BUCLE AGÉNTICO DE RESOLUCIÓN (ESTRICTO)

### Paso 1: Auditoría de Estado (Reconnaissance)
1. Conectar a PostgreSQL mediante connection pooler directo (`DIRECT_URL` / puerto 5432) o Prisma client.
2. Consultar el estado y propietario de la tabla:
   ```sql
   SELECT schemaname, tablename, tableowner, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'spatial_ref_sys';
   ```
3. Verificar dependencias de extensión para confirmar que PostGIS está activo:
   ```sql
   SELECT e.extname, e.extversion, d.deptype 
   FROM pg_extension e 
   JOIN pg_depend d ON d.refobjid = e.oid 
   WHERE d.objid = 'public.spatial_ref_sys'::regclass;
   ```
4. Identificar el propietario (`tableowner`): `supabase_admin`.

### Paso 2: Corrección Estratégica (Execution)
1. **Intento de transferencia de propiedad**:
   ```sql
   ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
   ```
   *Nota técnica*: En entornos gestionados de Supabase donde `postgres` carece de superuser, la transferencia directa de propiedad de una tabla de extensión generará `ERROR 42501`.
2. **Parche Defensivo y Asignación de Privilegios**:
   Ejecutar el otorgamiento de privilegios completos al usuario de la aplicación:
   ```sql
   GRANT ALL ON TABLE public.spatial_ref_sys TO postgres;
   ```
3. **Blindaje de Migraciones de Prisma (`migration.sql`)**:
   Envolver cualquier script o migración en bloques transaccionales idempotentes que discriminen tablas de negocio de tablas de extensión:
   ```sql
   DO $$
   BEGIN
       IF EXISTS (
           SELECT 1 FROM pg_tables 
           WHERE schemaname = 'public' 
             AND tablename = 'spatial_ref_sys' 
             AND tableowner = CURRENT_USER
       ) THEN
           EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;';
       ELSE
           GRANT ALL ON TABLE public.spatial_ref_sys TO postgres;
       END IF;
   EXCEPTION
       WHEN OTHERS THEN
           RAISE NOTICE 'Skipping spatial_ref_sys modification: %', SQLERRM;
   END $$;
   ```

### Paso 3: Verificación de Regresión (Testing)
1. Alternar y verificar RLS en tablas de negocio críticas:
   ```sql
   ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
   ```
2. Confirmar que ninguna tabla de negocio lanza el error `42501`.
3. Ejecutar script de prueba con el cliente de Prisma:
   ```bash
   node apps/api/fix-rls.js
   ```

### Paso 4: Reporte de Seguridad y Telemetría
1. Validar que las tablas de negocio tienen RLS habilitado:
   ```sql
   SELECT tablename, rowsecurity, tableowner 
   FROM pg_tables 
   WHERE schemaname = 'public' 
     AND tablename IN ('users', 'devices', 'payroll_payments', 'subscriptions', 'advertisers', 'campaigns', 'telemetry', 'spatial_ref_sys');
   ```
2. Comprobar que las políticas de RLS (`pg_policies`) se mantengan activas e íntegras.
3. Verificar conteo de datos de geolocalización:
   ```sql
   SELECT count(*) FROM public.driver_locations;
   SELECT count(*) FROM public.telemetry;
   ```

---

## 🧰 HERRAMIENTAS Y SCRIPTS ASOCIADOS
- `apps/api/scripts/audit_spatial_ref_sys.cjs`: Diagnóstico rápido de propiedad y versiones de PostGIS.
- `apps/api/scripts/dba_remediation.cjs`: Pipeline automatizado de mitigación y comprobación de regresión.
- `apps/api/fix-rls.js` / `fix-rls.ts`: Script productivo para refresco de RLS sin tocar `spatial_ref_sys`.
- `apps/api/prisma/migrations/20260522_enable_rls_on_spatial_ref_sys/migration.sql`: Migración con guarda idempotente.
