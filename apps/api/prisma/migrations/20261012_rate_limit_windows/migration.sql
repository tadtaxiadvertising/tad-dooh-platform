-- =============================================================================
-- TAD DOOH Platform — Rate Limit Windows (DB-backed) Migration
-- =============================================================================
-- PROPÓSITO
--   Reemplazar el rate limiting in-memory (playbackRateMap en telemetry.service.ts)
--   con una tabla PostgreSQL persistente. Esto permite:
--   - Sobrevivir a reinicios de pod / OOM kill
--   - Escalar horizontalmente (múltiples instancias comparten el mismo store)
--   - Evitar leaks de memoria en el proceso Node
--
-- SEGURIDAD
--   1. Crear tabla + índices únicos atómicamente
--   2. No ejecutar DROP si la tabla ya existe (idempotent)
--   3. Usar `IF NOT EXISTS` para idempotencia
--
-- REVERSA
--   DROP TABLE IF EXISTS rate_limit_windows;
--   DROP INDEX IF EXISTS idx_rate_limit_device_window;
-- =============================================================================

-- 1) Crear tabla de rate limiting con índice único
CREATE TABLE IF NOT EXISTS public.rate_limit_windows (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT NOT NULL,
  window_start    TIMESTAMPTZ NOT NULL,
  count           INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_rate_limit_device_window
    UNIQUE (device_id, window_start)
);

-- Estado interno del backend: las claves públicas no pueden modificar contadores.
ALTER TABLE public.rate_limit_windows ENABLE ROW LEVEL SECURITY;

-- Índice de apoyo para queries por device_id
CREATE INDEX IF NOT EXISTS idx_rate_limit_device_window
  ON public.rate_limit_windows (device_id, window_start);

-- 2. (Opcional) Insertar fila de seed para un device de prueba
--    (Solo si hay necesidad de pre-seeds; normalmente el código inserta dinámicamente)

-- 3. Limpiar ventanas expiradas (para mantener el tamaño razonable)
--    Esto se ejecuta dentro del código cada vez que se consulta, no aquí.
