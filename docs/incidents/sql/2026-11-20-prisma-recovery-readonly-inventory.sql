-- TAD DOOH / PostgreSQL schema recovery inventory
-- 2026-11-20 | READ-ONLY. No DDL, DML, row contents, secrets, or migrations.
-- Run only against the explicitly verified EasyPanel runtime database using
-- a role with narrowly scoped catalog inspection privileges.
-- A failed query due to permissions is NOT a reason to grant anon/authenticated.
-- Save only aggregate metadata; NEVER export passwords, connection URLs or
-- full _prisma_migrations.logs.

-- 1) Prisma migration metadata (success flags do not guarantee schema parity).
SELECT count(*) AS migration_rows,
       count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS marked_applied,
       count(*) FILTER (WHERE logs IS NOT NULL AND length(logs) > 0) AS rows_with_nonempty_logs
FROM public._prisma_migrations;

-- 2) Historical SQLSTATEs without printing the original error logs.
SELECT migration_name,
       coalesce(
         array_to_string(
           ARRAY(
             SELECT DISTINCT mt[1]
             FROM regexp_matches(
               coalesce(logs, ''),
               '(42P01|42804|42883|25001|42601|23505|23503|42P07|42703|42P16)',
               'g'
             ) mt
           ), ','
         ), 'none matched'
       ) AS recognized_sqlstates
FROM public._prisma_migrations
WHERE logs IS NOT NULL AND length(logs) > 0
ORDER BY migration_name;

-- 3) All expected Prisma-model tables absent from the 2026-11-20 inventory.
-- This is an observation aid, not permission to create objects automatically.
WITH expected(table_name) AS (
  VALUES
    ('active_ads'), ('advertiser_subscriptions'), ('analytics_events'),
    ('bi_dashboard_snapshots'), ('campaign_metrics'), ('commission_ledger'),
    ('commissions'), ('contract_acceptances'), ('conversation_messages'),
    ('conversations'), ('conversion_events'), ('fleets'), ('leads'),
    ('payment_evidence'), ('payment_intents'), ('payment_verifications'),
    ('playlists'), ('portal_requests'), ('qr_scans'),
    ('reconciliation_reports'), ('referral_attributions'),
    ('settlement_batches'), ('users')
)
SELECT e.table_name, to_regclass(format('public.%I', e.table_name)) IS NOT NULL AS now_present
FROM expected e
ORDER BY e.table_name;

-- 4) Schema column types of id / possible relationship columns.
SELECT table_name, column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name = 'id' OR column_name IN (
    'driver_id', 'device_id', 'campaign_id', 'advertiser_id',
    'wallet_id', 'subscription_id'
  ))
ORDER BY table_name, column_name;

-- 5) Six specifically confirmed logical relation type mismatches, matched to
-- current Prisma @relation declarations. No data rows are inspected.
WITH driver_id AS (
  SELECT udt_name AS expected FROM information_schema.columns
  WHERE table_schema='public' AND table_name='drivers' AND column_name='id'
), device_pk AS (
  SELECT udt_name AS expected FROM information_schema.columns
  WHERE table_schema='public' AND table_name='devices' AND column_name='id'
), device_external AS (
  SELECT udt_name AS expected FROM information_schema.columns
  WHERE table_schema='public' AND table_name='devices' AND column_name='device_id'
)
SELECT c.table_name,c.column_name,c.udt_name AS actual,
       driver_id.expected AS related_type,'drivers.id' AS model_target
FROM information_schema.columns c CROSS JOIN driver_id
WHERE c.table_schema='public' AND c.column_name='driver_id'
  AND c.table_name IN ('devices','driver_locations','telemetry','wallets')
  AND c.udt_name<>driver_id.expected
UNION ALL
SELECT c.table_name,c.column_name,c.udt_name,device_pk.expected,'devices.id'
FROM information_schema.columns c CROSS JOIN device_pk
WHERE c.table_schema='public' AND c.table_name='device_campaigns'
  AND c.column_name='device_id' AND c.udt_name<>device_pk.expected
UNION ALL
SELECT c.table_name,c.column_name,c.udt_name,device_external.expected,'devices.device_id'
FROM information_schema.columns c CROSS JOIN device_external
WHERE c.table_schema='public' AND c.table_name='driver_locations'
  AND c.column_name='device_id' AND c.udt_name<>device_external.expected
ORDER BY 1,2;

-- 6) Effective client grants on public base tables with RLS disabled.
-- Missing RLS is NOT evidence of exposure when grants are denied.
SELECT count(*) AS public_base_tables,
       count(*) FILTER (WHERE NOT c.relrowsecurity) AS rls_disabled,
       count(*) FILTER (
         WHERE NOT c.relrowsecurity AND
         (has_table_privilege('anon',c.oid,'SELECT')
          OR has_table_privilege('anon',c.oid,'INSERT')
          OR has_table_privilege('anon',c.oid,'UPDATE')
          OR has_table_privilege('anon',c.oid,'DELETE')
          OR has_table_privilege('authenticated',c.oid,'SELECT')
          OR has_table_privilege('authenticated',c.oid,'INSERT')
          OR has_table_privilege('authenticated',c.oid,'UPDATE')
          OR has_table_privilege('authenticated',c.oid,'DELETE'))
       ) AS rls_disabled_with_client_grants
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';

-- 7) Row counts only, no customer data; a zero count applies to this database
-- at query time and does not prove EasyPanel serves the same project.
SELECT (SELECT count(*) FROM public.drivers) AS drivers,
       (SELECT count(*) FROM public.devices) AS devices,
       (SELECT count(*) FROM public.device_campaigns) AS device_campaigns,
       (SELECT count(*) FROM public.driver_locations) AS driver_locations,
       (SELECT count(*) FROM public.telemetry) AS telemetry,
       (SELECT count(*) FROM public.wallets) AS wallets,
       (SELECT count(*) FROM public.financial_transactions) AS financial_transactions;

-- After this report: verify a restorable backup and the EasyPanel project ref;
-- make changes ONLY via separate reviewed, forward-only staging-rehearsed
-- migrations. Never run db push, migrate reset, or migrate resolve --applied
-- to conceal the observed history.

-- 8) Function privilege and security-context metadata (no function bodies).
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer, p.proconfig AS fixed_config,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
       has_function_privilege('public',p.oid,'EXECUTE') AS public_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('update_campaign_expirations_updated_at','refresh_active_campaigns')
ORDER BY p.proname;
