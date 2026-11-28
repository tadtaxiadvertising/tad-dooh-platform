-- Operator-only diagnostic. PostgreSQL >= 16. No schema or data changes.
-- Latest 1000 reservations for public onboarding; an overflow flag is mandatory.
-- Do not publish raw receipts, account identifiers, or emails in tickets.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';

WITH candidates AS MATERIALIZED (
  SELECT id, "isLocked", created_at, path, method, response
  FROM public.idempotency_keys
  WHERE "driverId" = 'public-advertiser-onboarding:single-use:v1'
  ORDER BY created_at DESC, id DESC
  LIMIT 1001
), sample AS MATERIALIZED (
  SELECT * FROM candidates ORDER BY created_at DESC, id DESC LIMIT 1000
), decoded AS MATERIALIZED (
  SELECT *,
    CASE
      WHEN NOT "isLocked" AND octet_length(response) <= 4096
        AND pg_input_is_valid(response, 'jsonb')
      THEN response::jsonb
    END AS receipt
  FROM sample
), identifiers AS MATERIALIZED (
  SELECT *,
    CASE WHEN jsonb_typeof(receipt->'authUserId') = 'string'
      AND pg_input_is_valid(receipt->>'authUserId', 'uuid')
      THEN (receipt->>'authUserId')::uuid END AS auth_id,
    CASE WHEN jsonb_typeof(receipt->'advertiserId') = 'string'
      AND pg_input_is_valid(receipt->>'advertiserId', 'uuid')
      THEN (receipt->>'advertiserId')::uuid END AS advertiser_id,
    CASE WHEN jsonb_typeof(receipt->'campaignId') = 'string'
      AND pg_input_is_valid(receipt->>'campaignId', 'uuid')
      THEN (receipt->>'campaignId')::uuid END AS campaign_id
  FROM decoded
), classified AS (
  SELECT CASE
    WHEN i.path IS DISTINCT FROM '/onboarding/advertiser'
      OR i.method IS DISTINCT FROM 'POST' THEN 'INVALID_PROTOCOL'
    WHEN i."isLocked" AND i.response IS NOT NULL THEN 'LOCKED_WITH_UNEXPECTED_RECEIPT'
    WHEN i."isLocked" AND i.created_at <= (now() AT TIME ZONE 'UTC') - interval '1 hour'
      THEN 'AGED_LOCK_OUTCOME_UNKNOWN'
    WHEN i."isLocked" THEN 'RECENT_LOCK_OUTCOME_UNKNOWN'
    WHEN i.receipt->>'state' IS DISTINCT FROM 'COMMITTED'
      OR i.auth_id IS NULL OR i.advertiser_id IS NULL OR i.campaign_id IS NULL
      THEN 'INVALID_COMMITTED_RECEIPT'
    WHEN a.id IS NULL OR c.id IS NULL THEN 'BUSINESS_LINK_MISSING'
    WHEN c.advertiser_id IS DISTINCT FROM a.id THEN 'CAMPAIGN_OWNER_MISMATCH'
    WHEN u.id IS NULL THEN 'AUTH_LINK_MISSING'
    WHEN u.raw_app_meta_data->>'role' IS DISTINCT FROM 'ADVERTISER'
      OR u.email IS NULL OR lower(trim(u.email)) IS DISTINCT FROM lower(trim(a.email))
      THEN 'AUTH_LINK_MISMATCH'
    ELSE 'LINKS_CONSISTENT'
  END AS category
  FROM identifiers i
  LEFT JOIN public.advertisers a ON a.id = i.advertiser_id
  LEFT JOIN public.campaigns c ON c.id = i.campaign_id
  LEFT JOIN auth.users u ON u.id = i.auth_id
), counts AS (
  SELECT category, count(*) AS total FROM classified GROUP BY category
)
SELECT jsonb_build_object(
  'sample_limit', 1000,
  'sampled', (SELECT count(*) FROM sample),
  'truncated', (SELECT count(*) > 1000 FROM candidates),
  'categories', COALESCE((SELECT jsonb_object_agg(category, total) FROM counts), '{}'::jsonb)
);
ROLLBACK;
