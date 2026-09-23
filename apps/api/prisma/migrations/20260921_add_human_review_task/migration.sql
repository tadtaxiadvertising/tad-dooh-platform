-- Add HumanReviewTask model for mandatory human approval before publishing to Meta Graph API
-- Idempotent version (2026-09-23): IF NOT EXISTS guards.
-- Table name matches schema @@map("human_review_tasks").

CREATE TABLE IF NOT EXISTS human_review_tasks (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "reviewer_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "human_review_tasks_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "human_review_tasks_status_idx" ON human_review_tasks("status");
CREATE INDEX IF NOT EXISTS "human_review_tasks_entity_id_entity_type_idx" ON human_review_tasks("entity_id", "entity_type");
CREATE INDEX IF NOT EXISTS "human_review_tasks_reviewer_id_idx" ON human_review_tasks("reviewer_id");

-- SocialPostDraft.status already accepts any string, PUBLISHED is valid. No DDL needed.
