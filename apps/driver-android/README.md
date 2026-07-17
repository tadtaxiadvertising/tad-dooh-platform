# TAD Driver — Hybrid Native Architecture

Two native implementations of the TAD DOOH Driver app, each targeting different deployment scenarios.

## Architecture Comparison

| Feature | `driver-native` (RN/Expo) | `driver-android` (Kotlin/Compose) |
|---------|---------------------------|----------------------------------|
| **Framework** | React Native + Expo SDK 53 | Kotlin + Jetpack Compose |
| **Language** | TypeScript | Kotlin |
| **GPS** | expo-location + expo-task-manager | FusedLocationProviderClient (Google Play Services) |
| **Storage** | expo-sqlite (synchronous API) | Room SQLite (DAOs + Flow) |
| **UI** | NativeWind v4 + GlassmorphismStyles | Compose Canvas + Modifier.stitchedCard() |
| **Notifications** | expo-notifications | Android NotificationCompat |
| **API** | Direct axios/fetch (no CORS) | Retrofit + kotlinx.serialization |
| **Background** | expo-location Foreground Service | Android Foreground Service |
| **OTA Updates** | ✅ Expo EAS Update | ❌ Requires APK re-deployment |
| **Build** | EAS Build (cloud) | Gradle (local or CI) |
| **Monorepo** | ✅ Shared packages via metro | ❌ Separate Gradle module |
| **Deploy Target** | Dev/test tablets, rapid iteration | Production Kiosk tablets |

## When to Use Each

- **`driver-native`**: Feature development, rapid prototyping, OTA bug fixes, testing new flows
- **`driver-android`**: Production deployment on fleet tablets, lowest possible overhead, direct Google API access

## Immutable Business Rules (Both Apps)

| Rule | Value | Why |
|------|-------|-----|
| GPS debounce | 5 min (300,000ms) | Battery conservation on 4G mobile gateway |
| Offline buffer cap | 500 records | Storage ceiling on low-end tablets |
| Drip-sync chunk | 50 records | Backend rate-limiting compliance |
| Kill-Switch 402 | Lock overlay + GPS stop + auth purge | Subscription enforcement |
| Realtime throttle | 30s | MAP-SPEC-2026 Admin Map constraint |
| JWT TTL | 24h offline, 48h grace period | Anti-ghosting for offline devices |
| Compensation formula | min(activeAds, 15) × RD$500 | Business contract cap |
| Referral bonus | RD$500 per closed advertiser | Growth incentive |

## Backend Endpoints (Unchanged)

Both apps consume the same NestJS 10 API — zero backend modification required.

```
POST   /api/v1/drivers/login
POST   /api/v1/drivers
GET    /api/v1/drivers/me/hub
POST   /api/v1/drivers/:id/accept-agreement
PUT    /api/v1/wallet/bank
GET    /api/v1/drivers/me/transactions
POST   /api/v1/fleet/track-batch
POST   /api/v1/drivers/me/password
```

## Quick Start

### React Native (driver-native)
```bash
cd apps/driver-native
npm install
expo start
# For Android emulator: expo run:android
```

### Kotlin (driver-android)
```bash
cd apps/driver-android
# Generate gradlew: gradle wrapper
./gradlew assembleDebug
# Install on device: ./gradlew installDebug
```

## Design System: Stitched UI

Both apps share the same visual identity:
- **Primary Dark**: `#0C0F14` (midnight black canvas)
- **Accent**: `#FFD400` (TAD Yellow neon)
- **Glassmorphism**: semi-transparent zinc-900/40 backgrounds, white/5 borders, 40dp rounded corners
- **Performance Fallback**: ≤4 cores / ≤4GB RAM → solid backgrounds, reduced radius, no animations
- **MAP-SPEC-2026**: Binary color logic (yellow=online, red=offline), vehicle orientation headlights
