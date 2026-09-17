-- Migration: campaign_targeting_jsonb
-- Date: 2026-09-17
-- Habilita el targeting multi-ciudad/flota REAL en Campañas.
--
-- Contexto (loop autónomo v12.4.1):
--   target_cities / target_fleets eran columnas TEXT que almacenaban JSON array
--   literal ("[]"). El código NUNCA las escribía (solo target_city singular y
--   target_all), y el único query sobre ellas era `::text LIKE '%ciudad%'` que:
--     1) nunca matcheaba (columna siempre='[]'), y
--     2) NO podía usar un índice GIN (GIN acelera @>, no LIKE sobre texto).
--   Resultado: la funcionalidad era código muerto y el item de backlog
--   "índices GIN en target_cities/target_fleets" no tenía efecto real.
--
-- FIX: convertir a JSONB nativo + índice GIN, y (en service/DTO) habilitar
-- la escritura real + migrar las consultas a operador `@>` que SÍ usa el índice.
--
-- Seguridad de datos: las columnas guardan "[]" (default) o JSON válido, por
-- lo que el cast `::jsonb` es seguro. Usamos COALESCE para filas defectuosas.

-- 1) Convertir columnas a JSONB de forma idempotente (USING cast seguro)
ALTER TABLE campaigns ALTER COLUMN target_cities TYPE JSONB
  USING COALESCE(NULLIF(target_cities, '')::jsonb, '[]'::jsonb);
ALTER TABLE campaigns ALTER COLUMN target_fleets TYPE JSONB
  USING COALESCE(NULLIF(target_fleets, '')::jsonb, '[]'::jsonb);

-- 2) Default a JSONB (no TEXT)
ALTER TABLE campaigns ALTER COLUMN target_cities SET DEFAULT '[]'::jsonb;
ALTER TABLE campaigns ALTER COLUMN target_fleets SET DEFAULT '[]'::jsonb;

-- 3) Índices GIN (jsonb_path_ops para @> sobre arrays de strings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_target_cities_gin
  ON campaigns USING GIN (target_cities jsonb_path_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_target_fleets_gin
  ON campaigns USING GIN (target_fleets jsonb_path_ops);

-- 4) Documentación
COMMENT ON COLUMN campaigns.target_cities
  IS 'JSONB array de ciudades objetivo (targeting multi-ciudad). Vacío [] = sin restricción por ciudad. Consultar con @> (usa índice GIN).';
COMMENT ON COLUMN campaigns.target_fleets
  IS 'JSONB array de flotas objetivo (targeting multi-flota). Vacío [] = sin restricción por flota. Consultar con @> (usa índice GIN).';

-- Verificación:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename='campaigns' AND indexname IN ('idx_campaigns_target_cities_gin','idx_campaigns_target_fleets_gin');