# Admin device routes compare hardware IDs to PostgreSQL UUID

**Date:** 2026-11-07  
**Status:** Draft code fix; staged integration pending.  
**Severity:** P1/P2 — administrative device operations fail for hardware identifiers.

## Root cause

Physical database column `devices.id` is PostgreSQL `uuid`; `devices.device_id` is `text`. Six admin routes in `DeviceAdminController` used this predicate:

`OR: [{ id: input }, { deviceId: input }]`

If `input` contains `TAD-0001` or another hardware ID rather than a valid UUID, PostgreSQL can reject the UUID comparison before the hardware-ID alternative matches. Consequences include failures while listing assigned campaigns, removing an assignment, deleting a device, fetching/updating its profile or queuing a FullyKiosk command.

## Smallest safe correction

Re-use the already-merged `deviceIdentityWhere()` function from the campaign module in all six admin lookups. It queries **only** `deviceId` for hardware strings and both ID fields for a syntactically valid UUID. No new parsing code, raw SQL, casts, migrations, financial changes or customer data alterations.

The existing helper already has unit tests. New controller tests cover hardware lookup for campaign assignment and command creation, plus compatibility for admin URLs containing UUIDs.

## Verification and risks

- [x] Read exact branch source: six out of six admin lookup call sites use the helper; zero old unsafe predicates remain.
- [x] Pure helper executed in isolated JS for hardware, colon-containing hardware, UUID and malformed UUID cases.
- [ ] Run NestJS Jest, Prisma client generation, strict TypeScript and authorized admin HTTP tests on staging.
- [ ] Verify six admin endpoints against a synthetic registered device in staging; verify command row uses database UUID, while hardware telemetry still uses `device_id`.
- [ ] Confirm no IDOR/regression in admin roles/permissions. This patch does not weaken `@Roles(ADMIN)` enforcement.
- [ ] Do not merge until CI runners (#147) and staging validations are available.

Other UUID-vs-hardware lookups outside `DeviceAdminController` should be audited separately; see #217. Empty production inventory is expected.
