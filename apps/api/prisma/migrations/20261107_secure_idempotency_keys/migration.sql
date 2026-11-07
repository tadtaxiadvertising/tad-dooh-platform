-- Restore the missing database-backed HTTP idempotency store.
-- The table does not exist in the inspected Supabase project on 2026-11-07.
-- New migration: do not rewrite old, historically failed Prisma migrations.
-- Prisma creates cuid() IDs client-side; therefore id is TEXT, not UUID.
-- request_hash verifies payload equality without storing request bodies.
CREATE TABLE "public"."idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "driverId" TEXT,
    "path" TEXT NOT NULL,
    "method" TEXT,
    "response" TEXT,
    "responseHeaders" TEXT,
    "request_hash" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "public"."idempotency_keys"("key");
CREATE INDEX "idempotency_keys_created_at_idx" ON "public"."idempotency_keys"("created_at");
CREATE INDEX "idempotency_keys_expires_at_idx" ON "public"."idempotency_keys"("expires_at");

-- Idempotency records are internal API bookkeeping. Never expose them
-- through PostgREST; authenticated clients interact through guarded Nest API.
ALTER TABLE "public"."idempotency_keys" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."idempotency_keys" FROM PUBLIC, anon, authenticated;
