-- Phase 6: Commissions, QR Scans, Conversations, Verified Metrics
-- Models: Commission (extended), SettlementBatch, QrScan, Conversation, ConversationMessage
-- Also adds: VerifiedMetrics uses existing PlaybackEvent with verified=true

-- =====================================================================
-- COMMISSION TABLE - Extended with new fields
-- =====================================================================
ALTER TABLE "Commission" 
ADD COLUMN IF NOT EXISTS "reference" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "settlement_batch_id" TEXT;

-- Add unique constraint on reference
DO $$ BEGIN
    ALTER TABLE "Commission" ADD CONSTRAINT "Commission_reference_key" UNIQUE ("reference");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add foreign key to SettlementBatch
DO $$ BEGIN
    ALTER TABLE "Commission" ADD CONSTRAINT "Commission_settlement_batch_id_fkey" 
    FOREIGN KEY ("settlement_batch_id") REFERENCES "SettlementBatch"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for Commission
CREATE INDEX IF NOT EXISTS "Commission_driverId_status_idx" ON "Commission"("driverId", "status");
CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status");
CREATE INDEX IF NOT EXISTS "Commission_reference_idx" ON "Commission"("reference");
CREATE INDEX IF NOT EXISTS "Commission_settlement_batch_id_idx" ON "Commission"("settlement_batch_id");

-- =====================================================================
-- SETTLEMENT BATCH TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "SettlementBatch" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "gross_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "withholdings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referents" JSONB NOT NULL DEFAULT '[]',
    "commissions" JSONB NOT NULL DEFAULT '[]',
    "adjustments" JSONB NOT NULL DEFAULT '[]',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementBatch_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on period
DO $$ BEGIN
    ALTER TABLE "SettlementBatch" ADD CONSTRAINT "SettlementBatch_period_key" UNIQUE ("period");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "SettlementBatch_status_idx" ON "SettlementBatch"("status");
CREATE INDEX IF NOT EXISTS "SettlementBatch_period_idx" ON "SettlementBatch"("period");

-- =====================================================================
-- QR SCAN TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "QrScan" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "qr_code" TEXT NOT NULL,
    "referrer_code" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_fingerprint" TEXT,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted" BOOLEAN NOT NULL DEFAULT FALSE,
    "lead_id" TEXT,
    "metadata" JSONB,
    CONSTRAINT "QrScan_pkey" PRIMARY KEY ("id")
);

-- Indexes for QR Scan
CREATE INDEX IF NOT EXISTS "QrScan_qr_code_idx" ON "QrScan"("qr_code");
CREATE INDEX IF NOT EXISTS "QrScan_referrer_code_idx" ON "QrScan"("referrer_code");
CREATE INDEX IF NOT EXISTS "QrScan_scanned_at_idx" ON "QrScan"("scanned_at");
CREATE INDEX IF NOT EXISTS "QrScan_ip_qr_24h_idx" ON "QrScan"("ip_address", "qr_code");
CREATE INDEX IF NOT EXISTS "QrScan_converted_idx" ON "QrScan"("converted");

-- =====================================================================
-- CONVERSATION TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "platform" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "stage" TEXT,
    "lead_type" TEXT,
    "referrer_code" TEXT,
    "consent_given" BOOLEAN NOT NULL DEFAULT FALSE,
    "consent_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on thread_id
DO $$ BEGIN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_thread_id_key" UNIQUE ("thread_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Conversation_platform_idx" ON "Conversation"("platform");
CREATE INDEX IF NOT EXISTS "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX IF NOT EXISTS "Conversation_contact_id_idx" ON "Conversation"("contact_id");
CREATE INDEX IF NOT EXISTS "Conversation_referrer_code_idx" ON "Conversation"("referrer_code");
CREATE INDEX IF NOT EXISTS "Conversation_assigned_to_idx" ON "Conversation"("assigned_to");

-- =====================================================================
-- CONVERSATION MESSAGE TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "ConversationMessage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'TEXT',
    "meta_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- Foreign key to Conversation
DO $$ BEGIN
    ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversation_id_fkey" 
    FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "ConversationMessage_conversation_id_idx" ON "ConversationMessage"("conversation_id");
CREATE INDEX IF NOT EXISTS "ConversationMessage_meta_message_id_idx" ON "ConversationMessage"("meta_message_id");
CREATE INDEX IF NOT EXISTS "ConversationMessage_created_at_idx" ON "ConversationMessage"("created_at");

-- =====================================================================
-- FINANCIAL TRANSACTION - Add reference column if not exists
-- =====================================================================
DO $$ BEGIN
    ALTER TABLE "FinancialTransaction" ADD COLUMN IF NOT EXISTS "reference" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "FinancialTransaction" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "FinancialTransaction" ADD COLUMN IF NOT EXISTS "provider_ref" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Indexes for idempotency
CREATE INDEX IF NOT EXISTS "FinancialTransaction_idempotency_key_idx" ON "FinancialTransaction"("idempotency_key");
CREATE INDEX IF NOT EXISTS "FinancialTransaction_reference_idx" ON "FinancialTransaction"("reference");

-- =====================================================================
-- LEAD TABLE (for referral attribution)
-- =====================================================================
CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL, -- ADVERTISER, DRIVER
    "source" TEXT, -- QR, WHATSAPP, ORGANIC, REFERRAL
    "referrer_code" TEXT,
    "referrer_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW', -- NEW, QUALIFIED, PAYMENT_PENDING, CONVERTED, REJECTED
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Lead_referrer_code_idx" ON "Lead"("referrer_code");
CREATE INDEX IF NOT EXISTS "Lead_status_idx" ON "Lead"("status");
CREATE INDEX IF NOT EXISTS "Lead_type_idx" ON "Lead"("type");

