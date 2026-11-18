# Security incident candidate: campaign coverage device-token exposure (2026-11-18)

**Risk:** P0 potential credential disclosure via authenticated advertiser API, plus cross-tenant coverage IDOR. Exploitation/production token presence **not established**.

## Reproduced code paths before patch

1. `GET /campaigns/:campaignId/devices` returned raw `Device` records for global campaigns (`prisma.device.findMany`) and explicit assignments (`deviceCampaign.findMany({ include: {device: true} })`). The active Prisma `Device` schema includes `authToken`, `lastLat`, `lastLng`, `driverId`, and operational telemetry.
2. The endpoint accepts `ADVERTISER` callers owning their campaign. Even with tenant ownership, the raw device credential and precise fleet data must **never** be sent to browsers.
3. `GET /campaigns/stats/:id/distribution` accepted an authenticated `ADVERTISER` but looked up the campaign name only, then read device assignments and returned taxi IDs/status/heartbeat without verifying campaign ownership.

These are code-path security flaws, not evidence that real credentials were read or abused.

## Minimal safe change

- Enforce campaign owner before any assignment/device DB read in distribution.
- Apply explicit Prisma `select` allowlist to every Device query used by campaign coverage (global, targeted driver, explicit device assignments, distribution V1/V2).
- Keep only `id`, `deviceId`, `taxiNumber`, `city`, `status`, `lastHeartbeat`, `lastSeen`, `lastSync`; never fetch or serialize `authToken`, precise GPS or driver identifiers in these APIs.
- Retain admin dashboard's campaign screen-list contract: it uses ID, taxi number, city, and sync/heartbeat dates. No schema migration or offline player change.
- Add Jest regression for cross-advertiser denial **before** device access, safe global and assigned-device projection, V1/V2 distribution paths, missing campaign behavior, and admin compatibility.

## Required incident response

- Confirm active API deployment SHA and routing. The merged code is not equivalent to deployed protection.
- Check **counts only** of active non-null device tokens, if approved read-only database inspection is available. Never print token values or auth headers.
- Audit access logs to the affected routes for unexpected callers and large fan-out; avoid logging personal device details.
- If device credentials could have been distributed, treat as compromise until reviewed: rotate **per-device** tokens in a controlled, monitored rollout with offline compatibility, revocation handling, and a documented reconnect path. Do **not** bulk-expire offline licenses or destroy stored creative content.
- Verify with authorized tenant A/B requests and synthetic devices that tenant A gets 403 for tenant B, own request omits secrets/precise GPS, and admin campaign list remains functional.
- Run `pnpm --filter api exec jest --runInBand src/modules/campaign/campaign-coverage-security.spec.ts`, full API build, staging smoke and fleet offline reconnect tests. Do not claim tests passed when GitHub Actions has zero-step failures (#147).

## Out of scope / follow-ups

- Existing public tablet playlist/device pairing routes remain under #233 and require separate review and token/provisioning gates.
- Finance approval containment #299 remains independent.
- Reconcile legacy rate used in distribution `monthly_revenue` with the confirmed offer model separately; do not change billing amounts in this security patch.
