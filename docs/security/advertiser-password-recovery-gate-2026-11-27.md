# Advertiser password recovery: containment and re-enable gate

Baseline: ff47f7345017cd1b2e40ef22731cc0a12876312d; issue #603.

## Evidence and containment

The main advertiser login calls POST /advertisers/login, which uses the local advertiser password hash and issues an API-signed legacy session. The former POST /advertisers/recover-password signed a 15-minute JWT, discarded it, and claimed instructions had been sent. POST /advertisers/reset-password accepted a valid purpose=reset JWT repeatedly until expiry, with no durable consumption, current email check, or password version check. The login page displayed a delivery claim based only on HTTP success. No real reset tokens or accounts were inspected.

Both legacy endpoints now uniformly fail closed with HTTP 503 and ADVERTISER_PASSWORD_RECOVERY_UNAVAILABLE for well-formed requests. The login recovery view explains that automatic recovery is unavailable; no email has been sent, no credentials should be shared, and a new registration is not the recovery path. Ordinary login remains unchanged. Existing Supabase recovery routes are separate and unchanged; they do not prove that the local password hash has been changed.

The notification EmailService also has a mock-success mode when SMTP credentials are absent. Do not reuse that success signal for credential recovery. No live SMTP configuration or deliverability has been verified. This is containment, not implementation of real recovery.

## Required next implementation

Choose a single authoritative credential issuer and a migration/compatibility plan for existing local-only, OAuth, and dual-credential accounts. Do not silently replace local credentials by email match or provision an identity during recovery. Confirm ownership with the verified credential issuer and explicitly handle interrupted registrations and suspended accounts.

If a local reset path is retained, use a high-entropy opaque one-use token, store only its digest and bound account/version/expiry, and atomically consume it with the password update. Reject expired, reused, malformed, wrong-account and superseded tokens. Enforce password policy and revocation of outstanding legacy sessions; avoid logging tokens, passwords or raw provider errors. Uniform request responses must not disclose account existence. Rate limit abuse. Use an allowlisted portal origin, never caller-supplied host or redirect; disable referrer leakage. Require actual provider acceptance, not mock success, and distinguish acceptance from delivery. Verify a disposable account in staging through actual mail delivery, expiry, concurrent consumption, repeat reset, session invalidation, and role/tenant isolation. Avoid production mutations before explicit authorization.

At 10x load, use indexed digest/account lookups, bounded request rate, bounded retention and provider quota monitoring; no full Auth user scans on public recovery. Do not introduce a new dependency or migration until the credential design and staging verification plan have been reviewed.

This PR does not resolve legitimate account recovery. The 503 boundary is a deliberate availability trade-off for an already non-delivering legacy flow. Review any external consumer before rollout. Support-assisted identity verification requires an established support procedure; do not ask users to send passwords or reset tokens. Do not interpret an absent email as evidence of a nonexistent account.
