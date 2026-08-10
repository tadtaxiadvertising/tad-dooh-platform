-- CreateTable
CREATE TABLE "social_post_drafts" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "copy" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_interaction_logs" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bot_response" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_post_drafts_status_idx" ON "social_post_drafts"("status");
