-- EXPAND only: no existing payment row is assigned or modified.
-- Keep admin-only access until authoritative assignment and authorization ship.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "payment_intent_owners" (
    "payment_intent_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "advertiser_id" UUID,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_intent_owners_pkey" PRIMARY KEY ("payment_intent_id"),
    CONSTRAINT "payment_intent_owners_exactly_one_owner" CHECK (
      ("driver_id" IS NOT NULL) <> ("advertiser_id" IS NOT NULL)
    ),
    CONSTRAINT "payment_intent_owners_assigned_by_nonblank" CHECK (
      length(btrim("assigned_by")) > 0
    ),
    CONSTRAINT "payment_intent_owners_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "payment_intent_owners_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "payment_intent_owners_advertiser_id_fkey" FOREIGN KEY ("advertiser_id") REFERENCES "advertisers"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE INDEX "payment_intent_owners_driver_id_idx" ON "payment_intent_owners"("driver_id");
CREATE INDEX "payment_intent_owners_advertiser_id_idx" ON "payment_intent_owners"("advertiser_id");

-- The ownership registry is backend-only; never trust client-side metadata.
ALTER TABLE "payment_intent_owners" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "payment_intent_owners" FROM PUBLIC, anon, authenticated;
COMMIT;
