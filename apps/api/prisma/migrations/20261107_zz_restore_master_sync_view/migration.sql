-- Restore the missing master-sync materialized view through a versioned,
-- additive migration. NEVER DROP or recreate this view on NestJS startup.
-- Read-only diagnosis (2026-11-07): campaigns.target_all and
-- public."_CampaignToDriver" are absent; public.mv_active_campaigns is absent.
-- Connected project currently has no campaigns/devices/drivers. This migration
-- MUST be validated on a representative staging restore before production.
--
-- Preserve the currently deployed Prisma contract: targetAll @default(true).
-- An ad is eligible for a device only when status is explicitly ACTIVE.

ALTER TABLE "public"."campaigns"
  ADD COLUMN IF NOT EXISTS "target_all" BOOLEAN NOT NULL DEFAULT true;

-- Prisma's implicit CampaignToDriver M:N relation. The existing physical DB
-- has campaign IDs as UUID and driver IDs as TEXT. Use the ACTUAL physical
-- types, never cast/convert existing primary keys.
CREATE TABLE "public"."_CampaignToDriver" (
  "A" UUID NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_CampaignToDriver_A_fkey"
    FOREIGN KEY ("A") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE,
  CONSTRAINT "_CampaignToDriver_B_fkey"
    FOREIGN KEY ("B") REFERENCES "public"."drivers"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "_CampaignToDriver_AB_unique"
  ON "public"."_CampaignToDriver"("A", "B");
CREATE INDEX "_CampaignToDriver_B_index"
  ON "public"."_CampaignToDriver"("B");

ALTER TABLE "public"."_CampaignToDriver" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."_CampaignToDriver"
  FROM PUBLIC, anon, authenticated;

-- Retain BOTH device identifier formats in the aggregate because the
-- physical device_campaigns.device_id column is TEXT; existing APIs may
-- write either devices.id (UUID serialized) or devices.device_id (hardware).
-- The sync query checks assigned_device_uuids against UUID and
-- assigned_hw_ids against hardware ID, with no type-unsafe join.
CREATE MATERIALIZED VIEW "public"."mv_active_campaigns" AS
SELECT
  c."id" AS campaign_id,
  c."status",
  c."active",
  c."start_date",
  c."end_date",
  c."target_all",
  c."target_city",
  c."target_cities",
  c."target_fleets",
  c."priority",
  COALESCE(
    (SELECT jsonb_agg(DISTINCT dc."device_id")
     FROM "public"."device_campaigns" dc
     WHERE dc."campaign_id" = c."id"),
    '[]'::jsonb
  ) AS assigned_device_uuids,
  (
    COALESCE(
      (SELECT jsonb_agg(DISTINCT dc."device_id")
       FROM "public"."device_campaigns" dc
       WHERE dc."campaign_id" = c."id"),
      '[]'::jsonb
    ) ||
    COALESCE(
      (SELECT jsonb_agg(DISTINCT pi."device_id")
       FROM "public"."playlist_items" pi
       WHERE pi."campaign_id" = c."id"),
      '[]'::jsonb
    )
  ) AS assigned_hw_ids,
  COALESCE(
    (SELECT jsonb_agg(DISTINCT d."id")
     FROM "public"."_CampaignToDriver" ctd
     JOIN "public"."drivers" d ON d."id" = ctd."B"
     WHERE ctd."A" = c."id"),
    '[]'::jsonb
  ) AS assigned_driver_ids
FROM "public"."campaigns" c
WHERE c."status" = 'ACTIVE'
  AND c."active" = true
  AND c."start_date" <= now()
  AND c."end_date" >= now();

-- CONCURRENTLY refresh requires a populated MV and an unconditional
-- unique index. CREATE ... AS SELECT above initially populates it.
CREATE UNIQUE INDEX "idx_mv_campaigns_id"
  ON "public"."mv_active_campaigns"("campaign_id");
CREATE INDEX "idx_mv_campaigns_status"
  ON "public"."mv_active_campaigns"("status");
CREATE INDEX "idx_mv_campaigns_dates"
  ON "public"."mv_active_campaigns"("start_date", "end_date");
CREATE INDEX "idx_mv_campaigns_target_city"
  ON "public"."mv_active_campaigns"("target_city");
CREATE INDEX "idx_mv_campaigns_uuids"
  ON "public"."mv_active_campaigns" USING GIN ("assigned_device_uuids");
CREATE INDEX "idx_mv_campaigns_hwids"
  ON "public"."mv_active_campaigns" USING GIN ("assigned_hw_ids");
CREATE INDEX "idx_mv_campaigns_drivers"
  ON "public"."mv_active_campaigns" USING GIN ("assigned_driver_ids");
CREATE INDEX "idx_mv_campaigns_target_cities_gin"
  ON "public"."mv_active_campaigns"
  USING GIN ("target_cities" jsonb_path_ops);
CREATE INDEX "idx_mv_campaigns_target_fleets_gin"
  ON "public"."mv_active_campaigns"
  USING GIN ("target_fleets" jsonb_path_ops);

-- Materialized views cannot use ordinary table RLS. Restrict direct Data API
-- access; the NestJS backend's privileged database role owns sync queries.
REVOKE ALL ON TABLE "public"."mv_active_campaigns"
  FROM PUBLIC, anon, authenticated;

-- The existing helper was callable by anon/authenticated via PostgreSQL's
-- default PUBLIC EXECUTE grant (verified 2026-11-07). Refresh is an internal
-- privileged operation; keep invoker semantics and remove RPC exposure.
REVOKE ALL ON FUNCTION "public"."refresh_active_campaigns"()
  FROM PUBLIC, anon, authenticated;
