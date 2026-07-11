-- =============================================================================
-- ⚠️ ARCHIVO DEPRECADO — v12.1.3
-- =============================================================================
-- Este archivo coexistía con `views.sql` definiendo el mismo objeto
-- `mv_active_campaigns` con columnas divergentes, provocando estados
-- inconsistentes entre entornos.
--
-- **USE EXCLUSIVAMENTE `views.sql`** (el cual es cargado por
-- `prisma.service.ts:initializeSreViews()` al iniciar la API).
--
-- Para mantener compat con scripts antiguos, este archivo continúa funcionando
-- RUN-TIME (Prisma no lo lee, así que es no-op), pero su contenido se mantiene
-- como referencia histórica únicamente. NO EJECUTAR directamente.
-- =============================================================================
--
-- TAD DOOH - Optimized Materialized View for Universal Sync
-- This view pre-calculates all campaign targets for every device/driver to avoid complex JOINs in heartbeats.
--
DROP MATERIALIZED VIEW IF EXISTS mv_active_campaigns;

CREATE MATERIALIZED VIEW mv_active_campaigns AS
SELECT 
    c.id AS campaign_id,
    c.name,
    c.status,
    c.active,
    c.start_date,
    c.end_date,
    c.priority,
    c.target_all,
    c.target_city,
    c.target_cities,
    -- Pre-aggregate Device UUIDs for GIN Indexing
    COALESCE(
        (SELECT jsonb_agg(dc.device_id) FROM device_campaigns dc WHERE dc.campaign_id = c.id),
        '[]'::jsonb
    ) as assigned_device_uuids,
    -- Pre-aggregate Hardware IDs (v1 legacy)
    COALESCE(
        (SELECT jsonb_agg(pi.device_id) FROM playlist_items pi WHERE pi.campaign_id = c.id),
        '[]'::jsonb
    ) as assigned_hw_ids,
    -- Pre-aggregate Driver IDs for segmentation
    COALESCE(
        (SELECT jsonb_agg(td.id) FROM "_CampaignToDriver" ctd JOIN drivers td ON td.id = ctd."B" WHERE ctd."A" = c.id),
        '[]'::jsonb
    ) as assigned_driver_ids
FROM campaigns c
WHERE c.status = 'ACTIVE' AND c.active = true;

-- Performance: GIN Indexes for high-speed JSONB lookup (10,000+ devices scale)
CREATE INDEX IF NOT EXISTS idx_mv_campaigns_status ON mv_active_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_mv_campaigns_dates ON mv_active_campaigns (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_mv_campaigns_uuids ON mv_active_campaigns USING GIN (assigned_device_uuids);
CREATE INDEX IF NOT EXISTS idx_mv_campaigns_hwids ON mv_active_campaigns USING GIN (assigned_hw_ids);
CREATE INDEX IF NOT EXISTS idx_mv_campaigns_drivers ON mv_active_campaigns USING GIN (assigned_driver_ids);

-- Tooling: Helper function to refresh concurrently (Zero-Downtime)
-- Note: Requires a UNIQUE index on ID to support CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_campaigns_id ON mv_active_campaigns (campaign_id);

CREATE OR REPLACE FUNCTION refresh_active_campaigns()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;
END;
$$ LANGUAGE plpgsql;
