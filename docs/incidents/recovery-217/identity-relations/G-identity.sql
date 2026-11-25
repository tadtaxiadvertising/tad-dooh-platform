-- #217 DRAFT. Isolated restored clone only; no production execution.
-- Add canonical references while retaining legacy columns and dependent views.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $scope$ BEGIN
  IF current_database()<>'restored' OR inet_server_addr() IS NOT NULL
     OR current_setting('tad.recovery_scope',true) IS DISTINCT FROM 'isolated-clone-217' THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='isolated_clone_required';
  END IF;
END $scope$;
SET LOCAL ROLE postgres;
SET LOCAL search_path=pg_catalog,public;
LOCK TABLE public.device_campaigns,public.devices,public.driver_locations,
  public.drivers,public.telemetry,public.wallets IN ACCESS EXCLUSIVE MODE;
DO $pre$
DECLARE item RECORD; refs REGCLASS; field_number SMALLINT; bad BOOLEAN;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('drivers','id','text'),('devices','id','uuid'),('devices','device_id','text'),
    ('device_campaigns','device_id','text'),('device_campaigns','campaign_id','uuid'),
    ('devices','driver_id','uuid'),('driver_locations','driver_id','uuid'),
    ('telemetry','driver_id','uuid'),('telemetry','timestamp','timestamp'),
    ('wallets','driver_id','uuid')) AS e(table_name,column_name,type_name)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      JOIN pg_attribute a ON a.attrelid=t.oid WHERE n.nspname='public'
      AND t.relname=item.table_name AND t.relkind='r' AND t.relowner='postgres'::regrole
      AND a.attname=item.column_name AND NOT a.attisdropped
      AND a.atttypid=('pg_catalog.'||item.type_name)::regtype) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='reference_shape_required';
    END IF;
  END LOOP;
  FOR item IN SELECT unnest(ARRAY['drivers','devices']) AS table_name LOOP
    refs:=to_regclass(format('public.%I',item.table_name));
    SELECT attnum INTO STRICT field_number FROM pg_attribute
      WHERE attrelid=refs AND attname='id' AND NOT attisdropped;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=refs
      AND contype='p' AND conkey=ARRAY[field_number]) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='canonical_parent_primary_key_required';
    END IF;
  END LOOP;
  IF to_regprocedure('public.tad217_sync_driver_reference()') IS NOT NULL
     OR to_regprocedure('public.tad217_sync_assignment_reference()') IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='identity_functions_require_absence';
  END IF;
  FOR item IN SELECT * FROM (VALUES
    ('device_campaigns','device_id','device_uuid_217'),('devices','driver_id','driver_id_text_217'),
    ('driver_locations','driver_id','driver_id_text_217'),('telemetry','driver_id','driver_id_text_217'),
    ('wallets','driver_id','driver_id_text_217')) AS e(table_name,column_name,canonical_column)
  LOOP
    refs:=to_regclass(format('public.%I',item.table_name));
    IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=refs
      AND attname=item.canonical_column AND NOT attisdropped) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='canonical_reference_exists';
    END IF;
    IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=refs AND NOT tgisinternal) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='reference_triggers_require_review';
    END IF;
    SELECT attnum INTO STRICT field_number FROM pg_attribute WHERE attrelid=refs
      AND attname=item.column_name AND NOT attisdropped;
    IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND
      ((conrelid=refs AND field_number=ANY(conkey)) OR (confrelid=refs AND field_number=ANY(confkey)))) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='reference_foreign_keys_require_review';
    END IF;
  END LOOP;
  FOR item IN SELECT unnest(ARRAY['devices','driver_locations','telemetry','wallets']) AS table_name LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I s WHERE s.driver_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.drivers d WHERE d.id=s.driver_id::text))',item.table_name) INTO bad;
    IF bad THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='driver_reference_unmatched'; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.device_campaigns a WHERE
    (SELECT count(*) FROM public.devices d WHERE d.device_id=a.device_id OR d.id=CASE
      WHEN a.device_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN a.device_id::uuid END)<>1) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='device_reference_unmatched_or_ambiguous';
  END IF;
