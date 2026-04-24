-- SQL Maestro para Supabase (TAD v12) - MIGRACIÓN INCREMENTAL
-- Optimizacion de Schema para Supabase Realtime, RLS y Lógica Financiera V12

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS NÚCLEO (IF NOT EXISTS)

-- Perfiles unificados
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'ADVERTISER', 'DRIVER')),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conductores (Drivers)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_plate TEXT UNIQUE NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  subscription_paid BOOLEAN DEFAULT FALSE,
  subscription_end TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDIENTE_PAGO' CHECK (status IN ('OPERATIVO', 'PENDIENTE_PAGO', 'BLOQUEADO', 'OFFLINE')),
  onboarding_status TEXT DEFAULT 'TOS_PENDING',
  referral_code TEXT UNIQUE DEFAULT uuid_generate_v4()::text,
  referred_by UUID REFERENCES public.drivers(id),
  wallet_balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la columna wallet_balance existe (por si la tabla ya existía sin ella)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='wallet_balance') THEN
        ALTER TABLE public.drivers ADD COLUMN wallet_balance DECIMAL(12,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='referred_by') THEN
        ALTER TABLE public.drivers ADD COLUMN referred_by UUID REFERENCES public.drivers(id);
    END IF;
END $$;

-- Dispositivos
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT UNIQUE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  taxi_number TEXT,
  status TEXT DEFAULT 'PENDIENTE_PAGO' CHECK (status IN ('OPERATIVO', 'BLOQUEADO', 'OFFLINE', 'PENDIENTE_PAGO')),
  connectivity_status TEXT DEFAULT 'ONLINE',
  last_seen TIMESTAMPTZ,
  battery_level INTEGER DEFAULT 100,
  last_lat FLOAT,
  last_lng FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetría (PostGIS habilitado)
CREATE TABLE IF NOT EXISTS public.telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  coords GEOGRAPHY(POINT, 4326) NOT NULL,
  speed FLOAT DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, timestamp) -- Evita duplicados exactos por reintentos
);
CREATE INDEX IF NOT EXISTS telemetry_coords_idx ON public.telemetry USING GIST (coords);
CREATE INDEX IF NOT EXISTS telemetry_driver_ts_idx ON public.telemetry (driver_id, timestamp DESC);

-- Campañas
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  budget DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'COMPLETED', 'REJECTED')),
  active BOOLEAN DEFAULT FALSE,
  target_city TEXT DEFAULT 'Global',
  target_all BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anuncios Activos
CREATE TABLE IF NOT EXISTS public.active_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ACTIVE',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, campaign_id)
);

-- Transacciones Financieras
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT CHECK (type IN ('INCOMING', 'OUTGOING')),
  category TEXT CHECK (category IN ('SUSCRIPCION', 'AD_REVENUE', 'OPEX_COMMISSION', 'OPEX_DRIVER_PAYOUT')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  net_amount DECIMAL(12,2) NOT NULL,
  entity_id UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT,
  reference_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCIONES Y TRIGGERS (Automatización Financiera V12 - Ledger Based)

/**
 * Actualiza el balance del wallet del conductor basado en transacciones completadas.
 * Garantiza que el balance sea la suma de su historial, no un conteo volátil.
 */
CREATE OR REPLACE FUNCTION public.handle_wallet_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar si la transacción se marca como COMPLETED
    IF (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status <> 'COMPLETED')) THEN
        IF NEW.type = 'INCOMING' THEN
            UPDATE public.drivers 
            SET wallet_balance = wallet_balance + NEW.net_amount,
                updated_at = NOW()
            WHERE id = NEW.entity_id;
        ELSIF NEW.type = 'OUTGOING' THEN
            UPDATE public.drivers 
            SET wallet_balance = wallet_balance - NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.entity_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/**
 * Sincroniza el estado de la suscripción del conductor cuando paga.
 */
