# TAD DOOH Platform - Backend Architecture

## System Overview
The backend provides a RESTful API designed specifically to service TAD DOOH tablet players in offline environments. Using a **"sync & cache" architecture**, devices connect briefly to download campaigns, fetch remote configurations, and upload stored playback metrics. The primary objective is to maintain extremely low bandwidth and allow long periods of offline operation.

The backend is built with **NestJS**, utilizing **Prisma** as the ORM and **PostgreSQL** as the database, ensuring that it remains strongly typed, modular, and scalable to support 10,000+ devices.

## 1. Folder Structure
The platform follows a modular NestJS structure cleanly separating domains:
```text
backend/
├── prisma/
│   └── schema.prisma         <- Database schemas and models
├── src/
│   ├── modules/
│   │   ├── prisma/           <- Prisma client and connection management
│   │   ├── device/           <- Device registration, health, and sync APIs
│   │   ├── analytics/        <- Offline metrics and playback event APIs
│   │   └── campaign/         <- Campaign content logic and formatting
│   ├── middleware/
│   │   └── logger.middleware.ts  <- Request logging middleware
│   ├── app.module.ts         <- Top-level application configuration
│   └── main.ts               <- Application bootstrap & Swagger documentation
├── .env                      <- Environment configuration
└── package.json
```

## 2. Database Schema
Using Prisma & PostgreSQL. Below are the core tables modified for Phase 1.

*   `Device`: Stores unique `device_id`, last seen activity timestamp, app version, and current status.
*   `DeviceHeartbeat`: Records periodic telemetry from a specific tablet (free storage, battery levels).
*   `Campaign`: Represents a marketing campaign active in the network.
*   `Video`: Video entities associated with an active campaign containing the absolute URLs.
*   `PlaybackEvent`: Ingests Proof-of-Play offline analytics batched by devices upon reconnecting.

## 3. API Endpoints
All API endpoints have a global prefix of `/api`. 

### Register Device
**`POST /api/device/register`**
Registers a new tablet or records its initial network connection footprint for the day.
```json
// Payload
{
  "device_id": "taxi-9wu77o406",
  "app_version": "1.0",
  "model": "android_tablet" // Optional
}
```

### Heartbeat
**`POST /api/device/heartbeat`**
Emits health status to evaluate fleet online presence. Also updates device last seen timestamp.
```json
// Payload
{
  "device_id": "taxi-9wu77o406",
  "battery_level": 85,
  "storage_free": "12GB"
}
```

### Sync
**`GET /api/device/sync?device_id=taxi-9wu77o406`**
Checks if new campaign content is available. 
```json
// Response
{
  "update": true,
  "campaign_version": 1714241029411,
  "videos": [
    {
      "id": "ad1",
      "url": "https://cdn.tad.com/videos/ad1.mp4",
      "duration": 15
    }
  ]
}
```

### Analytics
**`POST /api/analytics/event`**
Used for recording Proof-of-Play. The device buffers these and unloads them consecutively or in batches.
```json
// Payload
{
  "device_id": "taxi-9wu77o406",
  "event": "video_completed",
  "video_id": "ad1",
  "timestamp": "2026-03-06T12:20:00Z"
}
```

## 4. Taxi Analytics
Taxi Analytics or "Proof-of-Play" represents the primary metrics subsystem. Since devices operate primarily offline, events recorded continuously are aggregated into usable advertiser intelligence. 

### Core Concepts
* **Proof-of-Play**: Reliable confirmation that a campaign video was completely played inside a specific vehicle.
* **Aggregations**: Database aggregations via Prisma `groupBy` to calculate performance without dragging full history per request. This prevents Out-Of-Memory instances for millions of events.

### GET `/api/analytics/taxi/:device_id`
Retrieves granular playback counts per video for a specific taxi alongside total impressions.
```json
{
  "device_id": "taxi-9wu77o406",
  "total_plays": 142,
  "last_playback": "2026-03-06T12:20:00Z",
  "videos": [
    {
      "video_id": "ad1",
      "plays": 90
    }
  ]
}
```

### GET `/api/analytics/top-taxis`
Provides a listing of the most active displays, yielding a leaderboard for operators. Capped at 20 devices.
```json
[
  {
    "device_id": "taxi-9wu77o406",
    "plays": 142
  }
]
```

### GET `/api/analytics/hourly`
Provides general distribution of ad plays over different hours of the day `00-23` across the entire fleet to ascertain peak transit hours.
```json
[
  { "hour": "09", "plays": 32 },
  { "hour": "10", "plays": 41 }
]
```

## 5. Campaign Management System
The Campaign module permits administrators to inject campaigns and associate underlying video assets directly with them.

### Strategy & Future Scopes
The schema design includes features like `targetCities` and `targetFleets` to allow deeper geographical subsetting later without restructuring the relational database.

### API Breakdown

#### `POST /api/campaign`
Creates a container for an advertising campaign.
```json
// Payload Requirements
{
  "name": "Coca-Cola Summer Campaign",
  "advertiser": "Coca-Cola",
  "start_date": "2026-06-01",
  "end_date": "2026-06-30",
  "active": true
}
```