END $pre$;
CREATE TEMPORARY TABLE tad217_device_mapping ON COMMIT DROP AS
SELECT a.device_id AS original_id,a.campaign_id,d.id AS canonical_id
FROM public.device_campaigns a JOIN public.devices d ON d.device_id=a.device_id OR d.id=CASE
  WHEN a.device_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN a.device_id::uuid END;
DO $duplicates$ BEGIN
  IF EXISTS(SELECT 1 FROM tad217_device_mapping GROUP BY canonical_id,campaign_id HAVING count(*)>1) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='canonical_assignment_duplicate';
  END IF;
END $duplicates$;
ALTER TABLE public.device_campaigns ADD COLUMN device_uuid_217 UUID;
ALTER TABLE public.devices ADD COLUMN driver_id_text_217 TEXT;
ALTER TABLE public.driver_locations ADD COLUMN driver_id_text_217 TEXT;
ALTER TABLE public.telemetry ADD COLUMN driver_id_text_217 TEXT;
ALTER TABLE public.wallets ADD COLUMN driver_id_text_217 TEXT;
UPDATE public.device_campaigns a SET device_uuid_217=m.canonical_id
  FROM tad217_device_mapping m WHERE a.device_id=m.original_id AND a.campaign_id=m.campaign_id;
UPDATE public.devices SET driver_id_text_217=driver_id::text;
UPDATE public.driver_locations SET driver_id_text_217=driver_id::text;
UPDATE public.telemetry SET driver_id_text_217=driver_id::text;
UPDATE public.wallets SET driver_id_text_217=driver_id::text;
ALTER TABLE public.device_campaigns ALTER COLUMN device_uuid_217 SET NOT NULL;
ALTER TABLE public.driver_locations ALTER COLUMN driver_id_text_217 SET NOT NULL;
ALTER TABLE public.telemetry ALTER COLUMN driver_id_text_217 SET NOT NULL;
ALTER TABLE public.wallets ALTER COLUMN driver_id_text_217 SET NOT NULL;
-- New required TEXT references replace these legacy UUID NOT NULL requirements.
-- Original UUID values, indexes, constraints and columns remain present.
ALTER TABLE public.driver_locations ALTER COLUMN driver_id DROP NOT NULL;
ALTER TABLE public.telemetry ALTER COLUMN driver_id DROP NOT NULL;
ALTER TABLE public.wallets ALTER COLUMN driver_id DROP NOT NULL;
CREATE UNIQUE INDEX device_campaigns_device_uuid_campaign_217_key
  ON public.device_campaigns(device_uuid_217,campaign_id);
CREATE INDEX devices_driver_text_217_idx ON public.devices(driver_id_text_217);
CREATE INDEX driver_locations_driver_text_time_217_idx
  ON public.driver_locations(driver_id_text_217,timestamp DESC);
CREATE UNIQUE INDEX telemetry_driver_text_second_217_key
  ON public.telemetry(driver_id_text_217,date_trunc('second',timestamp));
CREATE INDEX telemetry_driver_text_time_217_idx
  ON public.telemetry(driver_id_text_217,timestamp DESC);
CREATE UNIQUE INDEX wallets_driver_text_217_key ON public.wallets(driver_id_text_217);
CREATE FUNCTION public.tad217_sync_driver_reference() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $driver$
DECLARE legacy_changed BOOLEAN; canonical_changed BOOLEAN; expected_legacy UUID;
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME NOT IN ('devices','driver_locations','telemetry','wallets') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_driver_reference_table';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.driver_id_text_217 IS NULL THEN NEW.driver_id_text_217:=NEW.driver_id::text;
    ELSIF NEW.driver_id IS NOT NULL AND NEW.driver_id_text_217 IS DISTINCT FROM NEW.driver_id::text THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_driver_reference';
    END IF;
  ELSE
    legacy_changed:=NEW.driver_id IS DISTINCT FROM OLD.driver_id;
    canonical_changed:=NEW.driver_id_text_217 IS DISTINCT FROM OLD.driver_id_text_217;
    IF legacy_changed AND NOT canonical_changed THEN NEW.driver_id_text_217:=NEW.driver_id::text;
    ELSIF legacy_changed AND canonical_changed THEN
      expected_legacy:=CASE WHEN NEW.driver_id_text_217 ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN NEW.driver_id_text_217::uuid END;
      IF NEW.driver_id IS DISTINCT FROM expected_legacy THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_driver_reference';
      END IF;
    END IF;
  END IF;
  IF NEW.driver_id_text_217 IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.drivers WHERE id=NEW.driver_id_text_217) THEN
      RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='canonical_driver_not_found';
    END IF;
    IF NEW.driver_id_text_217 ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      expected_legacy:=NEW.driver_id_text_217::uuid;
      IF NEW.driver_id_text_217 IS DISTINCT FROM expected_legacy::text THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='noncanonical_driver_uuid_text';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME<>'devices' THEN
    RAISE EXCEPTION USING ERRCODE='23502',MESSAGE='canonical_driver_required';
  END IF;
  NEW.driver_id:=expected_legacy;
  RETURN NEW;
