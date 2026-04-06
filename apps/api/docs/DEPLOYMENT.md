# TAD DOOH Platform - Backend Deployment Guide

This document outlines the final production deployment architecture mapping the NestJS Backend onto Vercel Serverless Infrastructures natively bridging a **Supabase PostgreSQL** database.

## Architecture Pipeline

1. **Vercel Edge Functions (`@vercel/node`)**: The application runs efficiently omitting continuous server polling. Cold starts are drastically minimized natively routing Requests via `api/index.ts`.
2. **Supabase PostgreSQL Database**: Replaces generic Docker/Local databases securing high-availability data integrations.
3. **Prisma Singleton Connection Pooling**: Avoids hitting database connection limits when Vercel spins up concurrent edge instances routing traffic across the Taxi fleets globally.

## Prerequisites

Before deploying unconditionally, you must provision your Supabase Instance:
1. Navigate to [Supabase](https://supabase.com).
2. Create a new Organization & Project.
3. Locate the `Database Password` & Navigate to Settings -> Database -> Connection String (URI).
4. Substitute your generic `<password>` inside the Connection String URI natively.
5. In your local `.env`, configure the variables replacing generic parameters.

## Mandatory Environment Variables (Vercel)

Inside your Vercel Project Settings (`tad-api`) under **Environment Variables**, you must precisely map:

- `DATABASE_URL`: `"postgresql://postgres.xxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"`
- `NODE_ENV`: `"production"`

## Deployment Instruction

Assuming Tokens and global repositories are linked natively, the script automates everything perfectly:

```bash
npm run deploy:vercel
```

**What happens securely during this procedure?**
1. **Schema Generator (`npx prisma generate`)**: Validates the `schema.prisma` definitions natively producing local TypeScript structures.
2. **Database Migrations (`npx prisma migrate deploy`)**: Resolves pending architectural edits natively migrating your Supabase structures matching latest models (Device, Campaigns, Heartbeats, etc).
3. **App Compiler (`npm run build`)**: Translates TS NestJS files inside `/dist` safely validating types precisely omitting memory crashes.

## Verifying E2E Workflows Natively

Once Vercel resolves the final domain string (`https://tad-api.vercel.app/api`), explicitly run the QA validation framework querying against your fresh Supabase!

```bash
node tests/e2e-platform-test.js
```

### Flow Verification Sequence (Real Devices & Player Connections)
* **Registration**: Tablets natively call `POST /api/device/register`, securing distinct UUID values inside the Supabase `devices` row tracking app configurations flawlessly.
* **Heartbeats**: Intervals (every 5-minutes natively via `TABLET_HEARTBEAT_INTERVAL_SECONDS`) emit `POST /api/device/heartbeat` resolving into the `device_heartbeats` table securely defining battery thresholds.
* **Campaign Sync**: Kiosk Tablets trigger native Offline cache distributions hitting `GET /api/device/sync`. The API reads Supabase matching Campaigns allocating videos specifically bypassing unnecessary downloads automatically. 
* **Analytics Capture**: Playbacks resolving off Kiosks natively hit `POST /api/analytics/event` storing impression structures mapping directly inside the `analytics_events` columns resolving metrics per unique taxi!
