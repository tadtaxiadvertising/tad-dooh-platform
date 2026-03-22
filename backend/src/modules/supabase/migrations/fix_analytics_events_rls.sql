-- ============================================================
-- TAD DOOH — Supabase RLS Fix para analytics_events
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Asegurarse de que la tabla exista con la estructura correcta
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         BIGSERIAL PRIMARY KEY,
  event_type TEXT         NOT NULL,
  device_id  TEXT         NOT NULL DEFAULT 'UNKNOWN',
  event_data JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS (si no está activo)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 3. Política de INSERT para anon (browser/dashboard sin auth)
--    Permite que el dashboard admin inserte eventos de telemetría.
--    Todos pueden insertar, nadie puede leer sin auth.
DROP POLICY IF EXISTS "allow_anon_insert_analytics" ON public.analytics_events;
CREATE POLICY "allow_anon_insert_analytics"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Política de SELECT solo para usuarios autenticados (admins)
DROP POLICY IF EXISTS "allow_authenticated_read_analytics" ON public.analytics_events;
CREATE POLICY "allow_authenticated_read_analytics"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Verificar que las políticas están activas
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'analytics_events';
