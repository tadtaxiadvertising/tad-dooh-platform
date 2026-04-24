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
  status TEXT DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('ACTIVE', 'PENDING_PAYMENT', 'SUSPENDED', 'OFFLINE')),
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
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OFFLINE', 'PENDING')),
  connectivity_status TEXT DEFAULT 'ONLINE',
  last_seen TIMESTAMPTZ,
  battery_level INTEGER DEFAULT 100,
  last_lat FLOAT,
  last_lng FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  entity_id UUID NOT NULL,
  note TEXT,
  reference_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCIONES Y TRIGGERS (Automatización Financiera V12)

CREATE OR REPLACE FUNCTION public.calculate_driver_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
    ads_count INTEGER;
    referrals_count INTEGER;
    total_balance DECIMAL;
    target_driver_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'active_ads' THEN
        IF TG_OP = 'DELETE' THEN target_driver_id := OLD.driver_id;
        ELSE target_driver_id := NEW.driver_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'drivers' THEN
        target_driver_id := NEW.referred_by;
    END IF;

    IF target_driver_id IS NULL THEN RETURN NEW; END IF;

    SELECT COUNT(*) INTO ads_count FROM public.active_ads WHERE driver_id = target_driver_id AND status = 'ACTIVE';
    IF ads_count > 15 THEN ads_count := 15; END IF;

    SELECT COUNT(*) INTO referrals_count FROM public.drivers WHERE referred_by = target_driver_id AND status = 'ACTIVE';

    total_balance := (ads_count * 500) + (referrals_count * 500);
    
    UPDATE public.drivers SET wallet_balance = total_balance, updated_at = NOW() WHERE id = target_driver_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Limpiar triggers antiguos para evitar duplicados
DROP TRIGGER IF EXISTS trigger_update_wallet_on_ads ON public.active_ads;
CREATE TRIGGER trigger_update_wallet_on_ads
AFTER INSERT OR UPDATE OR DELETE ON public.active_ads
FOR EACH ROW EXECUTE FUNCTION public.calculate_driver_wallet_balance();

DROP TRIGGER IF EXISTS trigger_update_wallet_on_referrals ON public.drivers;
CREATE TRIGGER trigger_update_wallet_on_referrals
AFTER INSERT OR UPDATE OR DELETE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.calculate_driver_wallet_balance();

-- 4. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- 5. SEED (ON CONFLICT DO NOTHING)
INSERT INTO public.profiles (email, role, full_name) 
VALUES ('admin@tadtaxi.do', 'ADMIN', 'TAD Super Admin')
ON CONFLICT (email) DO NOTHING;
