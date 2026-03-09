# TAD DOOH Platform - Production Deployment Handbook
> **Architecture Overview:** This document strictly defines the operational protocols orchestrating the global deployment of the entire DOOH Node Network explicitly scaling across serverless boundaries.

---

## 1. System Structure
Your ecosystem relies natively on 3 isolated deployment layers minimizing downtime securely:

1. **Backend Integration Matrix** -> `api.tad.com` (NestJS + Prisma PostgreSQL + Redis Cache)
2. **Admin Intel Dashboard** -> `dashboard.tad.com` (Next.js Application)
3. **Player Runtime** -> `player.tad.com` (Vite / TypeScript Node Arrays natively)

---

## 2. Global Environment Variables
Before deploying, securely allocate the following logical strings:

**Backend (Runtime `api.tad.com`)**
```env
# Infrastructure Storage
DATABASE_URL="postgresql://user:password@aws-host.com:5432/tad_db"

# Media Bucket Allocations
STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY="<your-access-key>"
STORAGE_SECRET_KEY="<your-secret-key>"
STORAGE_BUCKET="tad-media"
STORAGE_CDN_URL="https://cdn.tad.com" # Explicit CDN mapping caching streams

# Network Port 
PORT=3000
```

**Admin Dashboard (Runtime `dashboard.tad.com`)**
```env
NEXT_PUBLIC_API_URL="https://api.tad.com/api"
```

**Tablet Player (Runtime `player.tad.com`)**
```env
VITE_API_URL="https://api.tad.com/api"
```

---

## 3. Step-by-Step Deployment Protocols

### A. Backend Network (Railway or Render)
*Platform resolves natively running Node natively using internal build configurations.*

1. Fork/Push `tad-dooh-platform` onto a private GitHub Repository.
2. Inside Railway/Render, map **Root Directory** = `/backend`.
3. Select `Start Command` = `npm run start:prod` (We altered `package.json` to automatically invoke `npx prisma generate && npx prisma migrate deploy` natively parsing schema logic without manual interventions).
4. Inject your Database Strings linking their Managed PostgreSQL Add-ons globally. 
5. Run the node. Expect logs confirming Database Migrations resolving.

### B. Admin Dashboard (Vercel)
*Next.js SSR endpoints optimize rapidly upon Vercel directly out of the box.*

1. Inside Vercel, attach the GitHub Repository.
2. Configure **Root Directory** = `/admin-dashboard`.
3. Insert `NEXT_PUBLIC_API_URL` environment variables logically securely aiming at your Backend API Domain.
4. Deploy globally.

### C. Tablet Player (Vercel)
*Static HTML compilation routing deeply over Mobile Native logic perfectly suited for Vercel/Cloudflare static delivery pipelines.*

1. Inside Vercel, attach the GitHub Repository.
2. Configure **Root Directory** = `/player`.
3. Vercel identifies `vite` automatically parsing explicit configurations.
4. Insert `VITE_API_URL` environment variables logically mapping `api.tad.com`.
5. Deploy securely.

---

## 4. Domain & DNS Configuration Structure (via Cloudflare)

When orchestrating domains, Cloudflare mappings should exclusively use `CNAME` records shielding traffic IPs effectively. Make sure SSL overrides configure strictly (Full / Strict).

| Type | Target Subdomain | Proxy Rule | Resolving Point (Examples) |
|---|---|---|---|
| `CNAME` | `api.tad.com` | DNS Only / Proxied | `backend-production.up.railway.app` |
| `CNAME` | `dashboard.tad.com` | Proxied | `tad-dashboard.vercel.app` |
| `CNAME` | `player.tad.com` | Proxied | `tad-player.vercel.app` |

*Ensure Vercel / Railway acknowledges the Custom Domains assigned verifying SSL TLS natively.*

---

## 5. System Validation & End-to-End Checking

Upon deployment, verify nodes logic resolves comprehensively:

### Task Execution Script (Automated Sequence)
Run the internal validation script executing a full Network Cycle Simulation globally simulating physical nodes overriding explicit constraints.

```bash
chmod +x test_production.sh
./test_production.sh https://api.tad.com/api taxi-physical-001
```

### Manual Validation Checklist

- [ ] **Tablets Ping Logic:** Navigate explicitly `https://player.tad.com` locally via Desktop Chrome. Verify network traces (`F12`) mapping strictly resolving `/api/device/sync` correctly.
- [ ] **Tablet Offline Isolation:** Pull Internet. Reload. Verify arrays flush efficiently using cached chunks effectively looping media implicitly.
- [ ] **Fleet Analytics Push:** Navigate to `https://dashboard.tad.com/fleet`. Verify newly parsed telemetry values mapped correctly natively updating offline times aggressively.
- [ ] **Campaign Allocation:** Upload a test `.mp4` loop binding onto active campaigns securely. Verify Cloudflare CDN URLs parsed visually rendering S3 outputs inside Network Traffic tools dynamically.
- [ ] **Aggregated Proof:** Confirm Dashboard Chart endpoints parse hourly traffic loops correctly processing `top-taxis` cleanly!

The platform is officially deployed and orchestrated to securely provision isolated fleet arrays without network overhead bleeding.
