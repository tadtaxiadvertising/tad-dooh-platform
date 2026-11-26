-- Metadata and boolean checks only. No application records or credentials.
-- Pin the project independently in the client before executing this file.
-- This preflight does not authorize or execute a production transition.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

SELECT jsonb_build_object(
  'checkedAt', pg_catalog.transaction_timestamp(),
  'readOnly', pg_catalog.current_setting('transaction_read_only'),
  'database', pg_catalog.current_database(),
  'role', CURRENT_USER,
  'serverVersion', pg_catalog.current_setting('server_version'),
  'tables', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table_name', table_name)
      ORDER BY table_name), '[]'::jsonb)
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ),
  'columns', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'table_name', c.table_name, 'column_name', c.column_name,
      'udt_schema', c.udt_schema, 'udt_name', c.udt_name,
      'is_nullable', c.is_nullable,
      'formatted_type', pg_catalog.format_type(a.atttypid, a.atttypmod)
    ) ORDER BY c.table_name, c.column_name), '[]'::jsonb)
    FROM information_schema.columns c
    JOIN pg_catalog.pg_namespace n ON n.nspname = c.table_schema
    JOIN pg_catalog.pg_class t
      ON t.relnamespace = n.oid AND t.relname = c.table_name
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = t.oid AND a.attname = c.column_name
    WHERE c.table_schema = 'public' AND a.attnum > 0 AND NOT a.attisdropped
  ),
  'extensions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'extname', e.extname, 'extension_schema', n.nspname, 'version', e.extversion
    ) ORDER BY e.extname), '[]'::jsonb)
    FROM pg_catalog.pg_extension e
    JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
  ),
  'enumTypes', (
    SELECT coalesce(jsonb_agg(enums ORDER BY enums->>'enum_name'), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'enum_schema', n.nspname, 'enum_name', t.typname,
        'enum_values', array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
      ) AS enums
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
      GROUP BY n.nspname, t.typname
    ) s
  ),
  'postgisAvailable', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'version', version, 'installed', installed, 'superuser', superuser,
      'trusted', trusted, 'relocatable', relocatable, 'schema', schema
    ) ORDER BY version), '[]'::jsonb)
    FROM pg_catalog.pg_available_extension_versions WHERE name = 'postgis'
  ),
  'emptyTargets', jsonb_build_object(
    'drivers', NOT EXISTS (SELECT 1 FROM public.drivers),
    'devices', NOT EXISTS (SELECT 1 FROM public.devices),
    'driver_locations', NOT EXISTS (SELECT 1 FROM public.driver_locations),
    'campaign_expirations', NOT EXISTS (SELECT 1 FROM public.campaign_expirations),
    'subscriptions', NOT EXISTS (SELECT 1 FROM public.subscriptions),
    'telemetry', NOT EXISTS (SELECT 1 FROM public.telemetry)
  ),
  'financialCurrencyCompatible', NOT EXISTS (
    SELECT 1 FROM public.financial_transactions
    WHERE currency IS NULL OR currency::text NOT IN ('DOP', 'USD', 'EUR')
  ),
  'prismaMigrations', (
    SELECT jsonb_build_object(
      'finished', count(*) FILTER (WHERE finished_at IS NOT NULL),
      'unresolved', count(*) FILTER (
        WHERE finished_at IS NULL AND rolled_back_at IS NULL),
      'rolledBack', count(*) FILTER (WHERE rolled_back_at IS NOT NULL)
    ) FROM public._prisma_migrations
  ),
  'sessionCapabilities', (
    SELECT jsonb_build_object(
      'superuser', rolsuper, 'bypassRls', rolbypassrls,
      'createDb', rolcreatedb, 'canLogin', rolcanlogin,
      'maySetSupabaseAdmin', pg_catalog.pg_has_role(
        CURRENT_USER, 'supabase_admin', 'SET'),
      'inheritsPrivilegedRole', pg_catalog.pg_has_role(
        CURRENT_USER, 'supabase_privileged_role', 'USAGE'),
      'maySetPrivilegedRole', pg_catalog.pg_has_role(
        CURRENT_USER, 'supabase_privileged_role', 'SET'),
      'sessionLoadsSupautils', position(
        ',supautils,' IN ',' || replace(pg_catalog.current_setting(
          'session_preload_libraries'), ' ', '') || ','
      ) > 0,
      'postgisListedInPrivilegedExtensions', position(
        ',postgis,' IN ',' || replace(coalesce(pg_catalog.current_setting(
          'supautils.privileged_extensions', true), ''), ' ', '') || ','
      ) > 0,
      'extensionSuperuserIsSupabaseAdmin', pg_catalog.current_setting(
        'supautils.superuser', true) = 'supabase_admin'
    ) FROM pg_catalog.pg_roles WHERE rolname = CURRENT_USER
  )
) AS preflight;

ROLLBACK;
