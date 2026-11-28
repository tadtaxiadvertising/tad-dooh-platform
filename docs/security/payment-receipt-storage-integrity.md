# Payment receipt storage integrity: next-stage design

Status: design only; no bucket, policy, data migration or external network request is authorized by this document.

## Evidence

PaymentIntentController accepts a URL and optional file descriptors; PaymentEvidenceService does not retrieve or authenticate bytes. The current version contract identifies a database row version, not file content. A replacement previously retained omitted descriptor values because Prisma skips undefined; this candidate clears those values explicitly and tests the real database result. Current media upload flow uses a public advertising bucket, not an appropriate location for private receipts.

## Required design before enabling verified-byte claims

- Dedicated private receipt storage with server-generated non-reusable object keys and strict size/type limits. Do not store financial receipts in the public advertising bucket.
- Authorize the uploader and associated payment; validate actual file bytes using bounded server-side reads of the known storage object, not arbitrary user URLs. Compute SHA-256 server-side; never trust caller-provided fileHash as verification. Prevent overwrites and enforce private read access. Do not introduce arbitrary outbound URL fetches.
- Bind immutable object identity and verified digest to the exact evidence version. Keep original bytes/audit history subject to retention requirements; do not silently overwrite or delete receipts.
- Review through short-lived authorized download links (or controlled API streaming); check identity, version and file content before allowing approval. Do not log signed links or sensitive metadata.
- Prove cross-account denial, wrong bucket/path denial, oversized/invalid files, overwrite attempts, mismatched bytes, stale reviews, retries and rollback using isolated fixtures. Existing unverified records require explicit reconciliation, not synthetic hashes or automatic approval.
- No production provisioning until #217/#627 recovery and authorized deployment gates are satisfied.

At 10x, stream bounded bytes outside database transactions, store only identity/digest and metadata in PostgreSQL, and preserve version-based compare-and-set. No new distributed system is required.
