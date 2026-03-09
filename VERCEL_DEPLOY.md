# TAD DOOH Platform - Pure Vercel Monorepo Deployment

This document instructs on provisioning the entire Serverless Platform exclusively binding against **Vercel** infrastructures, converting your localized nodes seamlessly unifying the NextJS Dashboard, Vite Player Static Chunk bindings, and Native NestJS API endpoints natively within `@vercel/node`.

## 1. Project Monorepo Structure

Vercel scales efficiently isolating applications directly resolving `cwd` parameters. 
Your Monorepo maps distinctly avoiding cross-contamination:

```text
/tad-dooh-platform
├── /backend            <- Configured explicitly inside vercel.json compiling /api/index.ts.
├── /admin-dashboard    <- Auto-detected SSR NextJS. 
├── /player             <- Pre-compiles statically /dist allowing rapid CDN injections.
├── /devops             <- Automation Hooks natively binding Tokens.
└── package.json        <- Executes node orchestrations mapping commands dynamically.
```

## 2. Global Vercel Setup

Before automating, obtain your explicit **Vercel Authorization Token** dynamically bridging deployments without manual terminal prompts:
- Vercel Web Dashboard -> Your Profile Settings -> Generate New "Access Token".
- Identify explicitly as `VERCEL_TOKEN`.

### Required Environment Maps

**Backend API (`tad-api.vercel.app`) requires Native Data bindings:**
You must configure these centrally tracking the Vercel Container dynamically running Prisma mappings globally:
- `DATABASE_URL` 
- `STORAGE_ENDPOINT` / `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` / `STORAGE_BUCKET` / `STORAGE_CDN_URL`

*(The devops sequences automatically inject cross-talking URLs passing `NEXT_PUBLIC_API_URL` dynamically between sub-platforms based on the predicted Vercel endpoint bindings!).*

## 3. How to Deploy Continuously

To construct and upload logic arrays explicitly mapping logic across API limits, natively execute from the root monorepo:

```bash
VERCEL_TOKEN="vcp_xxxxxx" npm run deploy:vercel
```

**Executing sequence natively resolves:**
1. **Backend Integration**: Compiles your local TypeScript classes running `prisma generate` and mapping Native Express adapters directly onto Vercel Serverless Arrays cleanly routing `/api/*`.
2. **Dashboard Rendering**: Binds SSR dependencies over generic Node arrays provisioning APIs directly onto mapping states (`NEXT_PUBLIC_API_URL=https://tad-api.vercel.app/api`).
3. **Player Runtime Engine**: Injects `<script/>` logic mapping exactly `vite build` pushing `dist/` directly routing index html outputs mapping Offline sequences! (`VITE_API_URL=https://tad-api.vercel.app/api`).

## 4. Updates & Scaling

**How to Update**: Anytime a node changes functionality internally locally, just fire `npm run deploy:vercel`. Node natively calculates logical diffs globally overriding instances without destroying currently running states seamlessly!

**Rollbacks / Fault Tolerance**: If logic throws anomalies post-deployment, immediately sign into Vercel interfaces clicking purely visual buttons reverting to historically preserved builds safely mapping static states.

## 5. Endpoints Mapped Globally

Direct URLs securely allocated executing exactly zero setup instructions upon running:
- **API Node Endpoint**: `https://tad-api.vercel.app/api`
- **Dashboard Interfaces**: `https://tad-dashboard.vercel.app`
- **Kiosk Player Static UI**: `https://tad-player.vercel.app`

## 6. End-to-End Post Validation Constraints

Our script automatically fires Smoke Screen validation routines running explicitly matching parameters:
- *API Execution Handlers*
- *Node Identity Allocation mapping UUID sequences*
- *Media Uploading Logic bounding chunks natively* 
- *Dashboard Intel Validation mapping Traffic calculations!* 

Welcome to Serverless global implementations!
