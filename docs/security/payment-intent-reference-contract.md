# Payment intent reference contract (#623)

The administrative create endpoint treats a reference as a unique financial operation. A replay must match type, integer minor-unit amount, currency and lead ID (including absence). Nonfinancial metadata remains first-write-wins; the same HTTP Idempotency-Key retains the stricter existing request fingerprint. Different financial terms require a new reference and an explicit decision, never an automatic retry. A linked lead must match the payment category; this does not prove ownership.

The current MANUAL_TRANSFER provider generates local instructions without a remote charge. Its internal key is stable by reference. Concurrent unique conflicts reread the committed winner and compare financial terms; an unrelated uniqueness failure is not swallowed. New external providers must remain blocked until durable reservation, provider idempotency, crash recovery and reconciliation are implemented. Existing-reference replay is read-only. This is not bank confirmation, authorization to create real payment instructions in production, or an ownership fix.

No schema changes or production writes. Test with independent Prisma clients on the isolated PostgreSQL fixture. Release hold #631 remains.
