# 🌐 15 — API ENDPOINTS REFERENCE COMPLETE

> **Versión**: 15.1.0 (NestJS v12.1.2 — Social Agent + KYC Modules Added)
> **Última Actualización**: 2026-08-19
> **Base URL**: `https://tad-api.rewvid.easypanel.host/api/v1`
> **Audiencia**: Frontend Developers, Mobile Gateway, QA, Integration Partners

---

## 1. CONFIGURACIÓN GLOBAL

### 1.1 Route Prefix
- **Global Prefix**: `api/v1` (set in `main.ts`)
- **Port**: 3000 (default, configurable via `PORT` env var)

### 1.2 Authentication & Guards

| Guard | Purpose | Scope |
| --- | --- | --- |
| `SupabaseAuthGuard` | JWT validation (Supabase tokens) | Applied globally to all routes by default |
| `RolesGuard` | RBAC role check (ADMIN, ADVERTISER, DRIVER) | Applied after JWT validation |
| `SubscriptionGuard` | Kill-Switch — blocks if subscription unpaid | Applied on content sync endpoints (`device/sync`, `device/bulk-sync`) |
| `TenantGuard` | Ensures user can only access their own data | Applied on driver-specific endpoints |

### 1.3 Decorators

| Decorator | Purpose | Example |
| --- | --- | --- |
| `@Public()` | Bypass global auth guard (no JWT required) | Tablet endpoints, QR scans, telemetry batch |
| `@Roles(UserRole.ADMIN)` | Admin-only access | Fleet management, payroll |
| `@Roles(UserRole.ADVERTISER)` | Advertiser access | Campaign management, reports |
| `@Roles(UserRole.DRIVER)` | Driver-only access | Wallet, earnings |
| `@Throttle()` | Rate limiting | Default: 120 req/min, specific overrides per endpoint |

### 1.4 Interceptors

| Interceptor | Purpose | Applied To |
| --- | --- | --- |
| `IdempotencyInterceptor` | Prevents duplicate financial operations via `Idempotency-Key` header | Wallet write operations (`withdraw`, `updateBank`) |
| `SentryInterceptor` | Error reporting to Sentry | Global |
| `LoggerMiddleware` | Request/response logging | All routes (`forRoutes('*')`) |

---

## 2. AUTH MODULE (`/api/v1/auth`)

### `AuthController` — Authentication & Pairing

| Method | Route | Auth | Description | Request Body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/auth/login` | `@Public` | Admin login, returns JWT | `{ email, password }` | `{ access_token, user }` |
| `GET` | `/auth/profile` | JWT | Get current user profile | — | `{ id, email, name, role }` |
| `PUT` | `/auth/profile` | JWT | Update user profile/name/password | `{ name?, password?, currentPassword? }` | Updated user |
| `POST` | `/auth/pairing-token` | JWT | Generate 5-min pairing JWT for hardware QR | — | `{ token, expiresAt }` |
| `POST` | `/auth/driver/register` | `@Public` | Self-register a driver account | `{ name, phone, password, vehicleModel?, licensePlate? }` | `{ driver, access_token }` |

---

## 3. DRIVERS MODULE (`/api/v1/drivers`)

### `DriversController` — Driver CRUD & Business Logic

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/drivers` | ADMIN | List all drivers | — |
| `GET` | `/drivers/stats` | ADMIN | Network statistics (totals, averages) | — |
| `GET` | `/drivers/:id` | ADMIN, DRIVER (+ TenantGuard) | Single driver detail | `id` |
| `POST` | `/drivers` | `@Public` (Throttle: 3/min) | Register new driver | `{ fullName, phone, taxiPlate?, ... }` |
| `POST` | `/drivers/login` | `@Public` (Throttle: 5/min) | Driver phone login | `{ phone, password }` |
| `GET` | `/drivers/:id/earnings` | ADMIN, DRIVER (+ TenantGuard) | Monthly earnings calculation | `id` |
| `PUT` | `/drivers/:id/subscription` | ADMIN | Update subscription status (RD$6,000) | `{ paid, endDate? }` |
| `POST` | `/drivers/:id/accept-agreement` | ADMIN, DRIVER (+ TenantGuard) | Electronic signature (legal) | `{ version }` |
| `POST` | `/drivers/:id/assign-device` | ADMIN | Link tablet to driver | `{ deviceId }` |
| `POST` | `/drivers/:id/unlink-device` | ADMIN | Remove tablet from driver | — |
| `GET` | `/drivers/tablet/:tabletId/access` | `@Public` | **Kill-Switch check** — returns 402 if unpaid | `tabletId` |
| `GET` | `/drivers/me/hub` | DRIVER | Driver hub data (wallet, campaigns, referral) | JWT entityId |
| `GET` | `/drivers/:id/hub-preview` | ADMIN | Admin preview of driver hub | `id` |
| `GET` | `/drivers/device/:deviceId/hub-preview` | ADMIN | Admin preview by device | `deviceId` |
| `GET` | `/drivers/tablet/:tabletId/hub` | `@Public` (x-tablet-key header) | Tablet hub data (offline-first) | `tabletId` + `x-tablet-key` |
| `POST` | `/drivers/purge-all` | ADMIN + `x-admin-secret` header | **DANGER**: Purge ALL drivers/devices | `x-admin-secret` |
| `DELETE` | `/drivers/:id` | ADMIN | Remove single driver | `id` |
| `POST` | `/drivers/:id/active-ads` | — | Link active ad to driver | `campaignId` |

