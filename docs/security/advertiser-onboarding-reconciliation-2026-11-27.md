# Advertiser onboarding: read-only reconciliation checkpoint

Issue [#603](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/603). Baseline main: 4e66309d2713c73c6c3bca2300c2cb80c468d44a. PR #606 passed the real Prisma/PostgreSQL integration with synthetic Auth.

## Operator contract

The [SQL diagnostic](sql/advertiser-onboarding-reconciliation-readonly.sql) is **not a migration, repair script, API endpoint, or scheduled task**. Run only in a new privileged, read-only session on an explicitly verified PostgreSQL 16+ target; the runner needs read permission for the four referenced tables. Prefer the isolated restored clone. Do not obtain new permissions for anonymous/authenticated roles. Do not publish raw query plans, receipts, keys, identifiers or emails. Use statement and lock timeouts as supplied; stop on an error. Do not wrap the script in another transaction.

It returns one aggregate JSON report for the latest 1,000 public-onboarding namespace reservations, with a truncation flag. A truncated report is not a complete audit. A zero count or empty sample is not proof of absence of orphans: legacy clients without keys are outside scope, and older records may be omitted. The time horizon is a triage threshold only; the query cannot distinguish rollback/compensation from a crash before Auth creation when the marker is still locked. Do not infer Auth identity existence from a lock. A new server-controlled `tad_onboarding_reservation` field in Auth app_metadata carries the namespaced reservation digest at identity creation, allowing correlation even when createUser acknowledgement is lost. This value is not a credential, may be visible to the user in claims, and must never authorize access or recovery. A unique match is evidence of a stored correlation, not proof of an orphan or ownership; recent operations may still be executing. Missing matches can mean no creation, compensation, legacy clients or metadata subsequently changed by privileged operations. At 10x load, measure the existing created_at-index plan in staging before introducing any additional index or expanding the sample.

| Category | Meaning / operator action |
| --- | --- |
| RECENT_LOCK_OUTCOME_UNKNOWN | May still be executing; no retry or deletion. |
| AGED_LOCK_OUTCOME_UNKNOWN | Requires privileged correlation with restricted logs and authoritative stores; age alone never unlocks. |
| RECENT_LOCK_AUTH_LINK_FOUND | One correlated identity; registration may still be in progress. |
| AGED_LOCK_AUTH_LINK_FOUND | One correlated identity; investigate without replay or deletion. |
| LOCKED_AUTH_LINK_AMBIGUOUS | Multiple correlated identities; stop and investigate. |
| LOCKED_WITH_UNEXPECTED_RECEIPT | Inconsistent state; inspect under incident procedure. |
| INVALID_PROTOCOL | Namespace record disagrees with route/method. |
| INVALID_COMMITTED_RECEIPT | Null, malformed, oversized, or structurally incomplete receipt. |
| BUSINESS_LINK_MISSING | Referenced advertiser or campaign missing. |
| CAMPAIGN_OWNER_MISMATCH | Campaign references a different advertiser. Treat as security/data-integrity incident. |
| AUTH_LINK_MISSING | Receipt Auth identifier not found. Investigate; never recreate blindly. |
| AUTH_LINK_MISMATCH | Server-controlled role or normalized email does not match. Investigate possible legitimate account changes; do not overwrite metadata. |
| LINKS_CONSISTENT | Referenced rows, ownership, email and role agree at snapshot time; **not** proof of confirmed email, session validity, commercial approval or payment. |

The query uses PostgreSQL 16 input validation before JSONB/UUID casts. An incompatible version or missing schema fails rather than silently returning a healthy report. The existing migration restricts idempotency table access; this query creates no new database object or privilege.

## Verification

The existing required Prisma integration gate now executes this exact SQL in the disposable PostgreSQL container, with a synthetic auth.users table. It covers missing Auth/business links, consistent links, role mismatch, malformed receipts, aged/recent locks, unexpected receipt, unrelated namespace exclusion and truncation. Exact-head CI pending. This does not exercise real Auth service behavior or guarantee production catalog parity. No live report or repair was run in this PR.

## Next gate

Staging verification with real Auth creation and metadata retention through later admin updates, authorized recovery, actual Auth email confirmation/delivery, explicit retention/abuse policy, and mandatory key rollout remain open. At 10x volume, profile the metadata correlation join; the query timeout remains the safety boundary. No new Auth schema index or grant is introduced. Never replay private receipts through an anonymous endpoint. Do not auto-unlock, delete Auth users, activate accounts, or change financial data based on this diagnostic.
