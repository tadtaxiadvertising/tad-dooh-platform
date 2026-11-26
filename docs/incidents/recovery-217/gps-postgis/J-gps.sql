-- #217 DRAFT. Owned restored clone only; no production execution.
-- Empty telemetry required. Never infer historical taxi coordinates.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN
  IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL
    OR session_user<>'supabase_admin'
    OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='isolated_clone_required';
  END IF;
END $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
LOCK TABLE public.telemetry IN ACCESS EXCLUSIVE MODE;
DO $pre$
DECLARE item RECORD;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='telemetry' AND t.relkind='r'
    AND t.relowner='postgres'::regrole) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='telemetry_owner_required';
  END IF;
  IF EXISTS(SELECT 1 FROM public.telemetry) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='empty_telemetry_required';
  END IF;
  FOR item IN SELECT * FROM (VALUES ('id','uuid'),('driver_id_text_217','text'),('speed','float8'),('timestamp','timestamp')) AS e(column_name,type_name) LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.telemetry'::regclass
      AND attname=item.column_name AND NOT attisdropped
      AND atttypid=('pg_catalog.'||item.type_name)::regtype) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='canonical_telemetry_shape_required';
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.telemetry'::regclass AND attname='coords' AND NOT attisdropped)
    OR EXISTS(SELECT 1 FROM pg_extension WHERE extname='postgis') THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='gps_objects_require_absence';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='extensions')
    OR NOT has_schema_privilege('postgres','extensions','USAGE') THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='existing_extension_namespace_required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_available_extension_versions WHERE name='postgis' AND version='3.3.7') THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='pinned_postgis_version_required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.telemetry_driver_text_second_217_key')
    AND indrelid='public.telemetry'::regclass AND indisunique AND indisvalid AND indisready AND indnkeyatts=2) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='canonical_second_dedup_index_required';
  END IF;
END $pre$;
-- Extension installation requires the owned clone bootstrap. Existing managed
-- objects and spatial_ref_sys ownership/RLS/ACL are not altered.
SET LOCAL ROLE supabase_admin;
CREATE EXTENSION postgis WITH SCHEMA extensions VERSION '3.3.7';
SET LOCAL ROLE postgres;
ALTER TABLE public.telemetry ADD COLUMN coords extensions.geography(Point,4326) NOT NULL;
DO $post$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
    WHERE e.extname='postgis' AND e.extversion='3.3.7' AND n.nspname='extensions') THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='postgis_installation_contract_failed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE a.attrelid='public.telemetry'::regclass AND a.attname='coords' AND NOT a.attisdropped
    AND a.attnotnull AND n.nspname='extensions' AND t.typname='geography'
    AND extensions.postgis_typmod_type(a.atttypmod)='Point'
    AND extensions.postgis_typmod_srid(a.atttypmod)=4326
    AND extensions.postgis_typmod_dims(a.atttypmod)=2) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='native_point4326_contract_failed';
  END IF;
END $post$;
COMMIT;
