-- Restore the SystemSetting model's missing table without touching existing data.
-- Production diagnosis 2026-11-07:
-- _prisma_migrations had 18 completed entries, but public.system_settings did not exist.
-- Match apps/api/prisma/schema.prisma exactly: Prisma uuid() is a client-side
-- String default, so id is TEXT (not PostgreSQL UUID).
-- This migration is intentionally additive and does not seed financial values.

CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STRING',
    "group" TEXT NOT NULL DEFAULT 'GENERAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- This is an internal administration table. Do not expose it via Supabase
-- Data API, even when public is an exposed schema.
ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."system_settings" FROM PUBLIC, anon, authenticated;
