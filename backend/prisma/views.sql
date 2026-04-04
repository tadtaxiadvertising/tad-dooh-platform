-- SQL para creación de vista materializada de campañas activas (SRE Optimized)
-- Esta vista pre-calcula los targets para que el heartbeat de la tablet sea ultra-ligero.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_active_campaigns AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    c.status,
    c.active,
    c.start_date,
    c.end_date,
    c.target_all,
    c.target_city,
    c.target_cities,
    c.target_fleets,
    c.priority,
    c.updated_at,
    a.id as advertiser_id,
    a.company_name as advertiser_name,
    COALESCE((
      SELECT jsonb_agg(DISTINCT device_id) 
      FROM device_campaigns 
      WHERE campaign_id = c.id
    ), '[]'::jsonb) as assigned_device_uuids,
    COALESCE((
      SELECT jsonb_agg(DISTINCT device_id) 
      FROM playlist_items 
      WHERE campaign_id = c.id
    ), '[]'::jsonb) as assigned_hw_ids,
    COALESCE((
      SELECT jsonb_agg(DISTINCT "B") 
      FROM "_CampaignToDriver" 
      WHERE "A" = c.id
    ), '[]'::jsonb) as assigned_driver_ids
FROM campaigns c
LEFT JOIN advertisers a ON c.advertiser_id = a.id
WHERE c.active = true 
  AND c.status = 'ACTIVE'
  AND c.end_date >= NOW();

-- Indice único para permitir REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_campaign_id ON mv_active_campaigns (campaign_id);
