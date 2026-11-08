# Command delivery was falsely ACKed before execution

**Date:** 2026-11-07  
**Status:** Draft fix, not deployed.  
**Severity:** P1 reliability and integrity of remote device control.

## Root cause

The Player received commands from `POST /device/sync` and immediately called `POST /device/command/:id/ack` for all commands, without awaiting `FullyKioskBridge.handleCommand()`. The callback returned `void` and discarded command failures. On the backend, `DeviceService.acknowledgeCommand()` accepted any request body and unconditionally updated the row to `EXECUTED`. A command whose kiosk action failed could thus be recorded as successful. The backend separately moves commands to `PROCESSING` before the HTTP sync response is delivered.

## Minimal safety correction

- `onCommands` now returns a promise with one `{id, success}` result per executed command, and sequentially awaits the kiosk action.
- The Player ACKs **only** successful outcomes whose IDs appeared in the received payload, and never ACKs merely on receipt.
- `FORCE_SYNC` is already fulfilled by the current full-sync handshake; it no longer launches a recursive duplicate request.
- `REBOOT` and `RESTART_APP` return an **unknown** outcome for ACK purposes even if the kiosk request was accepted, because the process may be terminated before execution is durably verifiable. They are not automatically replayed as part of this change.
- The ACK endpoint sends a minimal `{success:true}` receipt and explicitly checks HTTP success and `acknowledged=true`.
- The API rejects legacy `{result:{acknowledged:true}}` placeholders and all false/incomplete receipts; it only transitions `PROCESSING → EXECUTED` once. Duplicate identical success ACKs return an idempotent success; conflicting or invalid states return conflict. No untrusted payload is logged or persisted.
- Nest Jest and five dependency-free source-contract checks added, with a CI quality gate.

## Important unresolved dependencies

1. **Command recovery:** The server still marks commands `PROCESSING` *before* delivering a response. If that response is lost, the command may stay stranded. This patch does not claim exactly-once delivery. Issue #234 tracks an additive command-claim/receipt protocol, durable device receipts, reconciliation and bounded retries.
2. **Device provisioning:** Player currently has no provisioned `X-Device-Token` for protected ACK calls. The endpoint will reject those calls with 401 until secure pairing (#233) is implemented. **Do not** substitute the publicly obtainable OFFLINE_LICENSE token as a credential or disable `DeviceTokenGuard`.
3. **Reboot command outcomes:** After the kiosk acknowledges a restart request, the process may end before a server ACK. An unknown result must not be marked EXECUTED or blindly replayed, to avoid reboot loops.
4. **Offline-first:** Client cached media, queued proof-of-play events and downloaded assets must remain intact during transport/ACK failure.

## Required verification before merge

- Execute API Jest (ACK success, false/legacy body rejection, duplicate replay, conflicting-state rejection), Player TypeScript/build and standalone command contract.
- Run staging with real FullyKiosk mock, two devices and valid paired credentials; verify no ACK for failed commands and no cross-device ACK (#232).
- Simulate lost sync response, lost ACK response, simultaneous polls, Player restart and offline reconnect. Confirm command state remains conservative; do not automatically retry REBOOT.
- Verify all production command tables exist and migration #231 has been applied in the intended environment; do not seed business data in production.
- Recover CI runners (#147). No migration or production table write is part of this PR.

**Release state:** code prepared, integration unverified. Related #233/#234 and #217.
