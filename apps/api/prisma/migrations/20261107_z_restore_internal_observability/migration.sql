-- Restore two independent internal operational tables missing from the
-- connected Supabase project's public schema (read-only verified 2026-11-07).
-- Additive only: no existing balances, ledger, user or device data is changed.
-- Prisma @default(uuid()) is generated client-side; primary IDs remain TEXT.

CREATE TABLE "public"."system_errors" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "details" TEXT,
    "entity_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_errors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "system_errors_source_idx" ON "public"."system_errors"("source");
CREATE INDEX "system_errors_severity_idx" ON "public"."system_errors"("severity");
CREATE INDEX "system_errors_resolved_idx" ON "public"."system_errors"("resolved");
CREATE INDEX "system_errors_created_at_idx" ON "public"."system_errors"("created_at");

CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_read_idx" ON "public"."notifications"("read");
CREATE INDEX "notifications_category_idx" ON "public"."notifications"("category");
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");

-- The 20261012_campaign_notification_dedup migration is historically marked
-- applied but failed before producing this table. Restore its deduplicated
-- queue without replaying that broken migration's nested-DO SQL.
-- Prisma uses a client-generated String/UUID ID mapped to TEXT.
CREATE TABLE "public"."notification_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_queue_type_category_entityId_key"
    ON "public"."notification_queue"("type", "category", "entityId");
CREATE INDEX "notification_queue_sent_idx" ON "public"."notification_queue"("sent");
CREATE INDEX "notification_queue_created_at_idx" ON "public"."notification_queue"("created_at");

-- Internal API bookkeeping only. API roles must not be able to access the
-- raw error-details/notification tables through PostgREST.
ALTER TABLE "public"."system_errors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_queue" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."system_errors" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."notifications" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."notification_queue" FROM PUBLIC, anon, authenticated;
