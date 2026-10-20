# 01 — Scope and Environment

## Repository

- **URL:** `https://github.com/tadtaxiadvertising/tad-dooh-platform`
- **Local Path:** `C:\tad-dooh-platform`
- **Branch:** `main`
- **Commit:** `14d184e9` (Merge PR #73 from fix/sre-ci-security-2026-10-13)
- **Git Status:** Clean working tree; behind `origin/main` by 23 commits
- **Uncommitted Changes:** None

## Architecture Overview

**Monorepo:** pnpm workspaces with 10 apps + 7 packages

### Applications

| App | Framework | Port | Purpose |
|-----|-----------|------|---------|
| `apps/api` | NestJS 10 | 3000 | Backend API, Auth, Webhooks, Remotion proxy |
| `apps/admin` | Next.js 15 | 3002 | Admin Dashboard (fleet, campaigns, analytics) |
| `apps/advertiser` | Next.js 15 | 3003 | Advertiser Portal (campaign planner, billing) |
| `apps/driver` | Next.js 15 | 3004 | Driver Portal (PWA, onboarding, wallet) |
| `apps/player` | Vite + React | 5173 | Tablet Player (offline-first, Service Worker) |
| `apps/tad-remotion` | Remotion 4 | 3005 | Video rendering service (Chromium) |
| `apps/tad-simulator` | Node CLI | — | Load testing simulator for telemetry |
| `apps/agents-orchestrator` | Node | — | AI agent orchestration |
| `apps/driver-flutter` | Flutter | — | Native driver app (WIP) |
| `apps/driver-android` | Android | — | Legacy native driver app |

### Shared Packages

| Package | Purpose |
|---------|---------|
| `packages/services` | API clients, shared types, DTOs, Supabase helpers |
| `packages/ui` | Shared React components (design system) |
| `packages/store` | Zustand stores, SWR hooks, persistence |
| `packages/logging` | Winston/Logtail structured logging |
| `packages/types` | Shared TypeScript types, Zod schemas |
| `packages/permissions` | RBAC/ABAC permission utilities |
| `packages/impact-calculator` | Campaign impression/revenue projection engine |

### Infrastructure

- **Database:** PostgreSQL on Supabase (`ltdcdhqixvbpdcitthqf.supabase.co`)
- **Auth:** Supabase Auth (JWT, email/password, Google OAuth)
- **Storage:** S3-compatible (DigitalOcean Spaces / Cloudflare R2)
- **Realtime:** Supabase Realtime (playback events, device status)
- **CDN:** Cloudflare (assets, video delivery)
- **Deployment:** EasyPanel (Docker containers, 512MB RAM limit)
- **CI/CD:** GitHub Actions (lint, typecheck, test, Prisma, security, Docker build)

## Tool Versions

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v26.7.0 (host) | Project targets **Node 22** (`.nvmrc`, Dockerfiles) |
| pnpm | 11.7.0 | Lockfile: `pnpm-lock.yaml` |
| TypeScript | 5.3.3 (api), 5.7.0 (admin/driver), 5.9.3 (advertiser) | Multiple versions across workspaces |
| NestJS | 10.3.x | API |
| Next.js | 15.2.6 (admin/driver), ^15 (advertiser) | |
| React | 19.0.0 | All frontends |
| Prisma | 5.22.0 | ORM + migrations |
| Supabase JS | 2.99.x | Client + SSR |
| Playwright | 1.58.2 | E2E testing |
| Jest | 29.7.0 | Unit/integration testing |
| Remotion | 4.0.451 | Video rendering |
| ESLint | 8.57.1 (api), 9.39.4 (admin/driver/advertiser) | **v8/v9 mismatch** |

## Environment Variables (Required)

### API (`apps/api/.env`)
- `DATABASE_URL` — PostgreSQL connection string (Supabase pooler)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_JWT_SECRET`
- `JWT_SECRET` / `JWT_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN`
- `REDIS_URL` — Bull queue backend
- `STORAGE_*` — S3/R2 credentials (endpoint, access/secret key, bucket, CDN)
- `SMTP_*` / `SENDGRID_API_KEY` — Email delivery
- `SENTRY_DSN` — Error tracking
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` — Sheets integration
- `SIMULATOR_API_KEY` — Shared secret with tad-simulator
- `ALLOW_SIMULATOR_TRAFFIC` — Feature flag

### Frontends (Admin/Driver/Advertiser)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_PORTAL_TYPE` (ADMIN/DRIVER/ADVERTISER)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

### Player
- `VITE_API_URL` / `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`

## Limitations

1. **No live DATABASE_URL** — Prisma validation, migrations, integration tests require Supabase connection
2. **No Docker daemon** — Cannot verify Docker builds locally
3. **No isolated test environment** — E2E tests target production URLs with real credentials
4. **Node version skew** — Host Node 26 vs project Node 22 may cause subtle issues
5. **Windows/MSYS** — Path translation, symlink behavior, case sensitivity differ from Linux CI
6. **Audit-only mode** — No code changes, no migrations, no deployments, no secret rotation performed
7. **Real secrets in `.env`** — Local `.env` files contain actual credentials (P0 finding TAD-QA-001)

## Audit Boundaries

**In Scope:**
- All source code in `apps/*`, `packages/*`
- Configuration files (package.json, tsconfig, jest, playwright, docker, CI)
- Database schema (Prisma)
- Test suites (unit, integration, E2E)
- Security configuration (CI, Docker, Supabase policies)

**Out of Scope:**
- Production infrastructure (Supabase project, EasyPanel, Cloudflare, DNS)
- Flutter/Android native apps (separate build pipelines)
- Third-party services (SendGrid, Sentry, Google Sheets, Maps)
- Load/stress testing beyond existing simulator
- Manual exploratory testing