**Kill-Switch Flow:**
1. Tablet calls `GET /drivers/tablet/:tabletId/access`
2. If `subscriptionPaid = false` → HTTP 402 Payment Required
3. If `subscriptionPaid = true` → HTTP 200 with `{ access: true, driverName, ... }`

---

## 4. DEVICE MODULE (`/api/v1/device`)

### `DeviceController` — Tablet Communication (No JWT Required)

| Method | Route | Auth | Description | Request Body |
| --- | --- | --- | --- | --- |
| `POST` | `/device/register` | `@Public` | Register new tablet hardware | `{ deviceId, name? }` |
| `POST` | `/device/heartbeat` | `@Public` (Throttle: 500/min) | Send heartbeat (battery, storage, status) | `{ deviceId, batteryLevel, storageFree, ... }` |
| `POST` | `/device/playback` | `@Public` | Record proof-of-play event | `{ deviceId, campaignId, eventType, videoId, lat?, lng? }` |
| `POST` | `/device/sync` | `@Public` + **SubscriptionGuard** | Sync playlist manifest (KILL-SWITCH protected) | `{ deviceId, syncHash? }` |
| `POST` | `/device/bulk-sync` | `@Public` + **SubscriptionGuard` | Bulk sync for multiple campaigns | `{ deviceId, campaigns[] }` |
| `GET` | `/device/:id/slots` | — | Check ad slot usage (max 15) | `id` |
| `POST` | `/device/command/:id/ack` | `@Public` | Acknowledge a device command | `{ result }` |

**Critical Note:** `/device/sync` and `/device/bulk-sync` are protected by `SubscriptionGuard`. If the device's driver has `subscriptionPaid = false`, these endpoints return **HTTP 402 Payment Required** with `{ killSwitch: true }`.

---

## 5. DEVICES ADMIN MODULE (`/api/v1/devices`)

### `DeviceAdminController` — Admin Fleet Management

| Method | Route | Auth | Description | Key Params/Body |
| --- | --- | --- | --- | --- |
| `GET` | `/devices/pending` | ADMIN | List devices awaiting approval | — |
| `POST` | `/devices/:deviceId/approve` | ADMIN | Approve device → ACTIVE | `deviceId` |
| `DELETE` | `/devices/:deviceId/reject` | ADMIN | Reject/delete pending device | `deviceId` |
| `GET` | `/devices/:deviceId/campaigns` | — | Get campaigns assigned to a device | `deviceId` |
| `DELETE` | `/devices/:deviceId/campaigns/:campaignId` | — | Remove campaign from device | `deviceId`, `campaignId` |
| `POST` | `/devices` | — | Create device manually | `{ deviceId, taxiNumber?, city? }` |
| `PUT` | `/devices/:id` | — | Update device data | `{ taxiNumber?, city?, status?, driverId? }` |
| `DELETE` | `/devices/:deviceId` | — | Atomic purge of device + all related telemetry | `deviceId` |
| `GET` | `/devices/:deviceId/profile` | — | Full device profile (device + driver + campaigns) | `deviceId` |
| `PUT` | `/devices/:deviceId/profile` | — | Update device + driver profile | `deviceId` + body |

---

## 6. CAMPAIGNS MODULE (`/api/v1/campaigns`)

### `CampaignController` — Campaign CRUD & Distribution

| Method | Route | Auth | Description | Key Params/Body |
| --- | --- | --- | --- | --- |
| `GET` | `/campaigns/advertiser/hub` | `@Public` | Public advertiser catalog (brand hub) | — |
| `GET` | `/campaigns/advertiser/:id/profile` | `@Public` | Public advertiser profile (QR scan landing) | `id` |
| `GET` | `/campaigns` | ADMIN, ADVERTISER | List all campaigns (advertiser: filtered by own) | — |
| `POST` | `/campaigns` | ADMIN, ADVERTISER | Create new campaign | `{ name, advertiser, startDate, endDate, budget, ... }` |
| `GET` | `/campaigns/:id` | ADMIN, ADVERTISER | Get campaign detail | `id` |
| `PATCH` | `/campaigns/:id` | ADMIN, ADVERTISER | Update campaign | `id` + body |
| `DELETE` | `/campaigns/:id` | ADMIN, ADVERTISER | Delete campaign + related data | `id` |
| `POST` | `/campaigns/register-media` | ADMIN, ADVERTISER | Register media metadata after direct upload | `{ storageKey, url, filename, ... }` |
| `POST` | `/campaigns/:id/assets` | ADMIN, ADVERTISER | Add media asset to campaign | `id` + `{ type, filename, url, fileSize, checksum }` |
| `POST` | `/campaigns/simulate-budget` | ADMIN, ADVERTISER | Estimate impact based on RD$ budget | `{ budgetRD, city }` |
| `POST` | `/campaigns/:id/generate-video` | ADMIN, ADVERTISER | Trigger Remotion video generation | `id` + `{ logoUrl, brandColor, primaryText, secondaryText }` |
| `POST` | `/campaigns/:id/assign` | ADMIN | Assign campaign to specific devices | `id` + `deviceIds[]` |
| `POST` | `/campaigns/:id/drivers` | ADMIN | Assign drivers to campaign (segmentation) | `id` + `{ driverIds[], targetAll }` |
| `POST` | `/campaigns/:id/link-media` | — | Link existing media to campaign | `id` + `mediaId` |
| `POST` | `/campaigns/:id/unlink-media` | — | Unlink media + force sync on affected devices | `id` + `mediaId` |
| `GET` | `/campaigns/stats/:id/distribution` | ADMIN, ADVERTISER | Get campaign distribution (which taxis, revenue) | `id` |
| `GET` | `/campaigns/:campaignId/devices` | — | Get devices receiving this campaign | `campaignId` |
| `GET` | `/campaigns/tablet/:deviceId/playlist` | `@Public` | Tablet playlist manifest (offline-first) | `deviceId` |
| `GET` | `/campaigns/reports/summary` | ADMIN, ADVERTISER | Campaign KPIs summary | — |
| `POST` | `/campaigns/intent` | `@Public` | Pre-registration intent (before payment) | `{ brandName, budget, expectedScreens }` |

---

## 7. ANALYTICS MODULE (`/api/v1/analytics`)

### `AnalyticsController` — Telemetry & Reporting

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `POST` | `/analytics/event` | `@Public` | Ingest single analytics event | `{ deviceId, eventType, ... }` |
| `POST` | `/analytics/batch` | `@Public` | **Batch ingest** analytics events (tablet sync) | `events[]` |
| `GET` | `/analytics/qr-scan` | `@Public` | Track QR scan + redirect to brand URL | `campaignId`, `deviceId` |
| `GET` | `/analytics/campaign/:id` | JWT | Campaign analytics (advertiser: own only) | `id` |
| `GET` | `/analytics/device/:id` | JWT | Device analytics | `id` |
| `GET` | `/analytics/summary` | ADMIN, ADVERTISER | Analytics summary (KPIs) | — |
| `GET` | `/analytics/total-impressions` | ADMIN, ADVERTISER | Total impressions count | — |
| `GET` | `/analytics/anti-fraud` | ADMIN, ADVERTISER | Anti-fraud metrics | — |
| `GET` | `/analytics/top-taxis` | ADMIN, ADVERTISER | Top performing taxis | — |
| `GET` | `/analytics/hourly` | ADMIN, ADVERTISER | Hourly analytics breakdown | — |
| `GET` | `/analytics/recent-plays` | ADMIN, ADVERTISER | Recent playback events | — |
| `GET` | `/analytics/heatmap` | ADMIN, ADVERTISER | Playback heatmap (geographic) | `advertiserId?` |
| `GET` | `/analytics/campaign/:id/weekly` | JWT | Weekly campaign metrics | `id` |
| `GET` | `/analytics/campaign/:id/weekly/pdf` | JWT | Download weekly PDF report | `id` |
| `POST` | `/analytics/campaign/:id/share-whatsapp` | JWT | Share report via WhatsApp | `{ phone, advertiserName, campaignName, reportUrl }` |
| `POST` | `/analytics/external-gps` | `@Public` | GPS ping from mobile gateway | `{ deviceId, lat, lng, speed?, driverId? }` |

---

## 8. FLEET MODULE (`/api/v1/fleet`)

### `FleetController` — Fleet Operations & Tracking

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/fleet/devices` | ADMIN | List all fleet devices | — |
| `GET` | `/fleet/stats` | ADMIN | Fleet statistics | — |
| `GET` | `/fleet/status-summary` | ADMIN | Device status summary (online/offline/critical) | — |
| `GET` | `/fleet/summary` | ADMIN | Alias for status-summary | — |
| `GET` | `/fleet/map` | ADMIN, ADVERTISER | Fleet map data (lat/lng per device) | — |
| `GET` | `/fleet/offline` | ADMIN | Offline devices list | — |
| `GET` | `/fleet/finance` | ADMIN | Fleet financial overview | — |
| `GET` | `/fleet/tracking` | ADMIN | Real-time tracking data | — |
| `GET` | `/fleet/tracking/summary` | ADMIN, ADVERTISER | Tracking summary with counts | — |
| `GET` | `/fleet/tracking/baseline` | ADMIN, ADVERTISER | Tracking baseline (alias for map) | — |
| `GET` | `/fleet/devices/:id/recent-path` | ADMIN | Recent GPS path for a device | `id` |
| `POST` | `/fleet/:id/command` | ADMIN | Send command to specific device | `id` + `{ type, params? }` |
| `POST` | `/fleet/broadcast-command` | ADMIN | Broadcast command to ALL devices | `{ type, params? }` |
| `POST` | `/fleet/register` | ADMIN | Register device by admin | `{ placa, driverName, deviceId? }` |
| `POST` | `/fleet/track-batch` | `@Public` | **Batch GPS telemetry ingest** (mobile gateway) | `TrackBatchDto` |

