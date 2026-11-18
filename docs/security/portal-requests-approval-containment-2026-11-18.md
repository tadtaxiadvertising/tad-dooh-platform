# PortalRequests approval containment — 2026-11-18

**Status:** code proposed in isolated branch, NOT verified in running production.  
**Severity:** P0 potential / financial and publishing integrity.  
**Tracking:** [#299](https://github.com/tadtaxiadvertising/tad-dooh-platform/issues/299).

## Observed root cause (current main prior to this branch)

`PortalRequestsService.update()` previously wrote `APPROVED` first, then triggered unverified, non-transactional side effects:

- `PAYOUT`: incremented an aggregate `PayrollPayment.amount` and marked `PAID` without bank settlement evidence or permanent per-request ledger.
- `CAMPAIGN_CREATE`: created a campaign directly as `ACTIVE`, used a simulated `budget: 1000`, then assigned/synced devices without confirming payment.
- `CONTENT_UPDATE` / campaign-linked requests: reactivated campaigns and queued `FORCE_SYNC` repeatedly on admin retries. Broadcast failures and media writes were swallowed.
- A second approval or a crash after the first write could leave a partially executed, falsely successful workflow.

No real duplicate payout or user impact has been established; this is a code-path risk.

## Phase 1 — fail-closed containment

The `PUT /portal-requests/:id` endpoint:

1. **Refuses `APPROVED`** with HTTP 409 when `type !== GENERAL` or when the request has any campaign reference. No financial, publishing or device command side effect is attempted. Rejecting a pending request remains available.
2. Allows pure `GENERAL` requests with no campaign reference to reach `APPROVED` as an *administrative state only*; no playback or payout action is implied.
3. Performs terminal transitions with a database compare-and-set `updateMany(where: { id, status: "PENDING" })`. Concurrent/repeated decisions yield one success and subsequent HTTP 409 responses. Terminal states are not reopened.
4. Allows editing `adminNotes` without triggering state transitions.
5. Removes the legacy side-effect approval handler and its `SupabaseService` dependency from this service, without changing device queue/telemetry/offline storage.
6. Disables unsafe approve buttons in the admin requests UI and removes the incorrect “content deployed” success alert.

**Trade-off:** campaign/media/payout requests can be submitted, inspected and rejected, but cannot be automatically approved through this legacy route. Do not bypass this API gate via a frontend-only toggle, direct SQL or temporary role elevation.

## Verification and rollout gates

- Local Jest mocks: `portal-requests-approval.spec.ts` covers blocked payout/campaign/content approvals, CAS predicate, retries, two mocked concurrent admin decisions, rejection, notes, invalid status and unknown ID.
- Existing ownership/controller tests are still required, plus `pnpm --filter api run build` and `pnpm --filter admin run build`. CI must execute; a code commit alone does not establish passing tests.
- Review side-effect consumers and `PortalRequest` audit history using **read-only** database access. Check `REQ-<id>` / `UPG-<id>`, payroll sums, provider disbursement identifiers, campaign activation and tablet commands; do not print PII or secrets.
- Deploy the API **first**; confirm unsafe approval receives 409 with no row/status/ledger/device change and safe `GENERAL` approve is terminal. Deploy admin UI after API. Ensure browser/API compatibility and no misreported successful publication.
- Observe status transition counters, conflicts, failed requests and operational manual-review backlog. Never infer the active deployment from a Railway service name alone.
- No schema migrations, destructive writes, finance adjustments or offline changes are included in phase 1.

## Phase 2 — permanent workflows (not implemented here)

Before re-enabling commercial approval, establish all of the following on a staging restore with concurrency and crash tests:

1. Authenticated, authorized request claim with durable `PENDING → PROCESSING → APPROVED/FAILED_RETRYABLE` semantics and transactional idempotency keyed by `PortalRequest.id`.
2. Immutable monetary ledger source reference unique per payout request; verified entitlement/balance and payment-provider settlement evidence; never mark `PAID` before provider acknowledgement and reconciliation.
3. One-time campaign creation keyed to request ID with verified payment, correct pricing contract (RD$2,500 base; 40% verified driver referral discount where eligible), and review of targeting before making content active.
4. Local transaction for business mutations and durable outbox for player sync, idempotent per-device delivery, retry/ACK handling and offline-first reconciliation.
5. Bounded 10× loading, dispute/audit trail preservation, real recovery from failure between DB commit and external dispatch, and documented rollback procedures.
6. Additive `EXPAND → MIGRATE → CONTRACT` database changes only after schema drift #217 and finance pricing #218 are reconciled.

**Do not close issue #299 after phase 1**. This is a containment that reduces exposure, not a fully reconciled financial or playback workflow.
