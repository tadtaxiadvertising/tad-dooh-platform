-- TAD v12 Schema Sync Migration
-- Applies missing schema changes between DB and Prisma schema
-- Generated: 2026-04-24

-- ============================================================
-- STEP 1: Create SystemStatus enum if not exists
-- ============================================================
DO $$ BEGIN
    CREATE TYPE "SystemStatus" AS ENUM ('OPERATIVO', 'PENDIENTE_PAGO', 'BLOQUEADO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- STEP 2: Migrate devices.status to SystemStatus enum
-- ============================================================
DO $$ BEGIN
    -- Only run if column is not already the enum type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'devices'
          AND column_name = 'status'
          AND data_type = 'text'
    ) THEN
        -- Convert existing text values to enum-compatible values
        UPDATE "devices" SET status = 'OPERATIVO'      WHERE status IN ('ACTIVE', 'active', 'OPERATIVO');
        UPDATE "devices" SET status = 'PENDIENTE_PAGO' WHERE status IN ('PENDING', 'INITIAL', 'pending', 'PENDIENTE_PAGO');
        UPDATE "devices" SET status = 'BLOQUEADO'      WHERE status IN ('SUSPENDED', 'BLOCKED', 'BLOQUEADO');
        UPDATE "devices" SET status = 'OPERATIVO'      WHERE status NOT IN ('OPERATIVO', 'PENDIENTE_PAGO', 'BLOQUEADO');

        ALTER TABLE "devices" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "devices"
            ALTER COLUMN "status" TYPE "SystemStatus" USING status::"SystemStatus";
        ALTER TABLE "devices" ALTER COLUMN "status" SET DEFAULT 'OPERATIVO';
    END IF;
END $$;

-- ============================================================
-- STEP 3: Migrate drivers.status to SystemStatus enum
-- ============================================================
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'drivers'
          AND column_name = 'status'
          AND data_type = 'text'
    ) THEN
        -- Convert existing values
        UPDATE "drivers" SET status = 'OPERATIVO'      WHERE status IN ('ACTIVE', 'OPERATIVO');
        UPDATE "drivers" SET status = 'PENDIENTE_PAGO' WHERE status IN ('PENDING_PAYMENT', 'PENDING', 'INITIAL', 'PENDIENTE_PAGO');
        UPDATE "drivers" SET status = 'BLOQUEADO'      WHERE status IN ('SUSPENDED', 'BLOCKED', 'OFFLINE', 'BLOQUEADO');
        UPDATE "drivers" SET status = 'PENDIENTE_PAGO' WHERE status NOT IN ('OPERATIVO', 'PENDIENTE_PAGO', 'BLOQUEADO');

        ALTER TABLE "drivers" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "drivers"
            ALTER COLUMN "status" TYPE "SystemStatus" USING status::"SystemStatus";
        ALTER TABLE "drivers" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_PAGO';
    END IF;
END $$;

-- ============================================================
-- STEP 4: Create wallets table if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "available_balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "pending_withdrawal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "bank_info" JSONB,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallets_driver_id_key" ON "wallets"("driver_id");

-- Add foreign key constraint only if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'wallets_driver_id_fkey'
    ) THEN
        ALTER TABLE "wallets"
            ADD CONSTRAINT "wallets_driver_id_fkey"
            FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- STEP 5: Create active_ads table if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS "active_ads" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "active_ads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "active_ads_driver_id_campaign_id_key" ON "active_ads"("driver_id", "campaign_id");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'active_ads_driver_id_fkey'
    ) THEN
        ALTER TABLE "active_ads"
            ADD CONSTRAINT "active_ads_driver_id_fkey"
            FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- STEP 6: Create commissions table if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS "commissions" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "source_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'commissions_driver_id_fkey'
    ) THEN
        ALTER TABLE "commissions"
            ADD CONSTRAINT "commissions_driver_id_fkey"
            FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- STEP 7: Fix telemetry table columns if needed
-- ============================================================
-- First ensure PostGIS extension exists
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create telemetry table if not exists (correct schema)
CREATE TABLE IF NOT EXISTS "telemetry" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "battery" INTEGER NOT NULL DEFAULT 100,
    "network" TEXT NOT NULL DEFAULT '4G',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- Add coords column if missing (PostGIS geography type)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'telemetry'
          AND column_name = 'coords'
    ) THEN
        ALTER TABLE "telemetry" ADD COLUMN "coords" geography(Point, 4326);
    END IF;
END $$;

-- Drop legacy telemetry columns if they exist
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'telemetry' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE "telemetry" DROP COLUMN "latitude";
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'telemetry' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE "telemetry" DROP COLUMN "longitude";
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'telemetry' AND column_name = 'battery_level'
    ) THEN
        ALTER TABLE "telemetry" DROP COLUMN "battery_level";
    END IF;
END $$;

-- Add foreign key for telemetry if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'telemetry_driver_id_fkey'
    ) THEN
        ALTER TABLE "telemetry"
            ADD CONSTRAINT "telemetry_driver_id_fkey"
            FOREIGN KEY ("driver_id") REFERENCES "drivers"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- STEP 8: Add missing indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS "devices_status_idx" ON "devices"("status");
CREATE INDEX IF NOT EXISTS "drivers_status_idx" ON "drivers"("status");
CREATE INDEX IF NOT EXISTS "devices_connectivity_status_idx" ON "devices"("connectivity_status");

-- ============================================================
-- STEP 9: Add missing columns to drivers if not exists
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'wallet_balance'
    ) THEN
        ALTER TABLE "drivers" ADD COLUMN "wallet_balance" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE "drivers" ADD COLUMN "referral_code" TEXT UNIQUE DEFAULT gen_random_uuid()::text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'bank_account'
    ) THEN
        ALTER TABLE "drivers" ADD COLUMN "bank_account" JSONB;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'drivers' AND column_name = 'is_simulated'
    ) THEN
        ALTER TABLE "drivers" ADD COLUMN "is_simulated" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- ============================================================
-- STEP 10: Add missing columns to devices if not exists
-- ============================================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'connectivity_status'
    ) THEN
        ALTER TABLE "devices" ADD COLUMN "connectivity_status" TEXT NOT NULL DEFAULT 'ONLINE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'devices' AND column_name = 'is_simulated'
    ) THEN
        ALTER TABLE "devices" ADD COLUMN "is_simulated" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
