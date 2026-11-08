# Tablet authorization: cross-device IDOR in DeviceTokenGuard

**Date:** 2026-11-07  
**Severity:** P1 — token-protected device ownership bypass risk.  
**Status:** Code fix on independent draft PR; no production rollout.

## Evidence → root cause

`DeviceTokenGuard` verified a JWT with a `deviceId` claim, checked that **that** device was active, then passed the request downstream without checking whether the incoming body/query/header/path referred to another device.

Affected guarded routes include:
- `POST /device/sync` (`body.deviceId`)
- `POST /device/bulk-sync` (`body.device_id`)
- `GET /assets/manifest` (`query.device_id`)
- `POST /device/command/:id/ack` (command ownership already validated by `getCommandForDevice`; `params.id` is a **command** ID, not a device ID)

A valid token for device A could therefore reach downstream device-B queries. The guard's own active-status check did not enforce ownership of the requested resource.

## Minimum safe correction

- Immediately after token verification, compare **every provided** device identity in `x-device-id`, camelCase/snake_case body, camelCase/snake_case query and `params.deviceId` to the authenticated claim.
- Mismatch or non-string identity (array/object) returns `403` before a DB lookup.
- Keep command `params.id` out of this comparison; ACK route has its own command ownership verification.
- No database DDL, token format migration, JWT secret changes, client-side offline cache changes or global auth bypass.
- Add guard-level Jest tests and Node 22 no-dependency tests for ownership/conflicting inputs. Wire standalone tests to CI.

## Limitations requiring separate engineering

- The Player currently does **not** send `X-Device-Token` with `POST /device/sync` or command ACK. These guarded routes return `401` for that client; adding a **safe provisioned-device credential exchange** is a separate dependency, not an excuse to remove `DeviceTokenGuard` or make sync public.
- `GET /sync/:deviceId` remains marked `@Public`. That route's manifest and offline JWT delivery must be redesigned with verified pairing/ownership before production with real creatives. Do not ship a general-purpose unauthenticated token mint endpoint.
- The guard accepts any JWT signed by `JWT_SECRET` with a matching `deviceId`, without a dedicated device-audience/type constraint. A future signed device token should have `iss`, `aud`, `sub`, expiry, revocation and provisioning policy distinct from media playback authorization.
- This patch is scoped to existing guarded endpoints and does **not** imply that end-to-end device authentication has been established.

## Release gates

1. Run NestJS Jest for token-mismatch and active-status cases; verify no `403`/ownership regressions on matching legitimate requests.
2. Run API TypeScript strict build, relevant device sync tests and Node 22 `--experimental-strip-types --test` contract.
3. Test a device-A token against device-B sync, bulk-sync, asset query and conflicting header; expect `403` and no side effect. Device A continues normally when properly authenticated.
4. Verify DeviceTokenGuard has no bypass for malformed claim or token and no new JWT/identity values appear in logs.
5. Resolve separate bootstrap credential/ACK protocol before claiming tablet synchronization works at 10x devices. Preserve offline playback/cache on network failure.
6. Only merge after CI and staging checks; GitHub Actions runners are presently blocked (#147).

**No production data changes.** Empty business inventory is expected and not an incident.
