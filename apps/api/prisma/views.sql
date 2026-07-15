-- =============================================================================
-- TAD DOOH — Master Sync Materialized Views (CANÓNICO v12.2.5)
-- =============================================================================
-- Fuente única de verdad para la vista materializada del master-sync.
-- Aplicada por:
-- 1) `apps/api/src/modules/prisma/prisma.service.ts` en `onModuleInit`
-- (ejecuta el contenido de este archivo al iniciar el backend)
-- 2) Función `refresh_active_campaigns()` invocada por
--    `sync.service.refreshManifestView()` y otros hot-paths.
--
-- Históricamente existían DOS archivos (`views.sql` y `optimize_sync.sql`)
-- con definiciones divergentes del mismo objeto — esto causaba estados
-- inconsistentes entre entornos. A partir de v12.1.3 SOLO este archivo es la
-- fuente de verdad. `optimize_sync.sql` se conserva deprecado como redirect.
--
-- v12.2.5 (2026-07-15):
-- - DROP y recreación idempotente (evita estado zombie en deploys).
-- - Filtro de fecha (start/end) movido a la vista para reducir join en tablet.
-- - Nueva función `refresh_active_campaigns()` (CONCURRENTLY con fallback).
-- =============================================================================

-- ── Reemplazo completo de la MV (el service ya la dropea antes de crear) ──
DROP MATERIALIZED VIEW IF EXISTS mv_active_campaigns;

CREATE MATERIALIZED VIEW mv_active_campaigns AS
SELECT
  c.id AS campaign_id,
  c.status,
  c.active,
  c.start_date,
  c.end_date,
  c.target_all,
  c.target_city,
  c.target_cities,
  c.target_fleets,
  c.priority,

  -- Pre-aggregated targeting arrays (GIN-indexed abajo):
  COALESCE(
    (SELECT jsonb_agg(dc.device_id)
     FROM device_campaigns dc
     WHERE dc.campaign_id = c.id),
    '[]'::jsonb
  ) AS assigned_device_uuids,
  COALESCE(
    (SELECT jsonb_agg(pi.device_id)
     FROM playlist_items pi
     WHERE pi.campaign_id = c.id),
    '[]'::jsonb
  ) AS assigned_hw_ids,
  COALESCE(
    (SELECT jsonb_agg(td.id)
     FROM "_CampaignToDriver" ctd
     JOIN drivers td ON td.id = ctd."B"
     WHERE ctd."A" = c.id),
    '[]'::jsonb
  ) AS assigned_driver_ids
FROM campaigns c
WHERE c.active = true
  AND c.start_date <= now()
  AND c.end_date >= now();

-- ── Índices para el master-sync de alto rendimiento ──
-- GIN sobre JSONB: esencial para `@>` (contains) usado por sync.service.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_campaigns_id
  ON mv_active_campaigns (campaign_id);

CREATE INDEX IF NOT EXISTS idx_mv_campaigns_status
  ON mv_active_campaigns (status);

CREATE INDEX IF NOT EXISTS idx_mv_campaigns_dates
  ON mv_active_campaigns (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_mv_campaigns_target_city
  ON mv_active_campaigns (target_city);

CREATE INDEX IF NOT EXISTS idx_mv_campaigns_uuids
  ON mv_active_campaigns USING GIN (assigned_device_uuids);

CREATE INDEX IF NOT EXISTS idx_mv_campaigns_hwids
  ON mv_active_campaigns USING GIN (assigned_hw_ids);

CREATE INDEX IF NOT EXISTS idx_mv_campaigns_drivers
  ON mv_active_campaigns USING GIN (assigned_driver_ids);

-- ── Helper: Refresh zero-downtime ──
-- REQUIERE permisos DDL en producción — crear vía migración Prisma o panel.
CREATE OR REPLACE FUNCTION refresh_active_campaigns()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_campaigns;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback si la vista está vacía (CONCURRENTLY no soporta populación inicial)
    RAISE NOTICE 'refresh_active_campaigns: fallback a REFRESH no-CONCURRENTLY (%)', SQLERRM;
    REFRESH MATERIALIZED VIEW mv_active_campaigns;
END;
$$;