### `TrackingController` — Tracking Subset

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/tracking/baseline` | ADMIN, ADVERTISER | Tracking baseline (alias for fleet map) |

---

## 9. FINANCE MODULE (`/api/v1/finance`)

### `FinanceController` — Payroll, Invoicing & Financial Intelligence

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/finance/payroll` | ADMIN | Monthly payroll calculations | `month?`, `year?` |
| `POST` | `/finance/payroll/pay` | ADMIN | Process single driver payment | `{ driverId, month, year, reference }` |
| `POST` | `/finance/payroll/trigger` | ADMIN | Trigger bulk monthly billing for ALL drivers | `{ month?, year? }` |
| `POST` | `/finance/payroll/whatsapp-confirm` | ADMIN | Send WhatsApp payment confirmation | `{ phone, driverName, amount, month }` |
| `POST` | `/finance/payroll/email-confirm` | ADMIN | Send email payment confirmation + PDF | `{ email, driverName, amount, month, driverId? }` |
| `GET` | `/finance/summary` | ADMIN | MRR, burn rate, net projections | — |
| `GET` | `/finance/investor-metrics` | ADMIN | Unit economics (ARPU, yield, churn) | — |
| `GET` | `/finance/ledger` | ADMIN | General ledger (last 50 transactions) | — |
| `POST` | `/finance/transactions` | ADMIN | Record new financial transaction | `{ type, category, amount, entityId?, reference?, note? }` |
| `GET` | `/finance/report/campaigns` | ADMIN | Campaign billing report | — |
| `GET` | `/finance/invoice/:campaignId` | ADMIN | HTML invoice for campaign | `campaignId` |
| `GET` | `/finance/report/campaign/:id/pdf` | ADMIN | **Proof-of-Play PDF** download | `id` |
| `GET` | `/finance/report/fleet/pdf` | ADMIN | Fleet inventory PDF | — |
| `GET` | `/finance/transaction/:id/pdf` | ADMIN | Transaction receipt PDF | `id` |
| `POST` | `/finance/report/campaign/:id/email` | ADMIN | Email Proof-of-Play PDF | `id` + `{ email, advertiserName? }` |
| `POST` | `/finance/invoice/:campaignId/email` | ADMIN | Email invoice PDF | `campaignId` + `{ email, amount? }` |
| `GET` | `/finance/export/payroll.csv` | ADMIN | Export payroll CSV | `month`, `year` |
| `GET` | `/finance/export/campaigns.csv` | ADMIN | Export campaigns billing CSV | — |
| `GET` | `/finance/export/campaign/:id.csv` | ADMIN | Export single campaign CSV | `id` |

