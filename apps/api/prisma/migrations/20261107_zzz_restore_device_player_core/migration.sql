-- Restore core tablet/player tables whose Prisma models exist but whose
-- physical relations are absent in the connected Supabase project.
-- Additive recovery ONLY. No existing data, wallet, commission or media rows
-- are modified, and no failed historical migration is replayed.
--
-- Verified physical parent-key types (2026-11-07, information_schema):
--   public.devices.id         UUID
--   public.devices.device_id  TEXT
--   public.campaigns.id       UUID
-- Prisma's @default(uuid()) is client-generated; each new model's id is TEXT.
-- These physical FK types must be verified again on a staged restoration.

CREATE TABLE "public"."device_commands" (
  "id" TEXT NOT NULL,
  "device_id" UUID NOT NULL,
  "command_type" TEXT NOT NULL,
  "command_params" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "executed_at" TIMESTAMP(3),
  "result" TEXT,
  "expires_at" TIMESTAMP(3),
  CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_commands_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE
);

CREATE INDEX "device_commands_device_id_idx"
  ON "public"."device_commands"("device_id");
CREATE INDEX "device_commands_status_idx"
  ON "public"."device_commands"("status");
CREATE INDEX "device_commands_delivery_idx"
  ON "public"."device_commands"("device_id", "status", "expires_at");

CREATE TABLE "public"."device_heartbeats" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "battery_level" INTEGER,
  "storage_free" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_heartbeats_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "device_heartbeats_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "public"."devices"("device_id") ON DELETE CASCADE
);

CREATE INDEX "device_heartbeats_device_id_idx"
  ON "public"."device_heartbeats"("device_id");
CREATE INDEX "device_heartbeats_device_time_idx"
  ON "public"."device_heartbeats"("device_id", "timestamp");

CREATE TABLE "public"."videos" (
  "id" TEXT NOT NULL,
  "campaign_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "file_size" INTEGER,
  "mime_type" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qr_url" TEXT,
  "hash_md5" TEXT,
  CONSTRAINT "videos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "videos_campaign_id_fkey"
    FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE
);

CREATE INDEX "videos_campaign_id_idx"
  ON "public"."videos"("campaign_id");

-- Internal player controls and heartbeat telemetry must not become
-- directly reachable through the Supabase Data API. NestJS DB role writes.
ALTER TABLE "public"."device_commands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."device_heartbeats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."device_commands" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."device_heartbeats" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "public"."videos" FROM PUBLIC, anon, authenticated;
