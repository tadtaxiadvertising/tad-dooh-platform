-- Add HumanReviewTask model for mandatory human approval before publishing to Meta Graph API
-- Also adds PUBLISHED status to SocialPostDraft

-- Create human_review_tasks table
CREATE TABLE "human_review_tasks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
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
CREATE INDEX "human_review_tasks_status_idx" ON "human_review_tasks"("status");
CREATE INDEX "human_review_tasks_entity_id_entity_type_idx" ON "human_review_tasks"("entity_id", "entity_type");
CREATE INDEX "human_review_tasks_reviewer_id_idx" ON "human_review_tasks"("reviewer_id");

-- Update SocialPostDraft to allow PUBLISHED status (no schema change needed, just validation)
-- The status field already accepts any string, so PUBLISHED is valid

-- Migration completed: HumanReviewTask table created