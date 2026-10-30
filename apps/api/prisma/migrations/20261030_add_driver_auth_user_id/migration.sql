-- Keep Prisma's Driver model aligned with the deployed PostgreSQL schema.
-- Nullable values preserve existing drivers and allow gradual Supabase Auth linking.
ALTER TABLE "drivers"
ADD COLUMN IF NOT EXISTS "auth_user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "drivers_auth_user_id_key"
ON "drivers"("auth_user_id");
