-- Restore existing-table scalar fields required by the current Prisma
-- models. Read-only inventory on 2026-11-07 confirmed 0 business rows in this
-- connected environment; no synthetic records are inserted.
--
-- EXPAND ONLY: no DROP, DELETE, renames, PK/FK type conversion or overrides
-- of commercial defaults/ledgers. Drivers/subscriptions contain PII and
-- financial metadata: review backup and staging restore before deployment.
--
-- A required valid_until column is added WITHOUT an arbitrary default.
-- If other environments contain subscription rows, the migration MUST fail
-- safely rather than invent a paid subscription's expiry date.

-- Fail before ANY DDL on a database with subscription records whose
-- required expiry dates would otherwise need a guessed financial backfill.
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'valid_until'
  ) AND EXISTS (SELECT 1 FROM "public"."subscriptions" LIMIT 1) THEN
    RAISE EXCEPTION
      'Existing subscriptions require reviewed valid_until backfill; migration halted before DDL';
  END IF;
END $;

ALTER TABLE "public"."devices"
  ADD COLUMN IF NOT EXISTS "is_simulated" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."drivers"
  ADD COLUMN IF NOT EXISTS "cedula" TEXT,
  ADD COLUMN IF NOT EXISTS "taxi_plate" TEXT,
  ADD COLUMN IF NOT EXISTS "subscription_paid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "subscription_end" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "onboarding_status" TEXT NOT NULL DEFAULT 'PENDING_AGREEMENT',
  ADD COLUMN IF NOT EXISTS "referred_by" TEXT,
  ADD COLUMN IF NOT EXISTS "password" TEXT,
  ADD COLUMN IF NOT EXISTS "level" TEXT NOT NULL DEFAULT 'BASE',
  ADD COLUMN IF NOT EXISTS "consecutive_months_under_goal" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "identidad_vehicular" JSONB,
  ADD COLUMN IF NOT EXISTS "hardware_config" JSONB,
  ADD COLUMN IF NOT EXISTS "insurance_accepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "insurance_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contract_accepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "contract_accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "agreement_version" TEXT,
  ADD COLUMN IF NOT EXISTS "is_simulated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "referral_code" TEXT,
  ADD COLUMN IF NOT EXISTS "bank_account" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "drivers_cedula_key"
  ON "public"."drivers"("cedula");
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_taxi_plate_key"
  ON "public"."drivers"("taxi_plate");
CREATE UNIQUE INDEX IF NOT EXISTS "drivers_referral_code_key"
  ON "public"."drivers"("referral_code");
CREATE INDEX IF NOT EXISTS "drivers_status_onboarding_status_idx"
  ON "public"."drivers"("status", "onboarding_status");

ALTER TABLE "public"."subscriptions"
  ADD COLUMN IF NOT EXISTS "device_id" TEXT,
  ADD COLUMN IF NOT EXISTS "valid_until" TIMESTAMP(3) NOT NULL,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_simulated" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "subscriptions_device_id_idx"
  ON "public"."subscriptions"("device_id");

ALTER TABLE "public"."driver_locations"
  ADD COLUMN IF NOT EXISTS "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "is_simulated" BOOLEAN NOT NULL DEFAULT false;

-- Deliberately excluded from this migration:
-- media.mimeType duplicates media.mime_type in Prisma; contract repair needed.
-- campaign_expirations has a different legacy shape (expiry_date) and requires
-- a separate reviewed model/data migration.
-- Existing UUID/TEXT key drift is not repaired by adding missing columns.
