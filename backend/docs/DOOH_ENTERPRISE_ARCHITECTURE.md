# TAD DOOH Platform - Enterprise Architecture

## 1. System Architecture
The TAD DOOH (Digital Out-of-Home) Platform is built using a modern, scalable, and serverless stack designed to handle 10,000+ taxi tablets seamlessly.
- **Backend Framework:** NestJS (Node.js)
- **Database:** PostgreSQL (managed via Supabase)
- **ORM:** Prisma
- **Deployment:** Vercel (Serverless Functions)
- **Caching & Media:** AWS S3 compatible object storage (Cloudflare R2 or DO Spaces)

The system relies on stateless RESTful controllers, enabling instant horizontal scaling across Vercel edge/serverless nodes.

## 2. Database Schema
Our PostgreSQL database relies heavily on relational integrity while supporting high-throughput ingestion. The core models include:
- **Campaign & MediaAsset:** Tracks advertising metadata, validity periods, and associated CDN links. Relationships allow one Campaign to have multiple assets (e.g., different video sizes).
- **Device & DeviceHeartbeat:** Represents taxi tablets. The schema tracks the `lastSyncHash`, `lastOnline` and battery/storage statuses to ensure devices are operational.
- **Fleet:** Manages logical grouping of devices across cities and organizations.
- **AnalyticsEvent:** Stores raw ingestion hooks for every playback milestone (`video_completed`, etc). This model is heavily indexed on `[deviceId]`, `[campaignId]`, and `[timestamp]`.

## 3. Tablet Sync Process
The synchronization ensures low bandwidth consumption and fast operations:
1. Devices query `/api/device/sync` passing their `device_id`.
2. The server filters active campaigns (checking `start_date` and `end_date`) and maps related `MediaAsset` links.
3. The server builds a `manifest` of videos to play.
4. Responses include a `campaign_version` (timestamp based hook). Devices only download assets whose signatures or checksums do not exist locally, drastically minimizing payload sizes via JSON compression and localized caching.

## 4. Analytics Pipeline
Expected load is ~1,000,000+ events per day.
- **Ingestion:** `/api/analytics/event` or `/api/analytics/batch` receives telemetry data from the tablets.
- **Processing:** Data is inserted directly into the `AnalyticsEvent` table using Prisma. Fast inserts are supported by keeping relationships simple. The events contain timestamps specifying when they occurred versus when they were received.
- **Rollups (Future-Proofing):** Cron jobs or background workers pre-compute aggregate impressions into `CampaignMetric` every hour to reduce query latency on dashboard views.

## 5. Fleet Monitoring
The `/api/fleet/*` endpoints expose a high-altitude view of the ecosystem:
- Tablets report telemetry every ~30-60 seconds via `/api/device/heartbeat`.
- The Fleet module calculates offline/online statuses by evaluating `lastSeen` values strictly against a 30-minute threshold.
- Anomalies (e.g. tablet drops offline or reports player errors) are automatically flagged, allowing operators to deploy maintenance to the correct geographical location.