CREATE OR REPLACE FUNCTION public.sync_subscription_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.category = 'SUSCRIPCION' AND NEW.status = 'COMPLETED') THEN
        UPDATE public.drivers 
        SET subscription_paid = true,
            subscription_end = NOW() + INTERVAL '1 year',
            status = 'OPERATIVO',
            updated_at = NOW()
        WHERE id = NEW.entity_id;
        
        -- También activar dispositivos asociados
        UPDATE public.devices
        SET status = 'OPERATIVO'
        WHERE driver_id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para transacciones
DROP TRIGGER IF EXISTS tr_wallet_update ON public.financial_transactions;
CREATE TRIGGER tr_wallet_update
AFTER INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_wallet_transaction();

DROP TRIGGER IF EXISTS tr_sync_subscription ON public.financial_transactions;
CREATE TRIGGER tr_sync_subscription
AFTER INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_on_payment();

-- 4. RLS — SHELTER C-A2: Políticas de Aislamiento de Tenant
-- ============================================================
-- NOTA: El backend NestJS usa SUPABASE_SERVICE_ROLE_KEY que bypasea RLS.
-- Estas políticas protegen acceso DIRECTO vía Supabase Client (frontends).
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ───────────────────────────────────────────────────
-- Cada usuario solo ve su propio perfil
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- ── DRIVERS ────────────────────────────────────────────────────
-- Conductores solo ven su propio registro; ADMIN ve todos
DROP POLICY IF EXISTS "drivers_select_own" ON public.drivers;
CREATE POLICY "drivers_select_own" ON public.drivers
  FOR SELECT USING (
    auth.uid() = id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS "drivers_update_own" ON public.drivers;
CREATE POLICY "drivers_update_own" ON public.drivers
  FOR UPDATE USING (
    auth.uid() = id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- Permitir INSERT para el registro público (signup)
DROP POLICY IF EXISTS "drivers_insert_public" ON public.drivers;
CREATE POLICY "drivers_insert_public" ON public.drivers
  FOR INSERT WITH CHECK (true);

-- ── DEVICES ────────────────────────────────────────────────────
-- Solo el conductor dueño o un ADMIN puede ver/modificar dispositivos
DROP POLICY IF EXISTS "devices_select_own" ON public.devices;
CREATE POLICY "devices_select_own" ON public.devices
  FOR SELECT USING (
    driver_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS "devices_update_own" ON public.devices;
CREATE POLICY "devices_update_own" ON public.devices
  FOR UPDATE USING (
    driver_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- ── CAMPAIGNS ──────────────────────────────────────────────────
-- Anunciantes solo ven sus propias campañas
DROP POLICY IF EXISTS "campaigns_select_own" ON public.campaigns;
CREATE POLICY "campaigns_select_own" ON public.campaigns
  FOR SELECT USING (
    advertiser_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS "campaigns_insert_own" ON public.campaigns;
CREATE POLICY "campaigns_insert_own" ON public.campaigns
  FOR INSERT WITH CHECK (
    advertiser_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS "campaigns_update_own" ON public.campaigns;
CREATE POLICY "campaigns_update_own" ON public.campaigns
  FOR UPDATE USING (
    advertiser_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

DROP POLICY IF EXISTS "campaigns_delete_own" ON public.campaigns;
CREATE POLICY "campaigns_delete_own" ON public.campaigns
  FOR DELETE USING (
    advertiser_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- ── FINANCIAL TRANSACTIONS ─────────────────────────────────────
-- Solo el dueño de la transacción o un ADMIN puede verla
DROP POLICY IF EXISTS "financial_tx_select_own" ON public.financial_transactions;
CREATE POLICY "financial_tx_select_own" ON public.financial_transactions
  FOR SELECT USING (
    entity_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- Solo ADMIN puede insertar transacciones (via backend service_role)
DROP POLICY IF EXISTS "financial_tx_insert_admin" ON public.financial_transactions;
CREATE POLICY "financial_tx_insert_admin" ON public.financial_transactions
  FOR INSERT WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- 5. SEED (ON CONFLICT DO NOTHING)
INSERT INTO public.profiles (email, role, full_name) 
VALUES ('admin@tadtaxi.do', 'ADMIN', 'TAD Super Admin')
ON CONFLICT (email) DO NOTHING;