END $driver$;
CREATE FUNCTION public.tad217_sync_assignment_reference() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $assignment$
DECLARE legacy_changed BOOLEAN:=false; canonical_changed BOOLEAN:=false; matches INTEGER; resolved UUID;
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'device_campaigns' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_assignment_table';
  END IF;
  IF TG_OP='UPDATE' THEN
    legacy_changed:=NEW.device_id IS DISTINCT FROM OLD.device_id;
    canonical_changed:=NEW.device_uuid_217 IS DISTINCT FROM OLD.device_uuid_217;
    IF canonical_changed AND NOT legacy_changed THEN NEW.device_id:=NEW.device_uuid_217::text;
    ELSIF legacy_changed AND NOT canonical_changed THEN NEW.device_uuid_217:=NULL;
    END IF;
  END IF;
  IF NEW.device_id IS NULL THEN NEW.device_id:=NEW.device_uuid_217::text; END IF;
  SELECT count(*),min(id::text)::uuid INTO matches,resolved FROM public.devices d
    WHERE d.device_id=NEW.device_id OR d.id=CASE WHEN NEW.device_id ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN NEW.device_id::uuid END;
  IF matches<>1 THEN
    RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='assignment_device_unmatched_or_ambiguous';
  END IF;
  IF NEW.device_uuid_217 IS NOT NULL AND NEW.device_uuid_217 IS DISTINCT FROM resolved THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_assignment_reference';
  END IF;
  NEW.device_uuid_217:=resolved;
  RETURN NEW;
END $assignment$;
REVOKE ALL ON FUNCTION public.tad217_sync_driver_reference(),public.tad217_sync_assignment_reference()
  FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER tad217_driver_reference BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_driver_reference();
CREATE TRIGGER tad217_driver_reference BEFORE INSERT OR UPDATE ON public.driver_locations
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_driver_reference();
CREATE TRIGGER tad217_driver_reference BEFORE INSERT OR UPDATE ON public.telemetry
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_driver_reference();
CREATE TRIGGER tad217_driver_reference BEFORE INSERT OR UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_driver_reference();
CREATE TRIGGER tad217_assignment_reference BEFORE INSERT OR UPDATE ON public.device_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_assignment_reference();
DO $post$
DECLARE item RECORD; bad BOOLEAN;
BEGIN
  FOR item IN SELECT unnest(ARRAY['devices','driver_locations','telemetry','wallets']) AS table_name LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE driver_id_text_217 IS DISTINCT FROM driver_id::text)',item.table_name) INTO bad;
    IF bad THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='original_driver_reference_changed'; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.device_campaigns a LEFT JOIN tad217_device_mapping m
    ON a.device_id=m.original_id AND a.campaign_id=m.campaign_id
    WHERE m.canonical_id IS NULL OR a.device_uuid_217 IS DISTINCT FROM m.canonical_id) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='original_assignment_reference_changed';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL
    aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.oid IN ('public.tad217_sync_driver_reference()'::regprocedure,
      'public.tad217_sync_assignment_reference()'::regprocedure)
    AND (p.prosecdef OR p.proowner<>'postgres'::regrole OR a.grantee<>p.proowner)) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='identity_function_privileges_unexpected';
  END IF;
END $post$;
COMMIT;
