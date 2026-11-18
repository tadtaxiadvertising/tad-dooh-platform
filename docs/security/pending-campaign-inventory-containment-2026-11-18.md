# Pending campaign inventory containment — 2026-11-18

**Status:** candidate branch; staging tests and deployment not verified.

## Root cause

Before this patch, `CampaignService.createCampaign(dto, user)` set new ADVERTISER campaigns to `status=PENDING_REVIEW` and `active=false`, but **after** the DB transaction still executed assignment planning:

- Used client-supplied `target_devices` or automatically chose devices from `target_city` and `budget`.
- Called `assignCampaignToDevices()`, which creates `PlaylistItem`, `DeviceCampaign`, `DeviceCommand(FORCE_SYNC)`, emits `WAKE_UP_CALL` and can notify drivers, without commercial approval or settled payment.
- Slot counts include device campaigns without filtering for paid/active state, so pending advertisers could reserve operational inventory prematurely.

The active player may still reject `PENDING_REVIEW` playback. **This incident is not proof that unapproved advertisements played**; the confirmed defect is premature assignment, notification and command dispatch risk.

## Smallest safe change

Immediately return the persisted campaign record when `result.status === "PENDING_REVIEW"`, BEFORE fleet optimization, explicit assignments, view refresh or realtime broadcasts. The draft/request remains visible for legitimate review. Admin `DRAFT` and `ACTIVE` paths preserve existing behavior to avoid changing the authorized admin planning flow.

No migration, data mutation, player command schema, offline storage or payment amounts change.

## Verification gate

Run `pnpm --filter api exec jest --runInBand src/modules/campaign/campaign-pending-inventory.spec.ts`, full API build and advertiser creation tests. New Jest tests cover explicit device IDs, automatic city targeting, active request staying unapproved, admin draft assignment and admin active distribution.

With synthetic staging data, assert that creating an advertiser campaign yields one `PENDING_REVIEW` row and **zero** `DeviceCampaign`, `PlaylistItem`, `DeviceCommand` and driver-notification changes; no realtime messages. Verify admin draft/edit/active compatibility. Review `PENDING_REVIEW` historical rows and any existing preassigned devices **read-only** before planning cleanup. Do not delete existing records or force an activation without reconciliation.

Release remains blocked by GitHub runner incident #147 until executable tests and deployment checks pass. Finance/inventory reconciliation and approval workflows remain open in #299 and #218. At 10× load, deferring unapproved device commands also avoids unnecessary per-device write amplification.

## Explicit non-goal

This change does **not** implement the future approved campaign publication workflow. Paid activation must be idempotent, evidence-backed and use a durable outbox with offline-safe reconciliation. Do not treat `status=APPROVED` on a portal request as payment evidence.
