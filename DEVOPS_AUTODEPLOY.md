# TAD DOOH Platform - Automated DevOps Deployment

This repository orchestrates a robust Node.js automation script (`/devops/deploy-all.js`) built to integrate natively over **Railway** (Backend) and **Vercel** (Frontend) API architectures simultaneously executing build processes without manual intervention.

## 1. Required Tokens

You must authenticate the `devops` matrix using specific Provider CLI API Tokens:

1. **RAILWAY_TOKEN**: Extracts via your Railway Console (`Settings > Tokens > Personal API Tokens`). Example: `YOUR_RAILWAY_TOKEN`.
2. **VERCEL_TOKEN**: Extracts via your Vercel Console (`Settings > Tokens`). Example: `YOUR_VERCEL_TOKEN`.

You must append these universally into your `.bashrc` or local environment explicitly before running `npm run deploy`, OR just append them ahead of your command logically.

## 2. Infrastructure & Environment Variables

The DOOH network requires explicit global parameters ensuring CDN Blob mappings logic points cleanly.

**Backend `api.tad.com` (Railway Required)**
- `DATABASE_URL` (Provisioned by Managed PostgreSQL organically via Railway internally).
- `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` (Provision via Cloudflare/AWS matching API boundaries).
- `STORAGE_CDN_URL` (Caching layer).

**Frontend `*.tad.com` (Vercel Embedded into Builder natively by DevOp Script)**
- `NEXT_PUBLIC_API_URL` (Handled automatically mapping strictly against api.tad.com/api natively via scripts)
- `VITE_API_URL` (Handled automatically mapping onto Native builds natively).

## 3. How to Run Deploy

The root orchestration explicitly manages and invokes sequence builds. 

To deploy **the entire DOOH Platform globally**:

```bash
# In your tad-dooh-platform root folder:
RAILWAY_TOKEN="your_railway_token" VERCEL_TOKEN="your_vercel_token" npm run deploy
```

What the script natively automates:
1. `deploy-backend.js`: Invokes Railway deployments spinning NestJS arrays running migrations instantly (`npx prisma migrate deploy`).
2. `deploy-player.js`: Initiates `Vite` locally packaging `/player/dist` before Vercel captures statically cached blobs targeting CDN optimization.
3. `deploy-dashboard.js`: Sends the Next.JS interface natively running SSR Node environments. 

## 4. Updates & Rollbacks

- **Updates**: Re-running `npm run deploy` invokes Vercel/Railway diff builders natively only spinning changed modules preventing excessive CI usages.
- **Rollbacks**: Standard CI interfaces support native clicking rollback buttons across both Vercel & Railway dashboards preserving state logically.

## 5. Domain Bindings (Cloudflare Configuration)

Since APIs deploy on raw domains (e.g., `project-random.vercel.app`), configure Cloudflare DNS proxy domains mapping your architecture clearly:

| DNS Entry | Record Type | Name | Target | Proxy Status |
|---|---|---|---|---|
| CNAME | `api` | api.tad.com | Deploy Output (e.g. `your-railway.app`) | Proxied (Orange Cloud) |
| CNAME | `dashboard` | dashboard.tad.com | Deploy Output (`your-vercel-dashboard.vercel.app`) | Proxied |
| CNAME | `player` | player.tad.com | Deploy Output (`your-vercel-player.vercel.app`) | Proxied |

By mapping Proxied connections, Cloudflare automatically injects HTTP/3 layers bypassing latency anomalies and strictly shielding Vercel/Railway nodes from direct scraping logic globally.
