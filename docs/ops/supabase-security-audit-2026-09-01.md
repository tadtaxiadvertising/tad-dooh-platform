# Supabase Security Audit — Fixes Applied

**Date:** 2026-09-01
**Project:** TAD DOOH Platform (`ltdcdhqixvbpdcitthqf`)
**Trigger:** `rls_disabled_in_public` advisory on `public.spatial_ref_sys`

---

## TL;DR

| Severity | Count | Status |
|---|---|---|
| ERROR | 1 | Pending Supabase support (spatial_ref_sys) |
| WARN | 14 | 8 fixed, 6 pending (4 require Supabase support, 2 require user action) |
| INFO | 33 | Intentional deny-by-default (no fix applied) |

---

## Fixes Applied

### 1. Function search_path locked (5 functions) — FIXED

**Advisory:** `function_search_path_mutable` (WARN × 5)
**Migration:** `lock_function_search_paths`
**Why:** Locks `search_path = pg_catalog, public` on business-logic functions to prevent search_path injection if a future user creates shadow objects.

Functions patched (triggers preserved):
- `public.activate_driver_on_payment()` — trigger `tr_activate_driver_on_payment` on `financial_transactions`
- `public.calculate_driver_wallet_balance()` — triggers on `active_ads` + `drivers`
- `public.handle_wallet_transaction()` — trigger `tr_wallet_update` on `financial_transactions`
- `public.refresh_active_campaigns()` — called by cron/manual
- `public.sync_subscription_on_payment()` — trigger `tr_sync_subscription` on `financial_transactions`

Verified: `proconfig = {"search_path=pg_catalog, public"}` on all 5. Triggers intact.

### 2. st_estimatedextent EXECUTE revoked — FIXED

**Advisory:** `anon_security_definer_function_executable` + `authenticated_security_definer_function_executable` (WARN × 6)
**Action:** `REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(...) FROM anon, authenticated`
**Why:** `st_estimatedextent` is a deprecated PostGIS function (2009-era, replaced by `st_estimateext`). SECURITY DEFINER + world-executable is a textbook privilege escalation vector. Nobody in this project calls it — the device/player app only uses PostGIS via `ST_Distance`, `ST_DWithin`, etc.

Verified: `pg_proc.proacl` for all 3 overloads now shows only `supabase_admin=X/supabase_admin`.

⚠️ Supabase linter cache may still show these advisories for ~30 minutes — the DB state is correct.

### 3. rls_enabled_no_policy (33 tables) — NOT FIXED (intentional)

**Advisory:** `rls_enabled_no_policy` (INFO × 33)
**Decision:** Keep deny-by-default.

**Rationale:** These 33 tables have RLS enabled but 0 policies AND 0 grants for `anon`/`authenticated`. Verification:

```sql
SELECT grantee, table_name FROM information_schema.table_privileges
WHERE table_schema='public' AND grantee IN ('anon', 'authenticated')
  AND table_name IN ('users','drivers','advertisers','campaigns',...);
-- Result: 0 rows
```

The only PostgREST client is `supabase.auth.*` (OAuth, password signin, realtime broadcast). All business data access goes through the NestJS backend using Prisma with `DATABASE_URL` (direct connection as `postgres` role, bypasses RLS via `rolbypassrls=true`).

Creating permissive `USING (true)` policies would OPEN these tables, not close them. Current state is correct: deny-by-default + backend-only access.

**Risk if you later add a PostgREST client for one of these tables:** you'll need explicit, role-aware policies. Document this in `apps/api/README.md`.

### 4. rls_disabled_in_public (spatial_ref_sys) — PENDING Supabase support

**Advisory:** `rls_disabled_in_public` (ERROR)
**Status:** Support ticket sent. Awaiting Supabase to execute as `supabase_admin`.
**Why I can't fix:** Table owner is `supabase_admin`. My `postgres` role is NOT superuser (Supabase removed superuser grants from `postgres` in 2024 hardening). All ownership transfers fail with `42501: must be owner`.

**Once Supabase processes the ticket**, the advisory will clear.

### 5. extension_in_public (postgis) — PENDING Supabase support

**Advisory:** `extension_in_public` (WARN)
**Status:** Cannot fix from client. PostGIS extension is owned by `supabase_admin`. Moving it to a new schema requires superuser.

**Mitigation:** PostGIS functions are bound to the extension, not the schema. Even if PostGIS lived in `extensions` schema, the `st_estimatedextent` advisory would still appear (now scoped to that schema). Revoking EXECUTE (done above) is the actual mitigation.

### 6. auth_leaked_password_protection — PENDING user action

**Advisory:** `Leaked Password Protection Disabled` (WARN)
**Why I can't fix:** GoTrue (Supabase Auth) config is not exposed to SQL or to my MCP. Only the Supabase Management API (`PATCH /v1/projects/{ref}/config/auth`) or the Dashboard can flip this. I don't have the `SUPABASE_ACCESS_TOKEN` in my environment.

**User action required** (one of):
1. Open `https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf/auth/policies` → enable "Password Strength & Leaked Password Protection"
2. Or via Management API:
   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.supabase.com/v1/projects/ltdcdhqixvbpdcitthqf/config/auth \
     -d '{"security_captcha_protect_provider":"","password_requirements":{"leaked_password_check":true}}'
   ```

---

## Verification

Run `get_advisors` (MCP) or visit the Supabase Linter page to confirm. Expected:

| Advisory | Before | After (immediate) | After (30 min cache) |
|---|---|---|---|
| function_search_path_mutable | 5 | 0 | 0 |
| anon_security_definer_function_executable | 3 | 3 (cache) | 0 |
| authenticated_security_definer_function_executable | 3 | 3 (cache) | 0 |
| rls_enabled_no_policy | 33 | 33 | 33 (intentional) |
| rls_disabled_in_public | 1 | 1 | 1 (pending support) |
| extension_in_public | 1 | 1 | 1 (pending support) |
| auth_leaked_password_protection | 1 | 1 | 1 (pending user) |

---

## Migrations Applied

1. `lock_function_search_paths` — see Supabase migrations table

## Inline REVOKEs Applied (no migration wrapper)

- `REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM anon, authenticated`
- `REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM anon, authenticated`
- `REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM anon, authenticated`

If you need to re-apply (e.g. after a PostGIS upgrade that re-grants), wrap them in a migration.