---

## 10. WALLET MODULE (`/api/v1/wallet`)

### `WalletController` — Driver Wallet Operations (DRIVER role only)

| Method | Route | Auth | Description | Request Body | Validation |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/wallet/balance` | DRIVER | Get available balance | — | driverId from JWT |
| `POST` | `/wallet/withdraw` | DRIVER + IdempotencyInterceptor | Request withdrawal | `{ amount }` | Zod: `amount > 0, max 500,000` |
| `PUT` | `/wallet/bank` | DRIVER + IdempotencyInterceptor | Update bank info | `{ banco, cuenta, tipo, cedula, ownerName? }` | Zod: banco min 3 chars, cuenta 10-20 digits, tipo AHORRO|CORRIENTE, cedula 11 digits |

**Security Note:** `driverId` is ALWAYS extracted from JWT (`req.user.entityId`). Never accepted from body/query params to prevent account manipulation.

---

## 11. BI MODULE (`/api/v1/bi`)

### `BiController` — Business Intelligence Dashboard (ADMIN only)

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/bi/kpis` | ADMIN | Master KPIs (MRR, fleet, impressions, revenue) | — |
| `GET` | `/bi/fleet-health` | ADMIN | Fleet health semáforo table | — |
| `GET` | `/bi/fleet-health/:deviceId/drill-down` | ADMIN | 360° taxi profile (GPS, battery, financials) | `deviceId` |
| `POST` | `/bi/reconciliation/generate` | ADMIN | Generate reconciliation report | `{ period: "YYYY-MM" }` |
| `GET` | `/bi/reconciliation/:period` | ADMIN | Get reconciliation report | `period` |
| `GET` | `/bi/hotspots` | ADMIN, ADVERTISER | Geographic hotspots (high impression areas) | — |

---

## 12. SYNC MODULE (`/api/v1/sync`)

