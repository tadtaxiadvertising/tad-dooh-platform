# TAD DOOH — Google Sign-In Setup Guide

> Quick reference for enabling "Continuar con Google" on the Admin and
> Advertiser portals. Driver portal keeps phone + password.

## Status (as of 2026-08-31)

✅ **Google OAuth provider is ACTIVE on Supabase `ltdcdhqixvbpdcitthqf`** (TAD DOOH project).

Configuration applied via Supabase Management API:
```
external_google_enabled           = true
external_google_client_id         = 1088475135252-dobrj948sbu6noaal49eo81c040q1ub9.apps.googleusercontent.com
external_google_secret            = *** (GOCSPX-... stored hashed server-side)
external_google_email_optional    = false
```

To re-verify or rotate the secret:
```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.supabase.com/v1/projects/ltdcdhqixvbpdcitthqf/config/auth \
  -d '{"external_google_enabled": true, ...}'
```

Then check via Dashboard > Authentication > Providers > Google — the toggle should be ON with the Client ID populated.

---

## Overview

```
[User] → [Google OAuth consent] → [Supabase callback] → [Portal /auth/callback]
                                                              │
                                                              ▼
                                              POST /api/v1/auth/oauth/exchange
                                                              │
                                                              ▼
                                                  role validation + app_metadata
                                                  injection in Supabase
                                                              │
                                                              ▼
                                                  localStorage + redirect
```

The driver portal is intentionally excluded — drivers don't have email
addresses in the platform, so OAuth would block their login.

---

## Step 1 — Google Cloud Console

1. Go to <https://console.cloud.google.com/apis/credentials>
2. Create an **OAuth Client ID** of type **Web application**
3. **Authorized JavaScript origins:**
   ```
   https://proyecto-ia-tad-admin.rewvid.easypanel.host
   https://proyecto-ia-tad-advertiser.rewvid.easypanel.host
   https://proyecto-ia-tad-api.rewvid.easypanel.host
   http://localhost:3002          (admin local dev)
   http://localhost:3000          (advertiser local dev)
   ```
4. **Authorized redirect URIs:**
   ```
   https://ltdcdhqixvbpdcitthqf.supabase.co/auth/v1/callback
   ```
5. Save the **Client ID** and **Client Secret** — you'll need them in Step 2.

---

## Step 2 — Supabase Dashboard

1. Open <https://supabase.com/dashboard/project/ltdcdhqixvbpdcitthqf/auth/providers>
2. Click **Google** in the Providers list
3. Toggle **Enable Sign in with Google**
4. Paste the **Client ID** and **Client Secret** from Step 1
5. Under **Additional Scopes** (optional but recommended): `email profile`
6. **Save**

### Verify the provider is active

```sql
SELECT id, created_at, updated_at FROM auth.oauth_clients LIMIT 20;
```

The table should now show a row with `provider = 'google'`.

---

## Step 3 — No code changes required for backend

The backend route `POST /api/v1/auth/oauth/exchange` is already implemented
in `apps/api/src/modules/auth/`. The frontend packages are wired and will
work as soon as the Google provider is enabled in Supabase.

No environment variables need to be added — Supabase handles the OAuth
client credentials at the project level.

---

## Step 4 — Frontend portal routing

Each portal already has the `/auth/callback` route wired via `<AuthCallback />`:

| Portal | Callback path | Configured in |
|---|---|---|
| Admin | `/admin/auth/callback` | `apps/admin/pages/admin/auth/callback.tsx` |
| Advertiser | `/advertiser/auth/callback` | `apps/advertiser/pages/advertiser/auth/callback.tsx` |

If a callback page doesn't exist in your portal, create a thin wrapper:

```tsx
// apps/admin/pages/admin/auth/callback.tsx
import { AuthCallback } from '@tad/ui';
export default function AdminAuthCallbackPage() {
  return <AuthCallback />;
}
```

---

## Step 5 — First-time OAuth signup

For a Google account to log in, it MUST already exist in the local DB
(`User` table for admin, `Advertiser` table for advertisers). Otherwise
the backend returns `403 Forbidden`:

> Tu cuenta de Google (`foo@bar.com`) no está autorizada para acceder al
> portal ADVERTISER. Contacta al administrador.

This is intentional — OAuth attests identity, but role assignment is
controlled by the operator (you). To allow a new user:

1. Add their email via the Admin portal **or**
2. Invite them via the public registration flow (Advertiser only) **or**
3. Insert directly into the `User` / `Advertiser` table

After the first successful OAuth login, Supabase will create the `auth.users`
row automatically and subsequent logins reuse it.

---

## Testing locally

1. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   are set in `apps/admin/.env.local` and `apps/advertiser/.env.local`
   (already required by the existing email/password flow).
2. Add `http://localhost:3002` (admin) and `http://localhost:3000`
   (advertiser) to the OAuth client's **Authorized JavaScript origins**.
3. Click "Continuar con Google" on the login page.
4. After consent, you'll land on the dashboard.

---

## Rollback

If Google Sign-In needs to be disabled, toggle off the Google provider in
Supabase Dashboard. The `GoogleSignInButton` calls `signInWithOAuth` which
will return an error and the UI will surface it gracefully — no DB
migration needed and email/password login keeps working.
