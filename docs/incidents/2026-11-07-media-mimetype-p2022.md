# Prisma P2022: duplicate MIME mapping in Media

**Date:** 2026-11-07  
**Status:** Code correction proposed (draft PR); no database DDL or customer rows changed.  
**Priority:** P1 — media read/write availability.

## Evidence and cause

The production Postgres table `public.media` contains a single physical column `mime_type TEXT`, verified read-only. The old Prisma `Media` model declared **two independent fields**:
- `mime_type String? @map("mime_type")` — maps to the real column.
- `mimeType String?` — would require a separate, nonexistent quoted column `"mimeType"`.

Prisma's default `media.findMany()` can SELECT both fields, causing PostgreSQL `42703` / Prisma `P2022` even without media records. Many campaign, finance and sync media selections explicitly requested both fields. This is not a missing-data problem.

## Smallest safe fix

- Remove the redundant Prisma `mime_type` property and map the canonical `mimeType` property to the existing `mime_type` physical column.
- Keep code selecting/writing `mimeType`, now bound to the real PostgreSQL column.
- Remove invalid `mime_type: true` from Media selects in campaign/finance endpoints.
- Preserve the historical API field `mime_type` in the MediaService response by setting it to the canonical `media.mimeType`. The advertiser API's type construction uses the canonical value too.
- No migration, new physical column, trigger, data duplication, file deletion or media ingestion changes.
- Four isolated Node contract checks verify canonical mapping, selects, MIME writes and response alias.

## Release gates

1. Run `prisma validate` and `prisma generate`; confirm the generated client includes `Media.mimeType` and no `Media.mime_type` field.
2. Strict API TypeScript build and Jest tests, then media upload/list, campaign assignment, advertiser media response and finance report smoke tests on staging.
3. Verify `public.media.mime_type` remains a single column with original values, read/write by authenticated API role.
4. Confirm the advertiser UI that accepts both `mimeType` and `mime_type` handles unchanged responses. All changes must preserve privacy and offline video playback.
5. Repair remaining schema drift separately (#217). Do not create `media."mimeType"` as a fake fix.

**Known other errors:** `device_commands`, `device_heartbeats`, `videos` and other models still lack tables. Financial UUID/TEXT schema drift is independent of this MIME field repair.
