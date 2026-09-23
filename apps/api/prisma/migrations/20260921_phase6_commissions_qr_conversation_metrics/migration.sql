-- Phase 6/7: Commissions extension, Settlement, QR, Conversations, Leads, Referrals, Payments
-- CORRECTED 2026-09-23: aligned to schema.prisma @@map snake_case table names.
-- The original draft used PascalCase identifiers ("Commission", "PaymentIntent", ...)
-- which do NOT match the @@map'ed snake_case tables used in production.
-- Fully idempotent: safe to re-run.

-- =====================================================================
-- 1. SETTLEMENT BATCH  (schema: @@map("settlement_batches"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS settlement_batches (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "gross_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withholdings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referents_count" INTEGER NOT NULL DEFAULT 0,
    "commissions_count" INTEGER NOT NULL DEFAULT 0,
    "referents" JSONB,
    "commissions" JSONB,
    "generated_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settlement_batches_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE settlement_batches ADD CONSTRAINT "settlement_batches_period_key" UNIQUE ("period");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "settlement_batches_status_idx" ON settlement_batches("status");

-- =====================================================================
-- 2. COMMISSIONS - extend existing table (schema: @@map("commissions"))
--    Existing cols: id, driver_id, amount, source_type, status, created_at
-- =====================================================================
ALTER TABLE commissions
    ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
    ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "revoked_by" TEXT,
    ADD COLUMN IF NOT EXISTS "revocation_reason" TEXT,
    ADD COLUMN IF NOT EXISTS "reference" TEXT,
    ADD COLUMN IF NOT EXISTS "metadata" JSONB,
    ADD COLUMN IF NOT EXISTS "settlement_batch_id" TEXT;

DO $$ BEGIN
    ALTER TABLE commissions ADD CONSTRAINT "commissions_reference_key" UNIQUE ("reference");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE commissions ADD CONSTRAINT "commissions_settlement_batch_id_fkey"
        FOREIGN KEY ("settlement_batch_id") REFERENCES settlement_batches("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "commissions_driver_id_idx" ON commissions("driver_id");
CREATE INDEX IF NOT EXISTS "commissions_status_idx" ON commissions("status");
CREATE INDEX IF NOT EXISTS "commissions_source_type_idx" ON commissions("source_type");
CREATE INDEX IF NOT EXISTS "commissions_settlement_batch_id_idx" ON commissions("settlement_batch_id");

-- =====================================================================
-- 3. QR SCAN  (schema: @@map("qr_scans"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS qr_scans (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "qr_code" TEXT NOT NULL,
    "referrer_code" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_id" TEXT,
    "driver_id" TEXT,
    "converted" BOOLEAN NOT NULL DEFAULT FALSE,
    "lead_id" TEXT,
    CONSTRAINT "qr_scans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "qr_scans_qr_code_idx" ON qr_scans("qr_code");
CREATE INDEX IF NOT EXISTS "qr_scans_referrer_code_idx" ON qr_scans("referrer_code");
CREATE INDEX IF NOT EXISTS "qr_scans_scanned_at_idx" ON qr_scans("scanned_at");
CREATE INDEX IF NOT EXISTS "qr_scans_driver_id_idx" ON qr_scans("driver_id");
CREATE INDEX IF NOT EXISTS "qr_scans_lead_id_idx" ON qr_scans("lead_id");

-- =====================================================================
-- 4. CONVERSATION  (schema: @@map("conversations"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS conversations (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "platform" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "contact_phone" TEXT,
    "contact_name" TEXT,
    "lead_id" TEXT,
    "driver_id" TEXT,
    "advertiser_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "stage" TEXT NOT NULL DEFAULT 'INITIAL',
    "consent_given" BOOLEAN NOT NULL DEFAULT FALSE,
    "consent_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE conversations ADD CONSTRAINT "conversations_thread_id_key" UNIQUE ("thread_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "conversations_thread_id_idx" ON conversations("thread_id");
CREATE INDEX IF NOT EXISTS "conversations_lead_id_idx" ON conversations("lead_id");
CREATE INDEX IF NOT EXISTS "conversations_driver_id_idx" ON conversations("driver_id");
CREATE INDEX IF NOT EXISTS "conversations_advertiser_id_idx" ON conversations("advertiser_id");
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON conversations("status");
CREATE INDEX IF NOT EXISTS "conversations_stage_idx" ON conversations("stage");

-- =====================================================================
-- 5. CONVERSATION MESSAGE  (schema: @@map("conversation_messages"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS conversation_messages (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'TEXT',
    "meta_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE conversation_messages ADD CONSTRAINT "conversation_messages_conversation_id_fkey"
        FOREIGN KEY ("conversation_id") REFERENCES conversations("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_id_idx" ON conversation_messages("conversation_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON conversation_messages("created_at");

-- =====================================================================
-- 6. LEAD  (schema: @@map("leads"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS leads (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "source" TEXT,
    "referrer_code" TEXT,
    "referrer_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leads_referrer_code_idx" ON leads("referrer_code");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON leads("status");
CREATE INDEX IF NOT EXISTS "leads_type_idx" ON leads("type");

-- =====================================================================
-- 7. REFERRAL ATTRIBUTION  (schema: @@map("referral_attributions"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS referral_attributions (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referrer_code" TEXT NOT NULL,
    "first_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversion_at" TIMESTAMP(3),
    "conversion_type" TEXT,
    "commission_created" BOOLEAN NOT NULL DEFAULT FALSE,
    "commission_id" TEXT,
    "metadata" JSONB,
    CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE referral_attributions ADD CONSTRAINT "referral_attributions_lead_id_key" UNIQUE ("lead_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE referral_attributions ADD CONSTRAINT "referral_attributions_lead_id_fkey"
        FOREIGN KEY ("lead_id") REFERENCES leads("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "referral_attributions_referrer_id_idx" ON referral_attributions("referrer_id");
CREATE INDEX IF NOT EXISTS "referral_attributions_conversion_type_idx" ON referral_attributions("conversion_type");

-- =====================================================================
-- 8. PAYMENT INTENT  (schema: @@map("payment_intents"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "provider" TEXT,
    "reference" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "provider_ref" TEXT,
    "provider_data" JSONB,
    "lead_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE payment_intents ADD CONSTRAINT "payment_intents_reference_key" UNIQUE ("reference");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE payment_intents ADD CONSTRAINT "payment_intents_idempotency_key_key" UNIQUE ("idempotency_key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE payment_intents ADD CONSTRAINT "payment_intents_lead_id_fkey"
        FOREIGN KEY ("lead_id") REFERENCES leads("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "payment_intents_status_idx" ON payment_intents("status");
CREATE INDEX IF NOT EXISTS "payment_intents_lead_id_idx" ON payment_intents("lead_id");
CREATE INDEX IF NOT EXISTS "payment_intents_reference_idx" ON payment_intents("reference");

-- =====================================================================
-- 9. PAYMENT EVIDENCE  (schema: @@map("payment_evidence"), one-to-one)
-- =====================================================================
CREATE TABLE IF NOT EXISTS payment_evidence (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "payment_intent_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_hash" TEXT,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "review_note" TEXT,
    "metadata" JSONB,
    CONSTRAINT "payment_evidence_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE payment_evidence ADD CONSTRAINT "payment_evidence_payment_intent_id_key" UNIQUE ("payment_intent_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE payment_evidence ADD CONSTRAINT "payment_evidence_payment_intent_id_fkey"
        FOREIGN KEY ("payment_intent_id") REFERENCES payment_intents("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "payment_evidence_review_status_idx" ON payment_evidence("review_status");

-- =====================================================================
-- 10. PAYMENT VERIFICATION  (schema: @@map("payment_verifications"), one-to-one)
-- =====================================================================
CREATE TABLE IF NOT EXISTS payment_verifications (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "payment_intent_id" TEXT NOT NULL,
    "verified_by" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "amount_confirmed" DOUBLE PRECISION,
    "note" TEXT,
    "metadata" JSONB,
    CONSTRAINT "payment_verifications_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE payment_verifications ADD CONSTRAINT "payment_verifications_payment_intent_id_key" UNIQUE ("payment_intent_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE payment_verifications ADD CONSTRAINT "payment_verifications_payment_intent_id_fkey"
        FOREIGN KEY ("payment_intent_id") REFERENCES payment_intents("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 11. COMMISSION LEDGER  (schema: @@map("commission_ledger") — singular)
-- =====================================================================
CREATE TABLE IF NOT EXISTS commission_ledger (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "driver_id" TEXT NOT NULL,
    "commission_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "source_type" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "period" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,
    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE commission_ledger ADD CONSTRAINT "CommissionLedger_driver_id_period_reference_key"
        UNIQUE ("driver_id", "period", "reference");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "commission_ledger_driver_id_idx" ON commission_ledger("driver_id");
CREATE INDEX IF NOT EXISTS "commission_ledger_period_idx" ON commission_ledger("period");
CREATE INDEX IF NOT EXISTS "commission_ledger_status_idx" ON commission_ledger("status");

-- =====================================================================
-- 12. CONVERSION EVENT  (schema: @@map("conversion_events"))
-- =====================================================================
CREATE TABLE IF NOT EXISTS conversion_events (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "referrer_id" TEXT,
    "referrer_code" TEXT,
    "amount" DOUBLE PRECISION,
    "commission_amount" DOUBLE PRECISION,
    "idempotency_key" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE conversion_events ADD CONSTRAINT "conversion_events_idempotency_key_key" UNIQUE ("idempotency_key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "conversion_events_referrer_id_idx" ON conversion_events("referrer_id");
CREATE INDEX IF NOT EXISTS "conversion_events_type_idx" ON conversion_events("type");
CREATE INDEX IF NOT EXISTS "conversion_events_entity_id_idx" ON conversion_events("entity_id");

-- =====================================================================
-- 13. PLAYBACK EVENTS - verified column already exists in production.
--     Ensure schema-declared indexes exist.
-- =====================================================================
CREATE INDEX IF NOT EXISTS "playback_events_verified_idx" ON playback_events("verified");

-- Migration completed: Phase 6/7 models aligned to schema.prisma
