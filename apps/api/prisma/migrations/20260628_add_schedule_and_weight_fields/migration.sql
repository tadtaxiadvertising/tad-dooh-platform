-- Migration: add_schedule_and_weight_fields
-- Date: 2026-06-28
-- GAP #6: Campaign day-of-week & hour-of-day scheduling
-- GAP #7: MediaAsset playback weight for weighted rotation

-- ── Campaign: scheduling fields ──
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_days TEXT DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS schedule_hours TEXT DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS frequency_cap INTEGER DEFAULT 0;

-- ── MediaAsset: playback weight ──
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1;

-- ── Update materialized view to include scheduling fields ──
-- This requires refreshing the view definition to expose scheduleDays/scheduleHours
-- for the sync engine to filter campaigns by current time.

CREATE OR REPLACE VIEW mv_active_campaigns AS
SELECT
  c.id AS campaign_id,
  c.active,
  c.start_date,
  c.end_date,
  c.target_all,
  c.target_city,
  c.target_cities,
  c.target_fleets,
  c.priority,
  c.schedule_days,
  c.schedule_hours,
  c.frequency_cap,
  COALESCE(
    (SELECT JSONB_AGG(dc.device_id::text) FROM device_campaigns dc WHERE dc.campaign_id = c.id),
    '[]'::jsonb
  ) AS assigned_device_uuids,
  COALESCE(
    (SELECT JSONB_AGG(pi.device_id::text) FROM playlist_items pi WHERE pi.campaign_id = c.id),
    '[]'::jsonb
  ) AS assigned_hw_ids,
  COALESCE(
    (SELECT JSONB_AGG(d.id::text)
     FROM _CampaignToDriver ct
     JOIN drivers d ON d.id = ct.B
     WHERE ct.A = c.id),
    '[]'::jsonb
  ) AS assigned_driver_ids
FROM campaigns c
WHERE c.active = true
  AND c.start_date <= NOW()
  AND c.end_date >= NOW();

-- ── Comment ──
COMMENT ON COLUMN campaigns.schedule_days IS 'JSON array of day names: MON,TUE,WED,THU,FRI,SAT,SUN. Empty [] = plays 24/7';
COMMENT ON COLUMN campaigns.schedule_hours IS 'JSON array of hour ranges: HH:MM or HH:MM-HH:MM. Empty [] = plays all hours';
COMMENT ON COLUMN campaigns.frequency_cap IS 'Max impressions per device per hour. 0 = unlimited';
COMMENT ON COLUMN media_assets.weight IS 'Playback weight (1-10). Higher = more frequent in WEIGHTED rotation mode';
