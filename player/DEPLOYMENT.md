# TAD DOOH - Tablet Production Deployment & Fully Kiosk Configuration

This document outlines how to compile the tablet player into a rapid static application, host it dynamically, and configure Android tablets manually mapped with "Fully Kiosk Browser" to create highly stable, resilient loops.

## 1. Production Build Pipeline

The frontend uses Vite to bundle the TypeScript layers directly into plain JS that the Android WebViews process seamlessly without external loading artifacts.

**Running a build:**
```bash
cd player
npm install
npm run build
```

This generates `dist/`:
```text
dist/
├── index.html
└── assets/
    └── player.js
```
*Note: Due to the `vite.config.ts` options applied natively, chunk hashing is disabled, ensuring `player.js` is globally accessible cleanly.*

## 2. Deploying the Environment (Vercel)

Since the frontend resolves strictly via native AJAX loops, it requires purely static hosting capable of mapping HTTP requests reliably.

1. Create a GitHub Repo mapping strictly your internal workspace.
2. Inside Vercel, attach the repository. 
3. Configure **Root Directory** as `player`.
4. Leave Vercel settings under `Framework Preset: Vite`. 
5. Inject Environment variables pointing to your custom backend domain:
   - `VITE_API_URL` = `https://your-backend-production-domain.com/api`

Vercel will build scaling the endpoints infinitely. Keep the URL copied for Step 3.

## 3. Fully Kiosk Browser Configuration Guide

Android devices inherently drop network loops or lock memory. **Fully Kiosk** locks the operating system directly wrapping the `TAD Player`.

### Installation
Install "Fully Kiosk Browser" directly from the Google Play store or side-load the `APK` directly onto the taxi displays.

### Launch Settings
1. Open Fully Kiosk.
2. Set the `Start URL`:
   - `https://your-vercel-domain.vercel.app/`

### Web Content Configuration (`Settings -> Web Content Settings`)
*   **Enable JavaScript**: `ON`
*   **Ignore SSL Errors**: `ON` *(Optional, useful in heavily proxied regions)*
*   **Auto Play Media**: `ON` *(Required to inject video loops un-muted naturally)*

### Device Behaviour (`Settings -> Device Management`)
*   **Keep Screen On**: `ON`
*   **Screen Brightness**: Automatic / 100%

### Auto-Reloads (`Settings -> Auto Reload`)
*   **Auto Reload on Idle**: `ON` (Set to something like 600 seconds IF you want hard-refreshes daily, though the player natively handles caching).
*   **Auto Reload on Start Url**: `OFF`
*   **Reload on Internet Reconnect**: `ON` *(Crucial - Triggers the frontend `window.ononline` to dump event caches dynamically).*

### Kiosk Mode (Security - `Settings -> Kiosk Mode`)
*   **Enable Kiosk Mode**: `ON`
*   **Disable Status Bar**: `ON`
*   **Disable Navigation Bar**: `ON`
*   **Disable Volume Buttons**: `ON` (If videos maintain global volumes or are purely visual).
*   **Kiosk Exit PIN**: Setup a secure 4 digit pin ensuring drivers cannot exit out into the tablet OS.

## 4. End-to-End System Integration Test

Once you provision an instance, map exactly the workflow below to ensure endpoints parse logic successfully:

1. **Physical Boot**: Power on the Tablet. Fully Kiosk auto-loads the configured Vercel payload globally. 
2. **Device Registration**: The player mounts mapping a random variable inside Native Storage (`taxi-9xujx` etc). It pulses `POST /api/device/heartbeat` tracking memory quotas initially.
3. **Database Injection**: Refresh your `Admin Dashboard -> Fleet`. Your device will show **"Online"** reporting its raw UUID + Battery logic.
4. **Active Syncing**: The device reaches out to `GET /device/sync`. Finding fresh loops mapped to variables, it parses the JSON logic out.
5. **AWS Loading**: `VideoCache.ts` leverages the Service Worker logic downloading loops explicitly onto the `Cache` preventing cellular bleeding.
6. **Hard Disconnect**: Pull the WiFi out. Turn off mobile data natively on the Tablet.
7. **Offline Testing**: Wait 5 minutes. Watch the videos parse effectively from native cache.
8. **Watchdog Verification**: Reconnect WiFi. As standard sequences map backwards validating HTTP links: 
    - The queue array offloads `POST /api/device/playback` records directly into the backend `PlaybackEvent` pipeline reporting historical anomalies.
    - Dashboard will reflect new aggregate traffic patterns implicitly!

The ecosystem is robust and ready for scaling thousands of terminals simultaneously.