#### `POST /api/campaign/:id/video`
Assigns a distinct video loop to a previously created Campaign entity container.
```json
// Payload Requirements
{
  "title": "Coca-Cola Taxi Ad",
  "url": "https://cdn.tad.com/videos/coke-ad.mp4",
  "duration": 15
}
```

#### `GET /api/campaign`
Returns the complete list of campaigns presently managed inside the system alongside nested video elements.

#### `GET /api/campaign/:id`
Provides dedicated details concerning a specific campaign and its media items.

### Sync Delivery Pipeline
The player continuously checks `GET /api/device/sync`.
The Sync Endpoint queries the `CampaignService` filtering campaigns heavily:
- Must have `active: true`.
- Current server `Date()` must fall between the `start_date` and `end_date`.
All overlapping video payloads are flattened preventing excessive array digging on the Tablet layer resulting in seamless iteration.

## 6. Fleet Monitoring System
The Fleet module monitors hardware vitals continuously via the heartbeats emitted by tablets (detects `batteryLow` or `storageFull` incidents automatically) or when an unexpected event trips the `player_status`.

### Realtime Operational Endpoints

#### `GET /api/fleet/devices`
Fetches all known devices matching up their timestamp dynamically. Devices over 30 minutes without a heartbeat are tagged logically `offline`. 
```json
// Response
[
  {
    "device_id": "taxi-9wu77o406",
    "status": "online",
    "last_seen": "2026-03-06T12:20:00.000Z",
    "battery_level": 85,
    "player_status": "playing"
  }
]
```

#### `GET /api/fleet/offline`
Provides a filtered payload returning only devices that breached the 30-minute absence threshold natively through a Prisma Date query (avoids fetching the whole table into Memory):
```json
[
  {
    "device_id": "taxi-82js91aa",
    "last_seen": "2026-03-06T09:10:00Z"
  }
]
```

#### `GET /api/fleet/player-errors`
Queries nodes reporting an internal crash or logic break (e.g. video rendering skipped). 
```json
[
  {
    "device_id": "taxi-92aa3",
    "player_status": "error"
  }
]
```

## 7. Media Storage System
To prevent thousands of videos from clogging memory and inflating database bills, the platform implements a direct-to-cloud Media Module. S3 files skip PostgreSQL processing.

### Environment Setup
All variables must be properly provisioned to allow Multer components to upload binary data securely:
```env
STORAGE_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY="<key>"
STORAGE_SECRET_KEY="<secret>"
STORAGE_BUCKET="tad-media"
```

### Endpoints

#### `POST /api/media/upload` (Form-Data)
Uploads an `mp4` or `webm` asset directly into the S3 bucket and responds with the public CDN URL mapping.
**Requirements:** File size `≤ 50MB`.

```json
// Example Output
{
  "url": "https://cdn.tad.com/videos/ad123.mp4",
  "size": 10485760,
  "mime": "video/mp4"
}
```

#### `GET /api/media`
Iterates existing Cloud Storage items, parsing out public URLs preventing operators from needing AWS Dashboard access directly.
```json
// Example Output
[
  {
    "url": "https://cdn.tad.com/videos/ad1.mp4",
    "size": 10485760
  }
]
```

## 8. Deployment Instructions
This architecture is stateless and container-ready, making it suited for edge compute environments.

### Option A: Railway (Recommended for Postgres+App)
1. In your Railway Dashboard, click **New Project** -> **Deploy from GitHub repo**.
2. Select `tad-dooh-platform`. Railway will automatically configure the build process for Node.js if root directory is set to `/backend`.
3. Provide an environment setting `DATABASE_URL` via Railway's managed PostgreSQL addon.
4. Set the Build Command: `npm run build` and Start Command: `npm run start:prod`.
5. Run migrations automatically by adding `npx prisma db push` before start command, e.g., `START_COMMAND: "npx prisma db push && npm run start:prod"`.

### Option B: Render or Vercel
*   **Render**: Connect the GitHub branch to a Web Service on Render specifying `backend` as the Root directory. Connect optionally a Render Postgres instance.
*   **Vercel Serverless**: Update `vercel.json` optionally with `backend/src/main.ts` as a serverless function endpoint, though typical NestJS is better fitted on full compute services (Railway/Render) than Vercel natively. Ensure database instances have connection pooling available (e.g. Supabase).

## 9. Player Connection Instructions
The existing tablet player at `https://tad-simple-player.vercel.app` requires minor configuration code inside its javascript bundle or index file.

1. Configure an API Base URL constant pointing to your deployed Railway/Render URL:
   `const API_URL = "https://your-backend-railway.app/api";`
2. Configure offline queue logic for the frontend if not existing: LocalStorage array pushing metrics.
3. Every time internet connects:
    - Attempt `fetch(API_URL + "/device/sync")`
    - Loop through LocalStorage analytics arrays queue elements and hit `fetch(API_URL + "/analytics/event", { method: "POST", body: ... })`.
4. Implement Heartbeat polling at 5 minute intervals using Javascript `setInterval`, wrapping the heartbeat API endpoint fetch in `navigator.onLine` checks.
