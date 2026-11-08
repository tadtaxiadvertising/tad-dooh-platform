# P1 public device registration ownership and status spoofing

**Date:** 2026-11-07  
**Status:** Implemented in isolated PR; integrated CI and staging pending.  
**Affected:** `POST /device/register` and `DeviceService.registerDevice()`.  
**Data scope:** The connected environment is intentionally empty; this does not indicate data loss.

## Root cause and impact

The route is `@Public()` and accepts a client-controlled `driver_id`. The old service:
- Created new devices immediately associated with that unverified `driver_id`; approving the pending device could preserve a fraudulent driver association.
- Used `prisma.device.update()` for existing device IDs and set `driverId: dto.driver_id ?? undefined`, `isOnline: true`, `lastSeen: now` and `appVersion` without authenticating the caller. An attacker with a device hardware ID could therefore rebind an existing tablet to a different driver or spoof its online telemetry/version.
- Returned success for both initial and repeated enrollment, so the public endpoint did not need to change response shape to be made immutable.

This is an authorization flaw visible in current source, not a claim of observed exploitation.

## Smallest safe correction

1. Reject any `driver_id` from public enrollment with `400`. Driver ownership must be assigned through an authenticated pairing/admin path only.
2. For an existing device, return only its hardware `deviceId` without mutating any row, whether active or pending.
3. On first contact, create a new device explicitly in `BUSINESS_RULES.STATUS.DEVICE.INITIAL`, with no `driverId`, and return only the `deviceId`.
4. Catch Prisma `P2002` unique races by re-reading the already registered hardware identity without changing it; propagate other errors.
5. Reject empty hardware IDs and cap their input length to 128 characters. Throttle the public endpoint to 5 requests/minute per existing NestJS throttle configuration.
6. Add focused Jest cases for driver hijack, immutable re-registration, pending creation, race and error propagation.

## Explicit remaining work

- Public initial enrollment still allows an attacker to register another device's hardware ID before it legitimately pairs (squatting). It remains **PENDING** and cannot obtain active playback privileges through this route. Fully secure one-time/admin-authorized pairing must be delivered under #233 before connecting actual tablets.
- Public `POST /device/heartbeat` and `POST /device/playback` are separately exploitable spoofing surfaces and need authenticated telemetry protocol design. Do not treat the enrollment change as complete device authentication.
- The Player cannot yet authenticate to guarded `POST /device/sync` and ACK without provisioned credentials. Do not turn off guards to hide 401.
- `device_commands`, `device_heartbeats` and `videos` are merged as migration code in #231 but were not yet applied in the connected DB at last verification.

## Verification / release gates

- [x] Five isolated exact-method behavioral tests with mocked Prisma: all passed.
- [ ] Execute NestJS Jest and strict TypeScript in a real monorepo checkout.
- [ ] Run staging device registration/re-registration and assert unchanged `driverId`, `isOnline`, `lastSeen`, `appVersion` for a pre-existing ACTIVE tablet.
- [ ] Verify `P2002` concurrency test and API 400 error for attempted driver assignment.
- [ ] Test request throttling, DTO validation and correct pending status.
- [ ] Review non-destructive rollback (revert application version only). No schema migration.
- [ ] Merge/deploy only after real CI/staging evidence; GitHub Actions runners remain unavailable (#147).

Related: #233 secure tablet provisioning, #234 command delivery receipt/ACK, #217 schema parity.
