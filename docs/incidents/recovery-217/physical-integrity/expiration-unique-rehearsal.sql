-- #217: REVIEW-ONLY rehearsal; never execute against a deployed database.
-- Baseline: main 87c7a78ec208e16ebaee339f796ad365977cae31.
-- Historical migration 20261012_campaign_notification_dedup and Prisma
-- CampaignExpiration both require one expiration row per campaign.
-- This is NOT a migration. It deliberately rolls back, even on success.
-- Run only after G0 restore proof, with an operator-verified isolated local
-- clone named restored, no network/provider side effects, and psql
-- -X -v ON_ERROR_STOP=1. The session marker is a secondary safety guard,
-- NOT proof of isolation. Never set it on a deployed system.
-- Use the existing #217 isolated-clone convention: tad.recovery_scope.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;
DO $scope$
BEGIN
  IF current_database() <> 'restored'
     OR inet_server_addr() IS NOT NULL
     OR current_setting('tad.recovery_scope', true)
        IS DISTINCT FROM 'isolated-clone-217' THEN
    RAISE EXCEPTION 'isolated_clone_required';
  END IF;
END
$scope$;
LOCK TABLE public.campaign_expirations IN ACCESS EXCLUSIVE MODE;
DO $pre$
DECLARE
  field_num smallint;
BEGIN
  SELECT attnum INTO STRICT field_num
  FROM pg_attribute
  WHERE attrelid = 'public.campaign_expirations'::regclass
    AND attname = 'campaign_id' AND NOT attisdropped
    AND atttypid = 'pg_catalog.uuid'::regtype AND attnotnull;
  IF EXISTS (
    SELECT 1 FROM pg_index
    WHERE indrelid = 'public.campaign_expirations'::regclass
      AND indisunique AND indisvalid AND indisready AND indislive
      AND indpred IS NULL AND indexprs IS NULL
      AND indnkeyatts = 1 AND indkey[0] = field_num
  ) THEN
    RAISE EXCEPTION 'equivalent_unique_index_already_exists_review_required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.campaign_expirations'::regclass
      AND conname = 'campaign_expiration_campaign_unique'
  ) OR to_regclass('public.campaign_expiration_campaign_unique') IS NOT NULL THEN
    RAISE EXCEPTION 'name_collision_review_required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.campaign_expirations
    GROUP BY campaign_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_campaigns_review_required';
  END IF;
END
$pre$;
ALTER TABLE public.campaign_expirations
  ADD CONSTRAINT campaign_expiration_campaign_unique UNIQUE (campaign_id);
DO $post$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_index i ON i.indexrelid = c.conindid
    JOIN pg_attribute a ON a.attrelid = c.conrelid
      AND a.attname = 'campaign_id' AND NOT a.attisdropped
    WHERE c.conrelid = 'public.campaign_expirations'::regclass
      AND c.conname = 'campaign_expiration_campaign_unique'
      AND c.contype = 'u' AND c.convalidated
      AND c.conkey = ARRAY[a.attnum]
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indislive
      AND i.indpred IS NULL AND i.indexprs IS NULL
  ) THEN
    RAISE EXCEPTION 'expiration_unique_postcondition_failed';
  END IF;
END
$post$;
SELECT 'EXPIRATION_UNIQUE_REHEARSAL_CATALOG_PASS_ROLLBACK_REQUIRED' AS verdict;
ROLLBACK;
-- Independently confirm the constraint is absent after rollback.
SELECT NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'public.campaign_expirations'::regclass
    AND conname = 'campaign_expiration_campaign_unique'
) AS rehearsal_rolled_back;
-- Before a separate release candidate: synthetic duplicate rejection
-- (SQLSTATE 23505), concurrent writes, notification queue behavior,
-- lock/latency measurement at 10x, and full Prisma/API tests on the clone.
-- No production promotion, no legacy key removal, no change to GPS,
-- Wallet or notification_queue. Do not replace ROLLBACK with COMMIT here.