### `SyncController` — Playlist Manifest for Tablets

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/sync/:deviceId` | `@Public` | Get device manifest (campaigns, media URLs, kill-switch) | `deviceId` |

**Response Structure:**
```json
{
  "deviceId": "abc-123",
  "killSwitch": false,
  "campaigns": [
    {
      "id": "camp-1",
      "name": "Brand Campaign",
      "media": [{ "url": "https://...", "hashMd5": "abc..." }],
      "priority": 1
    }
  ],
  "syncHash": "sha256-of-manifest"
}
```

---

## 13. MEDIA MODULE (`/api/v1/media`)

### `MediaController` — Media Upload & Management

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/media/upload-url` | JWT | Get Supabase Storage signed URL for direct upload | `fileName`, `fileType` |
| `POST` | `/media/register-bypassed` | JWT | Register media after direct upload to Supabase | `{ filename, storageKey, publicUrl }` |
| `GET` | `/media` | JWT | List all media files | — |
| `GET` | `/media/:id/status` | JWT | Get media processing status | `id` |
| `DELETE` | `/media/:id` | JWT | Delete media (standard HTTP DELETE) | `id` |
| `POST` | `/media/:id/delete` | JWT | Delete media (POST fallback for legacy tablets) | `id` |
| `POST` | `/media/:id` | JWT | Delete media (POST fallback) | `id` |
| `PATCH` | `/media/:id` | JWT | Update media (e.g. add QR URL) | `id` + `{ qrUrl }` |

---

## 14. MONITORING MODULE (`/api/v1/monitoring`)

### `MonitoringController` — Fleet GPS & Status Monitoring

| Method | Route | Auth | Description | Request Body |
| --- | --- | --- | --- | --- |
| `POST` | `/monitoring/gps-batch` | `@Public` | GPS batch from tablets (5-min debounce) | `GpsBatchDto` |
| `GET` | `/monitoring/fleet-status` | `@Public` (ADMIN recommended) | Fleet status summary | — |
| `GET` | `/monitoring/campaigns-status` | ADMIN | Active campaigns status | — |

---

## 15. ADVERTISERS MODULE (`/api/v1/advertisers`)

### `AdvertisersController` — Advertiser Portal

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/advertisers` | ADMIN | List all advertisers | — |
| `POST` | `/advertisers/login` | `@Public` (Throttle: 5/min) | Advertiser login | `{ email, password }` |
| `POST` | `/advertisers/recover-password` | `@Public` | Password recovery request | `{ email }` |
| `GET` | `/advertisers/:id` | ADMIN, ADVERTISER | Advertiser detail | `id` |
| `GET` | `/advertisers/:id/portal` | ADMIN, ADVERTISER | Portal data (brand, stats, financials, campaigns, timeSeries) | `id` |
| `GET` | `/advertisers/:id/invoices` | ADMIN, ADVERTISER | Invoices and billing data | `id` |
| `POST` | `/advertisers` | `@Public` (Throttle: 3/min) | Self-register advertiser | `{ companyName, contactName, email, phone? }` |
| `PUT` | `/advertisers/:id` | ADMIN | Update advertiser | `id` + body |
| `DELETE` | `/advertisers/:id` | ADMIN | Delete advertiser | `id` |
| `POST` | `/advertisers/reset-password` | `@Public` | Reset password with token | `{ token, newPassword }` |

---

## 16. REFERRAL MODULE (`/api/v1/referral`)

### `ReferralController` — QR Referral System

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/referral/generate/:driverId` | — | Generate referral QR code for driver | `driverId` |
| `GET` | `/referral/stats` | — | Referral network statistics | — |
| `GET` | `/referral/network` | — | Full referral network tree | — |

---

## 17. ONBOARDING MODULE (`/api/v1/onboarding`)

### `OnboardingController` — Self-Registration Flow

| Method | Route | Auth | Description | Request Body |
| --- | --- | --- | --- | --- |
| `POST` | `/onboarding/advertiser` | `@Public` | Self-register advertiser with campaign intent | `OnboardAdvertiserDto` |

---

## 18. SIMULATION MODULE (`/api/v1/simulation`)

### `SimulationController` — Load Testing (No Auth, No Throttle)

| Method | Route | Auth | Description | Request Body |
| --- | --- | --- | --- | --- |
| `GET` | `/simulation/state` | `@Public` (@SkipThrottle) | Get current simulation state | — |
| `POST` | `/simulation/scenario` | `@Public` (@SkipThrottle) | Start simulation scenario | `ScenarioConfig` |
| `POST` | `/simulation/stop` | `@Public` (@SkipThrottle) | Stop simulation | — |
| `DELETE` | `/simulation/purge` | `@Public` (@SkipThrottle) | Purge all simulated data | — |

---

## 19. NOTIFICATIONS MODULE (`/api/v1/notifications`)

