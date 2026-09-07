# Security Audit Automation

## GitHub Actions Workflow (Automatic)

**File**: `.github/workflows/security-audit-weekly.yml`

Runs every **Monday 06:00 UTC** and on manual trigger.

### What it checks (11 categories):

| # | Check | Free Plan Limit | Alert Threshold |
|---|-------|-----------------|-----------------|
| 1 | **Security Advisories** | - | New ERROR/WARN (excl. known) |
| 2 | **Database Size** | 500 MB | >400MB warn, >450MB critical |
| 3 | **Storage Usage** | 1 GB | Reports usage |
| 4 | **Auth Config** | - | Leaked password, MFA, JWT expiry |
| 5 | **Edge Functions** | 500K invocations/mo | Lists functions + 24h invocations |
| 6 | **Realtime** | 200 concurrent | Reports usage |
| 7 | **RLS Deny-by-Default** | - | 0 grants to anon/authenticated |
| 8 | **Function search_path** | - | 0 mutable functions |
| 9 | **st_estimatedextent** | - | Monitors PostGIS function grants |
| 10 | **Long-running Queries** | - | >30s active queries |
| 11 | **Idle in Transaction** | - | >5min idle transactions |

### On Failure:
- Creates GitHub Issue with details
- Sends Slack notification (if `SLACK_WEBHOOK_URL` secret configured)
- Uploads advisories JSON as artifact (30 days retention)

---

## Local Manual Script

**File**: `scripts/security-audit.sh`

```bash
# Set credentials
export SUPABASE_ACCESS_TOKEN="your_pat_token"
export DB_PASSWORD="your_db_password"

# Run
./scripts/security-audit.sh
```

### Requirements:
- `jq` (JSON parser)
- `psql` (PostgreSQL client)
- `curl`

### Exit codes:
- `0` = Pass (no new regressions)
- `1` = Fail (new ERRORs, grants, mutable functions, or DB critical)

---

## Required GitHub Secrets

| Secret | Description | How to get |
|--------|-------------|------------|
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token | Dashboard → Settings → Access Tokens → Generate |
| `DB_PASSWORD` | Database password | Dashboard → Settings → Database → Connection string |
| `SLACK_WEBHOOK_URL` | Optional Slack webhook | Slack App → Incoming Webhooks |

---

## Known Blocked Items (Accepted Risk)

| Advisory | Reason | Resolution |
|----------|--------|------------|
| `rls_disabled_in_public` (spatial_ref_sys) | Owned by `supabase_admin`, no superuser since 2024 | **Ticket Supabase Support** |
| `extension_in_public` (postgis) | Owned by `supabase_admin` | **Ticket Supabase Support** |
| `st_estimatedextent` (6 functions) | PostGIS system C functions, grant from `supabase_admin` | Accepted - read-only geo extent |

These are **excluded from failure** in the workflow but still reported.

---

## Free Plan Limits Monitoring

The audit tracks proximity to Free Plan limits:

| Resource | Limit | Warning | Critical |
|----------|-------|---------|----------|
| Database | 500 MB | 400 MB (80%) | 450 MB (90%) |
| Storage | 1 GB | 800 MB (80%) | 900 MB (90%) |
| Edge Functions | 500K/mo | 400K (80%) | 450K (90%) |
| Realtime | 200 concurrent | 160 (80%) | 180 (90%) |

---

## Adding New Exclusions

Edit `.github/workflows/security-audit-weekly.yml`:

```yaml
KNOWN_BLOCKED_ERRORS='["rls_disabled_in_public", "new_error_name"]'
KNOWN_WARNS='["extension_in_public", "anon_security_definer_function_executable", "authenticated_security_definer_function_executable", "new_warn_name"]'
```

---

## Verification Commands

```bash
# Quick advisories check
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/ltdcdhqixvbpdcitthqf/database/lints" | \
  jq '.[] | select(.level=="ERROR" or .level=="WARN") | {name, level, detail}'

# Quick RLS grants check
PGPASSWORD="$DB_PASSWORD" psql "postgresql://postgres:$DB_PASSWORD@db.ltdcdhqixvbpdcitthqf.supabase.co:5432/postgres" -c "
  SELECT table_name, grantee, privilege_type 
  FROM information_schema.table_privileges 
  WHERE grantee IN ('anon','authenticated') AND table_schema='public';"

# Quick DB size
PGPASSWORD="$DB_PASSWORD" psql "postgresql://postgres:$DB_PASSWORD@db.ltdcdhqixvbpdcitthqf.supabase.co:5432/postgres" -c "
  SELECT pg_size_pretty(pg_database_size('postgres'));"

# Edge Functions
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/ltdcdhqixvbpdcitthqf/functions" | \
  jq '.[] | {name: .slug, version, status}'

# Auth config
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/ltdcdhqixvbpdcitthqf/config/auth" | \
  jq '{leaked_password_protection_enabled, mfa_enabled, jwt_expiry}'
```

---

## Next Steps

1. ✅ Add `SUPABASE_ACCESS_TOKEN` and `DB_PASSWORD` to GitHub Secrets
2. ✅ (Optional) Add `SLACK_WEBHOOK_URL` for notifications
3. ✅ Trigger manually first: Actions → Weekly Supabase Security Audit → Run workflow
4. ✅ Verify first run passes
5. ✅ Let it run automatically every Monday

---

## Extending the Audit

To add custom checks, edit the `Run Security Audit` step in `.github/workflows/security-audit-weekly.yml` or `scripts/security-audit.sh`.

Examples of additional checks you could add:
- **Backup status**: Check last backup timestamp
- **PITR status**: Point-in-time recovery enabled
- **SSL/TLS**: Certificate expiry
- **Custom metrics**: Your app-specific health checks
- **Cost estimation**: Projected usage vs limits