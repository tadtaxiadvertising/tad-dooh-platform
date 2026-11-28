-- #217 DRAFT. Isolated restored clone only; no production execution.
-- Preserve legacy TEXT values and native API enums. No historical status mapping.
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
LOCK TABLE public.devices,public.drivers,public.financial_transactions IN ACCESS EXCLUSIVE MODE;
DO $pre$
DECLARE item RECORD; target REGCLASS; attr SMALLINT;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('devices','status','status_enum_217',quote_literal('OPERATIVO')||'::text'),
    ('drivers','status','status_enum_217',quote_literal('ACTIVE')||'::text'),
    ('financial_transactions','currency','currency_enum_217',quote_literal('DOP')||'::text')
  ) AS e(table_name,legacy_column,canonical_column,expected_default)
  LOOP
    target:=to_regclass(format('public.%I',item.table_name));
    IF NOT EXISTS(SELECT 1 FROM pg_class t JOIN pg_attribute a ON a.attrelid=t.oid
      JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
      WHERE t.oid=target AND t.relkind='r' AND t.relowner='postgres'::regrole
      AND a.attname=item.legacy_column AND NOT a.attisdropped AND a.attnotnull
      AND a.atttypid='pg_catalog.text'::regtype
      AND pg_get_expr(d.adbin,d.adrelid)=item.expected_default) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='legacy_enum_shape_required';
    END IF;
    IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=target
      AND attname=item.canonical_column AND NOT attisdropped) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='canonical_enum_column_exists';
    END IF;
    SELECT attnum INTO STRICT attr FROM pg_attribute WHERE attrelid=target
      AND attname=item.legacy_column AND NOT attisdropped;
    IF EXISTS(SELECT 1 FROM pg_constraint WHERE contype='f' AND
      ((conrelid=target AND attr=ANY(conkey)) OR (confrelid=target AND attr=ANY(confkey)))) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='legacy_enum_foreign_key_requires_review';
    END IF;
    -- G's exact identity trigger is expected on devices; no unreviewed trigger.
    IF EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=target AND NOT t.tgisinternal
      AND NOT(item.table_name='devices' AND t.tgname='tad217_driver_reference'
        AND t.tgfoid=to_regprocedure('public.tad217_sync_driver_reference()') AND t.tgtype=23)) THEN
      RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='enum_triggers_require_review';
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.devices) OR EXISTS(SELECT 1 FROM public.drivers) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='empty_status_tables_required';
  END IF;
  IF to_regtype('public."SystemStatus"') IS NOT NULL
    OR to_regprocedure('public.tad217_sync_system_status()') IS NOT NULL
    OR to_regprocedure('public.tad217_sync_currency()') IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='enum_objects_require_absence';
  END IF;
  IF (SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='public' AND t.typname='Currency')
    IS DISTINCT FROM ARRAY['DOP','USD','EUR']::TEXT[] THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='exact_currency_catalog_required';
  END IF;
  IF EXISTS(SELECT 1 FROM public.financial_transactions
    WHERE currency IS NULL OR currency NOT IN ('DOP','USD','EUR')) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='exact_currency_codes_required';
  END IF;
