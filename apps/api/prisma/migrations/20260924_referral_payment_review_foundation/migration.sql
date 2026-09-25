-- TAD referral/payment review foundation
-- Creates auditable payment evidence, referral conversions and monthly commission batches.

CREATE TABLE IF NOT EXISTS "payment_evidence" (
  "id" TEXT NOT NULL,
  "payment_type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'DOP',
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "receipt_url" TEXT,
  "external_reference" TEXT,
  "submitted_by" TEXT,
  "reviewed_by" TEXT,
  "review_note" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "referral_conversions" (
  "id" TEXT NOT NULL,
  "referral_code" TEXT NOT NULL,
  "conversion_type" TEXT NOT NULL,
  "referrer_driver_id" TEXT NOT NULL,
  "referred_driver_id" TEXT,
  "referred_advertiser_id" TEXT,
  "payment_evidence_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_conversions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_evidence_reviews" (
  "id" TEXT NOT NULL,
  "payment_evidence_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_evidence_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commission_payout_batches" (
  "id" TEXT NOT NULL,
  "period_key" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "payout_date" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  CONSTRAINT "commission_payout_batches_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "commissions"
  ADD COLUMN IF NOT EXISTS "referral_conversion_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payout_batch_id" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_conversions_payment_evidence_id_key"
  ON "referral_conversions"("payment_evidence_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_conversions_referred_driver_id_key"
  ON "referral_conversions"("referred_driver_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_conversions_referred_advertiser_id_key"
  ON "referral_conversions"("referred_advertiser_id");
CREATE UNIQUE INDEX IF NOT EXISTS "commissions_referral_conversion_id_key"
  ON "commissions"("referral_conversion_id");
CREATE UNIQUE INDEX IF NOT EXISTS "commission_payout_batches_period_key_key"
  ON "commission_payout_batches"("period_key");
CREATE INDEX IF NOT EXISTS "payment_evidence_status_submitted_at_idx"
  ON "payment_evidence"("status", "submitted_at");
CREATE INDEX IF NOT EXISTS "payment_evidence_payment_type_status_idx"
  ON "payment_evidence"("payment_type", "status");
CREATE INDEX IF NOT EXISTS "referral_conversions_referrer_driver_id_status_idx"
  ON "referral_conversions"("referrer_driver_id", "status");
CREATE INDEX IF NOT EXISTS "referral_conversions_referral_code_idx"
  ON "referral_conversions"("referral_code");
CREATE INDEX IF NOT EXISTS "referral_conversions_conversion_type_created_at_idx"
  ON "referral_conversions"("conversion_type", "created_at");
CREATE INDEX IF NOT EXISTS "commissions_status_created_at_idx"
  ON "commissions"("status", "created_at");
CREATE INDEX IF NOT EXISTS "commissions_driver_id_status_idx"
  ON "commissions"("driver_id", "status");
CREATE INDEX IF NOT EXISTS "commission_payout_batches_status_payout_date_idx"
  ON "commission_payout_batches"("status", "payout_date");
CREATE INDEX IF NOT EXISTS "payment_evidence_reviews_payment_evidence_id_created_at_idx"
  ON "payment_evidence_reviews"("payment_evidence_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_conversions_payment_evidence_id_fkey') THEN
    ALTER TABLE "referral_conversions"
      ADD CONSTRAINT "referral_conversions_payment_evidence_id_fkey"
      FOREIGN KEY ("payment_evidence_id") REFERENCES "payment_evidence"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commissions_referral_conversion_id_fkey') THEN
    ALTER TABLE "commissions"
      ADD CONSTRAINT "commissions_referral_conversion_id_fkey"
      FOREIGN KEY ("referral_conversion_id") REFERENCES "referral_conversions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_evidence_reviews_payment_evidence_id_fkey') THEN
    ALTER TABLE "payment_evidence_reviews"
      ADD CONSTRAINT "payment_evidence_reviews_payment_evidence_id_fkey"
      FOREIGN KEY ("payment_evidence_id") REFERENCES "payment_evidence"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commissions_payout_batch_id_fkey') THEN
    ALTER TABLE "commissions"
      ADD CONSTRAINT "commissions_payout_batch_id_fkey"
      FOREIGN KEY ("payout_batch_id") REFERENCES "commission_payout_batches"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