### `NotificationsController` — System Alerts

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/notifications` | JWT | List all notifications |
| `GET` | `/notifications/unread-count` | JWT | Count of unread notifications |
| `POST` | `/notifications/mark-all-read` | JWT | Mark all as read |
| `PUT` | `/notifications/:id/read` | JWT | Mark single as read |
| `POST` | `/notifications/test-alert` | JWT | Create test notification |

---

## 20. PORTAL REQUESTS MODULE (`/api/v1/portal-requests`)

### `PortalRequestsController` — Cross-Portal Requests

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `POST` | `/portal-requests` | ADMIN / ADVERTISER / DRIVER | Create request with owner taken from authenticated session; campaign references require advertiser ownership | body + Bearer |
| `GET` | `/portal-requests` | ADMIN | List all requests | — |
| `GET` | `/portal-requests/advertiser/:advertiserId` | ADMIN / owning ADVERTISER | Requests by advertiser; `TenantGuard` checks `:advertiserId` | `advertiserId` |
| `GET` | `/portal-requests/driver/:driverId` | ADMIN / owning DRIVER | Requests by driver; `TenantGuard` checks `:driverId` | `driverId` |
| `GET` | `/portal-requests/:id` | ADMIN | Single request detail | `id` |
| `PUT` | `/portal-requests/:id` | ADMIN | Update request (admin notes / approval, P0 review #299) | `id` + body |
| `DELETE` | `/portal-requests/:id` | ADMIN | Delete request | `id` |

---

## 21. SHEETS MODULE (`/api/v1/sheets`)

### `SheetsController` — Google Sheets Secondary DB (SRE Backup)

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `POST` | `/sheets/sync` | `@Public` | Manual sync all tables to Google Sheets | — |
| `GET` | `/sheets/report` | `@Public` | Fallback data from Sheets (when DB is down) | — |
| `GET` | `/sheets/invoice/:driverId` | JWT | Download driver settlement PDF from Sheets data | `driverId` |

---

## 22. SYSTEM SETTINGS MODULE (`/api/v1/system-settings`)

### `SystemSettingsController` — Dynamic Configuration

| Method | Route | Auth | Description | Request Body |
| --- | --- | --- | --- | --- |
| `GET` | `/system-settings` | ADMIN | Get all settings | — |
| `PUT` | `/system-settings` | ADMIN | Update multiple settings | `{ key: value, ... }` |

---

## 23. ASSETS MODULE (`/api/v1/assets`)

### `AssetsController` — Asset Manifest for Tablets

| Method | Route | Auth | Description | Key Params |
| --- | --- | --- | --- | --- |
| `GET` | `/assets/manifest` | `@Public` | Get asset manifest for a device (offline cache) | `device_id` |
| `POST` | `/assets/webhook/supabase` | `@Public` | Handle Supabase storage webhook | payload |

---

## 14b. TELEMETRY MODULE (`/api/v1/telemetry`) — ⚠️ REVENUE SHIELD v12.2.5

> **CRITICAL:** This module was missing from previous versions of this document. It contains the anti-fraud playback validation logic that protects the platform's revenue.

### `TelemetryController` — GPS Sync & Anti-Fraud Playback

#### POST `/telemetry/sync` — Bulk GPS Telemetry

| Field | Detail |
| --- | --- |
| **Auth** | JWT (requires global AuthGuard) |
| **Throttle** | Default 120/min |
| **Request Body** | `{ driverId: string; lat: number; lng: number; speed: number; timestamp?: string }[]` |
| **Max Batch** | 500 points per request |
| **Response** | `{ success: true }` (fire-and-forget) |
| **Dedup** | Raw SQL `ON CONFLICT (driver_id, timestamp) DO NOTHING` |
| **Anti-OOM** | Chunked inserts (100 per chunk), no `.map()` chains |

#### POST `/telemetry/playback` — Anti-Fraud Validated Playback (REVENUE SHIELD)

| Field | Detail |
| --- | --- |
| **Auth** | `@Public` — tablets send without JWT |
| **Throttle** | Default + in-memory 60/min per deviceId |
| **Request Body** | `{ deviceId: string; videoId: string; eventType: 'START' | 'END' | 'ERROR'; lat?: number; lng?: number; clientTimestamp?: string }` |
| **Request Headers** | `x-tablet-key` (optional, shared-secret device verification) |
| **Response (success)** | `{ success: true, verified: boolean }` |
| **Response (duplicate)** | `{ success: true, duplicate: true }` |
| **Response (failure)** | `{ success: false, reason: string, message: string }` |

**Anti-Fraud Validation (5 checks):**
1. **Rate limit**: Max 60 playback events/min per deviceId (sliding window, auto-prune >1000 map entries)
2. **Device validation**: deviceId must exist with `status === 'OPERATIVO'`
3. **Tablet key** (optional): `x-tablet-key` header validated against `device.authToken`
4. **Campaign validation**: videoId must belong to campaign with `active=true && status='ACTIVE'`
5. **Timestamp window**: `clientTimestamp` within [-5min, +1min] of server time

**Dedup:** `ON CONFLICT (device_id, video_id, timestamp) DO NOTHING` — same device+video+same-minute = duplicate. Falls back to Prisma ORM if raw SQL fails.

#### POST `/telemetry/playback-batch` — Batch Anti-Fraud Playback

| Field | Detail |
| --- | --- |
| **Auth** | `@Public` |
| **Throttle** | Default + in-memory per-device rate limit (accounts for batch size) |
| **Request Body** | Array of same single-playback objects (all same deviceId) |
| **Max Batch** | 200 events per request |
| **Response (success)** | `{ success: true, processed: number, rejected: number }` |
| **Response (failure)** | `{ success: false, reason: string }` |

**Validation:** Empty payload check, missing deviceId check, device OPERATIVO check, video validation per unique videoId (warns on invalid but doesn't reject batch), rate limit with `additionalCount = payload.length`.

---

## 24. HEALTH MODULE (`/api/v1/health`)

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | `@Public` | Liveness probe — `{ status, timestamp, service, node_env }` |
| `GET` | `/health/db` | `@Public` | DB connectivity — `{ connected, activeConnections }` from `pg_stat_activity` |
| `GET` | `/health/full` | `@Public` | Full diagnostics — `{ status, timestamp, service, node_env, db: { connected, activeConnections }, memory: process.memoryUsage(), uptime }` |

---

## 25. APP CONTROLLER (Root Routes — excluded from `api/v1` prefix)

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | `@Public` | API info + route directory |
| `GET` | `/api` | `@Public` | Same as root (alias) |
| `GET` | `/api/v1` | `@Public` | Same as root (alias) |
| `GET` | `/api/health` | `@Public` | Health probe (EasyPanel v10+ requirement) |

---

## 25b. SOCIAL AGENT MODULE (`/api/v1/social-agent`)

> **⚠️ NEW MODULE (v12.3):** Meta Messenger/Instagram DM integration with AI-powered content generation.

### `SocialAgentController` — Meta Webhook & Content Management

| Method | Route | Auth | Description | Request Body/Params |
| --- | --- | --- | --- | --- |
| `GET` | `/social-agent/webhooks/meta` | `@Public` | Meta webhook verification (hub.challenge) | `hub.mode`, `hub.verify_token`, `hub.challenge` |
| `POST` | `/social-agent/webhooks/meta` | `@Public` | Receive Meta webhook callbacks (Messenger/IG DM) | Meta payload |
| `GET` | `/social-agent/drafts` | ADMIN | List pending post drafts for approval | — |
| `POST` | `/social-agent/approve/:id` | ADMIN | Approve draft → publish to Meta | `id` |
| `POST` | `/social-agent/reject/:id` | ADMIN | Reject draft (set status REJECTED) | `id` |
| `POST` | `/social-agent/trigger-cron` | ADMIN | Manually trigger daily content generation | — |

**Flow:**
1. Meta sends webhook → `handleWebhook()` processes message
2. Social Agent generates content via AI → stores in `SocialPostDraft` (status: PENDING)
3. Admin reviews drafts via `GET /social-agent/drafts`
4. Admin approves → `POST /social-agent/approve/:id` → publishes to Meta

**Dependencies:** Requires `META_VERIFY_TOKEN` env var for webhook verification.

---

## 25c. KYC MODULE (`/api/v1/kyc`)

> **v12.3:** Driver document verification (cédula, licencia, seguro). Runs in MOCK mode without `KYC_API_KEY`.

### `KYCController` — Document Verification Routes

| Method | Route | Auth | Description | Request Body |
| --- | --- | --- | --- | --- |
| `POST` | `/kyc/submit` | JWT | Submit driver document for verification | `{ driverId, documentType, documentNumber, fileHash?, metadata? }` |
| `GET` | `/kyc/pending` | ADMIN | List drivers with pending KYC review | — |
| `POST` | `/kyc/:id/approve` | ADMIN | Approve KYC documents | `id` (driverId) |
| `POST` | `/kyc/:id/reject` | ADMIN | Reject KYC documents with reason | `id` + `{ reason }` |
| `GET` | `/kyc/:id/status` | JWT | Get KYC status for a driver | `id` (driverId) |

**Document Types:** `CEDULA` (11 digits), `LICENCIA`, `PASAPORTE`, `SEGURO`

**Modes:**
- **MOCK** (default): Stores in `Driver.identidadVehicular` JSON field, marks as `PENDING_REVIEW`
- **PRODUCTION** (with `KYC_API_KEY`): Integrates with Onfido/Persona for automated verification

**Integration:** KYC approval sets `Driver.onboardingStatus = "COMPLETED"` and updates `identidadVehicular.kyc_status = "APPROVED"`.

---

## 26. SUMMARY TABLE — ALL ENDPOINTS

| Module | Route Prefix | # Endpoints | Auth Level |
| --- | --- | --- | --- |
| **Auth** | `/auth` | 5 | Public + JWT |
| **Drivers** | `/drivers` | 17 | Mixed (Public, JWT, ADMIN) |
| **Device** | `/device` | 7 | Public + SubscriptionGuard |
| **Devices Admin** | `/devices` | 11 | ADMIN |
| **Campaigns** | `/campaigns` | 18 | Mixed (Public, JWT, ADMIN) |
| **Analytics** | `/analytics` | 16 | Mixed (Public, JWT, ADMIN) |
| **Fleet** | `/fleet` | 14 | Mixed (Public, ADMIN) |
| **Tracking** | `/tracking` | 1 | ADMIN, ADVERTISER |
| **Finance** | `/finance` | 16 | ADMIN |
| **Wallet** | `/wallet` | 3 | DRIVER + Idempotency |
| **BI** | `/bi` | 6 | ADMIN |
| **Sync** | `/sync` | 1 | Public |
| **Media** | `/media` | 8 | JWT |
| **Monitoring** | `/monitoring` | 3 | Mixed |
| **Advertisers** | `/advertisers` | 9 | Mixed |
| **Referral** | `/referral` | 3 | — |
| **Onboarding** | `/onboarding` | 1 | Public |
| **Simulation** | `/simulation` | 4 | Public (SkipThrottle) |
| **Notifications** | `/notifications` | 5 | JWT |
| **Portal Requests** | `/portal-requests` | 6 | Mixed |
| **Sheets** | `/sheets` | 3 | Mixed |
| **System Settings** | `/system-settings` | 2 | ADMIN |
| **Assets** | `/assets` | 2 | Public |
| **Telemetry** | `/telemetry` | 3 | Public + JWT |
| **Health** | `/health` | 3 | Public |
| **App Root** | `/` | 4 | Public |
| **Social Agent** | `/social-agent` | 6 | Public + ADMIN |
| **KYC** | `/kyc` | 5 | JWT + ADMIN |
| **TOTAL** | — | **~151** | — |

---

## 28. ENDPOINT OVERLAP — Tablet Routing Table

> **⚠️ CRITICAL:** Multiple endpoints serve similar purposes. Tablets must use the **correct** endpoint for each operation.

| Tablet Operation | Correct Endpoint | Wrong Alternative | Why |
| --- | --- | --- | --- |
| GPS telemetry (bulk) | `POST /telemetry/sync` | `POST /monitoring/gps-batch` | `/telemetry/sync` has dedup (`ON CONFLICT DO NOTHING`) + chunked inserts |
| Playback event (single) | `POST /telemetry/playback` | `POST /device/playback` | `/telemetry/playback` has **5-point anti-fraud validation** (REVENUE SHIELD) |
| Playback event (batch) | `POST /telemetry/playback-batch` | `POST /analytics/batch` | `/telemetry/playback-batch` has per-device rate limit + dedup |
| Analytics event (general) | `POST /analytics/event` | — | Correct for non-playback analytics |
| Analytics batch (general) | `POST /analytics/batch` | — | Correct for bulk non-playback analytics |
| Manifest sync | `GET /sync/manifest` | `GET /campaigns/tablet/:deviceId/playlist` | `/sync/manifest` has ETag + SubscriptionGuard |
| Fleet tracking upload | `POST /fleet/track-batch` | `POST /monitoring/gps-batch` | `/fleet/track-batch` is fleet-optimized |

**Rule:** Always use the `/telemetry/*` endpoints for playback and GPS. Use `/analytics/*` for non-playback events.

---

## 29. SUBSCRIPTIONGUARD NUANCE — Kill-Switch Enforcement

> **⚠️ SECURITY CONCERN:** Two different `SubscriptionGuard` implementations exist:

| Module | Guard Behavior | Kill-Switch? | Notes |
| --- | --- | --- | --- |
| **Device** (`/device/sync`, `/device/bulk-sync`) | **Enforced** — checks `Subscription.validUntil < now()` → returns 402 | ✅ Yes | 48h grace period before hard-block |
| **Driver** (`/drivers/*` endpoints) | **Stub** — `return true;` always passes | ❌ No | No revenue protection on driver portal access |

**Implication:** A driver with expired subscription can still access their portal endpoints, but their **tablet** will receive 402 on sync. The Kill-Switch is enforced at the device/tablet level, not the driver portal level.

---

## 30. COMMON ERROR RESPONSES

| HTTP Status | Meaning | Context |
| --- | --- | --- |
| `200` | Success | Standard response |
| `201` | Created | New entity registered |
| `304` | Not Modified | Manifest hash unchanged (ETag) |
| `400` | Bad Request | Missing/invalid params |
| `401` | Unauthorized | Missing or invalid JWT |
| `402` | Payment Required | **Kill-Switch**: subscription unpaid |
| `403` | Forbidden | Role mismatch or tenant violation |
| `404` | Not Found | Entity doesn't exist |
| `409` | Conflict | Duplicate entity |
| `429` | Too Many Requests | Throttler limit exceeded |
| `500` | Internal Server Error | Unhandled exception |
| `503` | Service Unavailable | DB connection failure |

---

*This document is auto-generated from the NestJS controller source code. Update after each controller modification.*