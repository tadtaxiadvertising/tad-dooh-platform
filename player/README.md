# TAD DOOH - Tablet Player Integration Layer

This module handles native offline media routing strictly preventing high data usage across mobile networks natively. All videos cache locally into IndexedDB / Core Object Cache natively.

## Project Structure Explained

- `api/sync.ts` - Native loader hitting NestJS `GET /api/device/sync`.
- `api/heartbeat.ts` - Emits physical network payload logic natively every 5mins. 
- `api/playback.ts` - Ingests `POST /api/device/playback` to verify Proof-of-Play cleanly on completion sequences.
- `storage/video-cache.ts` - Heavy loader caching `blob:http` >50MB seamlessly overriding Network thresholds.
- `storage/event-queue.ts` - LocalStorage router keeping unsynced Proof-of-Plays mapping locally while vehicles traverse dead-zones. 
- `player/video-engine.ts` - Core `.mp4` / `.webm` HTML DOM looper featuring a natively built internal Health Watchdog detecting stagnant videos stopping.
- `scheduler/daily-sync.ts` - The Master Orchestrator linking the API into Storage logic. Boot straps once on start and whenever network emits `window.ononline`.

## How to Deploy / Bundle

Because this uses ES6 modules and TypeScript, this code needs to be bundled before directly assigning to your `tablet-player/index.html` file.

1. Init an NPM directory locally in this folder, install exactly Vite to compile JS payloads.
```bash
cd player
npm install -g typescript
npx tsc --init
# Compile
npx tsc
```

Alternatively embed using Vite or Webpack producing `dist/main.js`. 

## How to Test

1. Map the code to a target web view containing: `<video id="tad-player" autoplay muted controls></video>` 
2. Set backend running locally or map `.env` / `import.meta.env.VITE_API_URL` directly containing the backend mapping URL.
3. Turn off Network inside Developer Tools specifically.
4. Verify your loops still natively map sequences pulling chunks out of local DB! Note when turning Internet back "Online", your Network tab dumps the payload queue concurrently resolving missing analytics blocks!

Enjoy the strictly offline native routing architecture mappings!