END $pre$;
CREATE TYPE public."SystemStatus" AS ENUM ('OPERATIVO','PENDIENTE_PAGO','BLOQUEADO');
REVOKE ALL ON TYPE public."SystemStatus" FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE public.devices ADD COLUMN status_enum_217 public."SystemStatus" NOT NULL;
ALTER TABLE public.drivers ADD COLUMN status_enum_217 public."SystemStatus" NOT NULL;
ALTER TABLE public.financial_transactions ADD COLUMN currency_enum_217 public."Currency";
UPDATE public.financial_transactions SET currency_enum_217=currency::public."Currency";
ALTER TABLE public.financial_transactions ALTER COLUMN currency_enum_217 SET NOT NULL;
-- Defaults move into BEFORE triggers so an omitted representation is NULL.
-- This distinguishes explicitly conflicting INSERT pairs from omitted fields.
-- Effective API defaults stay OPERATIVO/PENDIENTE_PAGO/DOP; no ACTIVE inference.
ALTER TABLE public.devices ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.drivers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.financial_transactions ALTER COLUMN currency DROP DEFAULT;
CREATE INDEX devices_status_enum_217_idx ON public.devices(status_enum_217);
CREATE INDEX drivers_status_enum_217_idx ON public.drivers(status_enum_217);
CREATE INDEX financial_transactions_currency_enum_217_idx ON public.financial_transactions(currency_enum_217);
CREATE FUNCTION public.tad217_sync_system_status() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $status$
DECLARE legacy_changed BOOLEAN; canonical_changed BOOLEAN;
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME NOT IN ('devices','drivers') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_status_table';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status IS NULL AND NEW.status_enum_217 IS NULL THEN
      NEW.status:=CASE TG_TABLE_NAME WHEN 'devices' THEN 'OPERATIVO' ELSE 'PENDIENTE_PAGO' END;
    END IF;
    IF NEW.status_enum_217 IS NULL THEN
      IF NEW.status NOT IN ('OPERATIVO','PENDIENTE_PAGO','BLOQUEADO') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_system_status';
      END IF;
      NEW.status_enum_217:=NEW.status::public."SystemStatus";
    ELSIF NEW.status IS NOT NULL AND NEW.status IS DISTINCT FROM NEW.status_enum_217::text THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_system_status';
    END IF;
  ELSE
    legacy_changed:=NEW.status IS DISTINCT FROM OLD.status;
    canonical_changed:=NEW.status_enum_217 IS DISTINCT FROM OLD.status_enum_217;
    IF legacy_changed AND NOT canonical_changed THEN
      IF NEW.status NOT IN ('OPERATIVO','PENDIENTE_PAGO','BLOQUEADO') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_system_status';
      END IF;
      NEW.status_enum_217:=NEW.status::public."SystemStatus";
    ELSIF legacy_changed AND canonical_changed
      AND NEW.status IS DISTINCT FROM NEW.status_enum_217::text THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_system_status';
    END IF;
  END IF;
  IF NEW.status_enum_217 IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23502',MESSAGE='system_status_required';
  END IF;
  NEW.status:=NEW.status_enum_217::text;
  RETURN NEW;
END $status$;
CREATE FUNCTION public.tad217_sync_currency() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $currency$
DECLARE legacy_changed BOOLEAN; canonical_changed BOOLEAN;
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'financial_transactions' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_currency_table';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.currency IS NULL AND NEW.currency_enum_217 IS NULL THEN NEW.currency:='DOP'; END IF;
    IF NEW.currency_enum_217 IS NULL THEN
      IF NEW.currency NOT IN ('DOP','USD','EUR') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_currency_code';
      END IF;
      NEW.currency_enum_217:=NEW.currency::public."Currency";
    ELSIF NEW.currency IS NOT NULL AND NEW.currency IS DISTINCT FROM NEW.currency_enum_217::text THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_currency_code';
    END IF;
  ELSE
    legacy_changed:=NEW.currency IS DISTINCT FROM OLD.currency;
    canonical_changed:=NEW.currency_enum_217 IS DISTINCT FROM OLD.currency_enum_217;
    IF legacy_changed AND NOT canonical_changed THEN
      IF NEW.currency NOT IN ('DOP','USD','EUR') THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsupported_currency_code';
      END IF;
      NEW.currency_enum_217:=NEW.currency::public."Currency";
    ELSIF legacy_changed AND canonical_changed
      AND NEW.currency IS DISTINCT FROM NEW.currency_enum_217::text THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='conflicting_currency_code';
    END IF;
  END IF;
  IF NEW.currency_enum_217 IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='23502',MESSAGE='currency_required';
  END IF;
  NEW.currency:=NEW.currency_enum_217::text;
  RETURN NEW;
END $currency$;
REVOKE ALL ON FUNCTION public.tad217_sync_system_status(),public.tad217_sync_currency()
  FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER tad217_system_status BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_system_status();
CREATE TRIGGER tad217_system_status BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_system_status();
CREATE TRIGGER tad217_currency BEFORE INSERT OR UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tad217_sync_currency();
DO $post$ BEGIN
  IF EXISTS(SELECT 1 FROM public.financial_transactions WHERE currency IS DISTINCT FROM currency_enum_217::text) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='currency_projection_changed';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL
    aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.oid IN ('public.tad217_sync_system_status()'::regprocedure,'public.tad217_sync_currency()'::regprocedure)
    AND (p.prosecdef OR p.proowner<>'postgres'::regrole OR a.grantee<>p.proowner)) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='enum_function_privileges_unexpected';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_type t CROSS JOIN LATERAL
    aclexplode(COALESCE(t.typacl,acldefault('T',t.typowner))) a
    WHERE t.oid='public."SystemStatus"'::regtype
    AND (t.typowner<>'postgres'::regrole OR a.grantee<>t.typowner)) THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='enum_type_privileges_unexpected';
  END IF;
END $post$;
COMMIT;
