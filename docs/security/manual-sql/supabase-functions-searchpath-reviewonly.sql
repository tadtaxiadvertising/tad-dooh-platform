-- REVIEW-ONLY PLAN for #507; NOT an automatic Prisma migration.
-- Never run against production until #217 backup/restore evidence, #244/#489
-- credential containment, #313 release protection, staged regression and
-- DBA approval are independently verified.
-- Based on READ-ONLY catalog inspection of project ltdcdhqixvbpdcitthqf
-- on 2026-11-23. No user data or credentials are required to review this.
--
-- Expected effect when manually approved and applied in staging:
-- - Preserve SECURITY INVOKER, function identity, owner and existing grants.
-- - Set a fixed function search_path (pg_catalog, pg_temp).
-- - Qualify both materialized view refresh statements by schema.
-- - Do NOT refresh the view as part of this migration.
-- 
-- Rollback gate: do not blindly RESET search_path in production. Restore
-- approved baseline definition only after an isolated regression and
-- operator evaluation of dependent jobs/triggers.
BEGIN;
SET LOCAL lock_timeout = '3s';

DO $preflight$
DECLARE
  refresh_oid oid := to_regprocedure('public.refresh_active_campaigns()');
  trigger_oid oid := to_regprocedure('public.update_campaign_expirations_updated_at()');
BEGIN
  IF refresh_oid IS NULL OR trigger_oid IS NULL THEN
    RAISE EXCEPTION 'TAD_SEARCHPATH_PREFLIGHT_FUNCTION_MISSING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid IN (refresh_oid, trigger_oid)
      AND (prosecdef OR proconfig IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'TAD_SEARCHPATH_PREFLIGHT_FUNCTION_CHANGED';
  END IF;

  IF position(
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns'
    IN pg_get_functiondef(refresh_oid)
  ) = 0 THEN
    RAISE EXCEPTION 'TAD_SEARCHPATH_PREFLIGHT_REFRESH_BODY_CHANGED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'mv_active_campaigns'
      AND c.relkind = 'm'
  ) THEN
    RAISE EXCEPTION 'TAD_SEARCHPATH_PREFLIGHT_VIEW_MISSING';
  END IF;

  IF has_function_privilege('anon', refresh_oid, 'EXECUTE')
    OR has_function_privilege('authenticated', refresh_oid, 'EXECUTE')
  THEN
    RAISE EXCEPTION 'TAD_SEARCHPATH_PREFLIGHT_UNEXPECTED_PUBLIC_EXECUTE';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.refresh_active_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_campaigns;
EXCEPTION
  WHEN OTHERS THEN
    -- Existing fallback semantics: operational review is required before
    -- changing this broad exception handler; preserve in this narrow patch.
    RAISE NOTICE 'refresh_active_campaigns: fallback a REFRESH no-CONCURRENTLY (%)', SQLERRM;
    REFRESH MATERIALIZED VIEW public.mv_active_campaigns;
END;
$function$;

-- The trigger body only calls pg_catalog.now() through NOW(); no rewrite
-- or trigger reattachment is required. Preserve owner and existing grants.
ALTER FUNCTION public.update_campaign_expirations_updated_at()
  SET search_path = pg_catalog, pg_temp;

DO $postflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'refresh_active_campaigns',
        'update_campaign_expirations_updated_at'
      )
      AND (
        p.prosecdef
        OR array_position(p.proconfig, 'search_path=pg_catalog, pg_temp') IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'TAD_SEARCHPATH_POSTFLIGHT_INVALID_CONFIG';
  END IF;
END;
$postflight$;

COMMIT;
