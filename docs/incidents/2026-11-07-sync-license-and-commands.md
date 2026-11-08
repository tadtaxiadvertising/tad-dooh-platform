# Incident: sync manifests incorrectly cached / offline license renewal and commands lost

**Date:** 2026-11-07  
**Status:** Implemented on draft branch; no production deployment in this work.  
**Severity:** P1 availability/authorization for registered TAD tablets.  
**Inventory:** Empty tables are expected at this project stage; **zero campaign/device rows are not an error**. Historical inventory reconciliation issue #227 was closed as not planned.

## Evidence → root cause

1. `SyncController.getDeviceManifest` held an in-memory 5-minute ETag map and responded HTTP **304 before calling SyncService**. It could skip validation after a device was disabled or a subscription expired. A media-content hash is not evidence that a signed JWT remains valid.
2. `SyncManager.executeManifestSync` returned on matching media ETag **before persisting the newly issued offline license**.
3. `DeviceService.syncDeviceCampaigns` returned `update:false` for equal hashes or `update:true, media_assets:[]` for empty campaigns **without a license token or pending remote commands**.
4. That same backend marked `device_commands` as `PROCESSING` before the early return, so the command could disappear from subsequent syncs while never appearing in the response.
5. `SyncManager.executeFullSync` also returned on `!payload.update` before handling commands and renewing the offline token.
6. When a device was server-blocked, the player activated the kill switch but did not clear its persisted offline license. A restart while offline could incorrectly reuse the old token until expiry.
7. `CampaignService.getActiveSyncVideos` used `OR: [{id: deviceIdOrUuid}, {deviceId: deviceIdOrUuid}]` even for hardware names such as `TAD-0001`. The physical `devices.id` is UUID, so a malformed UUID string comparison can throw PostgreSQL input-syntax errors before the hardware branch matches.

## Smallest safe code repair

- Rebuild each manifest after validating device/subscription, always return its currently valid signed token with `Cache-Control: private, no-store`; media hashes remain available for client delta comparison but **no premature HTTP 304**.
- Renew the backend's 48h offline JWT for every **approved** device `/device/sync` handshake (matching hash, empty media, or changed media). Return remote commands on every branch. Pending/unregistered/blocked devices receive no signed license.
- The player persists a new JWT and receives remote commands **before** its unchanged-media early return; it does not redownload cached assets unnecessarily.
- Blocked/deactivated/unknown device responses revoke the persisted offline license and activate the existing kill switch without erasing cached media files.
- Parse command parameters **before** changing command statuses, so invalid JSON cannot silently mark an undispatched command as PROCESSING.
- Resolve device identity with a UUID-format guard: hardware IDs query only `device_id`, canonical UUIDs query both DB and hardware identifiers. Unit tests cover both shapes.
- Add 4 Jest tests for API controller, 4 for device sync and 5 dependency-free structural contract tests; register contracts in CI Quality Gates.

## Explicit scope and remaining risks

- `device_commands`, `device_heartbeats`, `videos` still do **not** exist in connected production DB. Fixing code alone will not make registered approved devices fully functional. A separate staged schema recovery is required after reconciling physical UUID/TEXT parent-key mismatches; do not silently skip these model relations.
- Command delivery remains a `PROCESSING` lifecycle (no persistent ACK lease / retry timeout). A network failure after the backend commits PROCESSING but before the response arrives may still strand a command. This needs a dedicated ACK/retry redesign with device-side command-id dedupe, especially for non-idempotent REBOOT commands. Do not blindly resend reboot commands.
- `GET /sync/:deviceId` is marked `@Public` in the existing API while the client currently fetches without an auth header. Device token authorization requires a separately reviewed registration/credential exchange protocol to avoid breaking deployed tablets; do not rely on the public route for secrets long term.
- The 34 missing Prisma columns/mapping mismatches and remaining missing models are tracked under schema drift #217. No financial or other data should be created just to make dashboards non-empty.

## Verification before deployment

1. Run `pnpm --filter api test --runInBand`, `tsc --noEmit`, Prisma generate/validate, player `pnpm build`, and `node --test apps/api/scripts/sync-renewal.contract.test.cjs`.
2. Staging tests: approved device empty media, changed media and identical hash; assert new JWT `expiresAt` each time, no unnecessary CDN download, correct commands returned. Simulate command parameters invalid; it must remain PENDING.
3. Simulate paid→unpaid, approved→deactivated, unknown devices across a repeated ETag and assert correct 402/403/404 and offline token revocation. Cached media must remain intact but unplayable without authorization.
4. Verify End-to-end `/device/sync` only after restoring missing command, heartbeat and video tables with a validated staging migration. Exercise offline→reconnect at 10x devices and ensure signed license refresh does not saturate the PostgreSQL pool.
5. Restore CI runner access (#147). Reconcile missing schema fields (#217) and release only after a staging smoke test with synthetic data.

**Rollback:** revert the API/Player application images; no DDL or persistent customer data modifications are in this PR.