-- =====================================================================
-- REFERRAL ATTRIBUTION TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "ReferralAttribution" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referrer_code" TEXT NOT NULL,
    "first_contact_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversion_at" TIMESTAMP(3),
    "conversion_type" TEXT, -- DRIVER_SUBSCRIPTION, ADVERTISER_CAMPAIGN
    "commission_created" BOOLEAN NOT NULL DEFAULT FALSE,
    "commission_id" TEXT,
    "metadata" JSONB,
    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one attribution per lead
DO $$ BEGIN
    ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_lead_id_key" UNIQUE ("lead_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "ReferralAttribution_referrer_id_idx" ON "ReferralAttribution"("referrer_id");
CREATE INDEX IF NOT EXISTS "ReferralAttribution_conversion_type_idx" ON "ReferralAttribution"("conversion_type");

-- =====================================================================
-- PAYMENT INTENT TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "PaymentIntent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL, -- DRIVER_SUBSCRIPTION, ADVERTISER_CAMPAIGN
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DOP',
    "provider" TEXT, -- AZUL, MANUAL_TRANSFER, etc.
    "reference" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED', -- CREATED, REDIRECTED, PAID, FAILED, EXPIRED, REFUNDED
    "provider_ref" TEXT,
    "provider_data" JSONB,
    "lead_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_reference_key" UNIQUE ("reference");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_idempotency_key_key" UNIQUE ("idempotency_key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PaymentIntent_status_idx" ON "PaymentIntent"("status");
CREATE INDEX IF NOT EXISTS "PaymentIntent_lead_id_idx" ON "PaymentIntent"("lead_id");

-- =====================================================================
-- PAYMENT EVIDENCE TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "PaymentEvidence" (
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
    "review_status" TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, UNDER_REVIEW, PAYMENT_CONFIRMED, REJECTED
    "review_note" TEXT,
    "metadata" JSONB,
    CONSTRAINT "PaymentEvidence_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "PaymentEvidence" ADD CONSTRAINT "PaymentEvidence_payment_intent_id_fkey" 
    FOREIGN KEY ("payment_intent_id") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PaymentEvidence_payment_intent_id_idx" ON "PaymentEvidence"("payment_intent_id");
CREATE INDEX IF NOT EXISTS "PaymentEvidence_review_status_idx" ON "PaymentEvidence"("review_status");

-- =====================================================================
-- PAYMENT VERIFICATION TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "PaymentVerification" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "payment_intent_id" TEXT NOT NULL,
    "verified_by" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL, -- PAYMENT_CONFIRMED, REJECTED
    "amount_confirmed" DECIMAL(12,2),
    "note" TEXT,
    "metadata" JSONB,
    CONSTRAINT "PaymentVerification_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "PaymentVerification" ADD CONSTRAINT "PaymentVerification_payment_intent_id_fkey" 
    FOREIGN KEY ("payment_intent_id") REFERENCES "PaymentIntent"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PaymentVerification_payment_intent_id_idx" ON "PaymentVerification"("payment_intent_id");

-- =====================================================================
-- COMMISSION LEDGER TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "CommissionLedger" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "driver_id" TEXT NOT NULL,
    "commission_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "source_type" TEXT NOT NULL, -- DRIVER_REFERRAL, ADVERTISER_REFERRAL
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PAID, REVOKED
    "period" TEXT NOT NULL, -- YYYY-MM
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB,
    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- Unique on driver_id + period + reference
DO $$ BEGIN
    ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_driver_id_period_reference_key" 
    UNIQUE ("driver_id", "period", "reference");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "CommissionLedger_driver_id_idx" ON "CommissionLedger"("driver_id");
CREATE INDEX IF NOT EXISTS "CommissionLedger_period_idx" ON "CommissionLedger"("period");
CREATE INDEX IF NOT EXISTS "CommissionLedger_status_idx" ON "CommissionLedger"("status");

-- =====================================================================
-- HUMAN REVIEW TASK - already exists from previous migration
-- =====================================================================

-- =====================================================================
-- CONVERSION EVENT TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS "ConversionEvent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL, -- DRIVER_SUBSCRIPTION_PAID, ADVERTISER_CAMPAIGN_PAID, DRIVER_APPROVED
    "entity_id" TEXT NOT NULL, -- driverId, campaignId, etc.
    "entity_type" TEXT NOT NULL, -- DRIVER, CAMPAIGN
    "referrer_id" TEXT,
    "referrer_code" TEXT,
    "amount" DECIMAL(12,2),
    "commission_amount" DECIMAL(12,2),
    "idempotency_key" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_idempotency_key_key" UNIQUE ("idempotency_key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "ConversionEvent_referrer_id_idx" ON "ConversionEvent"("referrer_id");
CREATE INDEX IF NOT EXISTS "ConversionEvent_type_idx" ON "ConversionEvent"("type");
CREATE INDEX IF NOT EXISTS "ConversionEvent_entity_id_idx" ON "ConversionEvent"("entity_id");

-- =====================================================================
-- PLAYBACK EVENT - Ensure verified column exists
-- =====================================================================
DO $$ BEGIN
    ALTER TABLE "PlaybackEvent" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PlaybackEvent_verified_idx" ON "PlaybackEvent"("verified");
CREATE INDEX IF NOT EXISTS "PlaybackEvent_videoId_verified_idx" ON "PlaybackEvent"("videoId", "verified");
CREATE INDEX IF NOT EXISTS "PlaybackEvent_deviceId_verified_idx" ON "PlaybackEvent"("deviceId", "verified");

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================
-- Migration completed: Phase 6 models created