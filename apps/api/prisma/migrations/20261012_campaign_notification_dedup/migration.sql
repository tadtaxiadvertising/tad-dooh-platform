-- V12.1.4 (B4 PATCH): Deduplicación de notificaciones por caducidad de campañas
-- 1. Tabla notification_queue para cola de notificaciones con constraint única
-- 2. Tabla campaign_expirations para rastrear campañas que expirarán próximamente

-- Tabla de cola de notificaciones
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    entity_id VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message VARCHAR NOT NULL,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Constraint única para evitar duplicados
DO $notification_constraint$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.notification_queue'::regclass
          AND conname = 'notification_queue_unique'
    ) THEN
        ALTER TABLE public.notification_queue
        ADD CONSTRAINT notification_queue_unique UNIQUE (type, category, entity_id);
    END IF;
END
$notification_constraint$;

-- Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_notification_queue_sent ON public.notification_queue(sent);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON public.notification_queue(created_at);

-- Tabla de campañas que expirarán próximamente
CREATE TABLE IF NOT EXISTS public.campaign_expirations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id VARCHAR NOT NULL,
    advertiser_id VARCHAR NOT NULL,
    driver_id VARCHAR,
    remaining_days INTEGER NOT NULL,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for TIMESTAMP NOT NULL,
    notified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Constraint única para campaña
DO $campaign_constraint$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.campaign_expirations'::regclass
          AND conname = 'campaign_expiration_campaign_unique'
    ) THEN
        ALTER TABLE public.campaign_expirations
        ADD CONSTRAINT campaign_expiration_campaign_unique UNIQUE (campaign_id);
    END IF;
END
$campaign_constraint$;

-- Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_campaign_expirations_remaining_days ON public.campaign_expirations(remaining_days);
CREATE INDEX IF NOT EXISTS idx_campaign_expirations_scheduled_for ON public.campaign_expirations(scheduled_for);

-- Permite reintentar una ejecución parcial sin borrar tablas ni filas.
ALTER TABLE public.campaign_expirations
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Tablas internas: solo el backend privilegiado gestiona esta cola.
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_expirations ENABLE ROW LEVEL SECURITY;

-- Trigger para actualizar updated_at automáticamente
-- El cuerpo de la función usa un delimitador distinto al bloque del trigger.
CREATE OR REPLACE FUNCTION public.update_campaign_expirations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

DO $campaign_trigger$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.campaign_expirations'::regclass
          AND tgname = 'update_campaign_expirations_updated_at'
    ) THEN
        CREATE TRIGGER update_campaign_expirations_updated_at
        BEFORE UPDATE ON public.campaign_expirations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_campaign_expirations_updated_at();
    END IF;
END
$campaign_trigger$;

-- Consulta de migración para aplicar código genérico
SELECT '20261012_campaign_notification_dedup' AS migration_name, 1 as applied;
