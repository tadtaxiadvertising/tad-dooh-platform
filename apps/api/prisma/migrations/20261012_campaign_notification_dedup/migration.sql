-- V12.1.4 (B4 PATCH): Deduplicación de notificaciones por caducidad de campañas
-- 1. Tabla notification_queue para cola de notificaciones con constraint única
-- 2. Tabla campaign_expirations para rastrear campañas que expirarán próximamente

-- Tabla de cola de notificaciones
CREATE TABLE IF NOT EXISTS notification_queue (
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
ALTER TABLE notification_queue
ADD CONSTRAINT notification_queue_unique UNIQUE (type, category, entity_id);

-- Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_notification_queue_sent ON notification_queue(sent);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at);

-- Tabla de campañas que expirarán próximamente
CREATE TABLE IF NOT EXISTS campaign_expirations (
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
ALTER TABLE campaign_expirations
ADD CONSTRAINT campaign_expiration_campaign_unique UNIQUE (campaign_id);

-- Índices de ayuda
CREATE INDEX IF NOT EXISTS idx_campaign_expirations_remaining_days ON campaign_expirations(remaining_days);
CREATE INDEX IF NOT EXISTS idx_campaign_expirations_scheduled_for ON campaign_expirations(scheduled_for);

-- Agregar columna updated_at a campaign_expirations si no existe (postgres 12+ no soporta DEFAULT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaign_expirations' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE campaign_expirations ADD COLUMN updated_at TIMESTAMP;
    END IF;
END $$;

-- Trigger para actualizar updated_at automáticamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaign_expirations_updated_at'
    ) THEN
        CREATE OR REPLACE FUNCTION update_campaign_expirations_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER update_campaign_expirations_updated_at
        BEFORE UPDATE ON campaign_expirations
        FOR EACH ROW
        EXECUTE FUNCTION update_campaign_expirations_updated_at();
    END IF;
END $$;

-- Consulta de migración para aplicar código genérico
SELECT '20261012_campaign_notification_dedup' AS migration_name, 1 as applied;
