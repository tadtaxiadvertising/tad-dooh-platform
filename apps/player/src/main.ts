// ─── TAD DOOH Player — Main Entry Point ───
// Orchestrates all player subsystems: SyncManager, CacheManager,
// PlaylistEngine, PlaybackQueue, KillSwitch, FullyKiosk Bridge, and SW registration.

import { CacheManager } from "./cache-manager";
import { PlaybackQueue } from "./playback-queue";
import { SyncManager } from "./sync-manager";
import { PlaylistEngine } from "./playlist-engine";
import { KillSwitchEnforcer } from "./killswitch";
import { FullyKioskBridge } from "./fullykiosk-bridge";
import type {
  MediaAsset,
  DeviceCommand,
  DeviceCommandResult,
  PlayerStatus,
  CampaignSchedule,
} from "./types";

// ── Device ID Resolution ──
function resolveDeviceId(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get("deviceId") || urlParams.get("device_id");
  if (fromUrl) {
    localStorage.setItem("TAD_DEVICE_ID", fromUrl);
    return fromUrl;
  }
  const fromStorage = localStorage.getItem("TAD_DEVICE_ID");
  if (fromStorage) return fromStorage;
  console.error(
    "[TAD Player] No deviceId found. Provide via URL param: ?deviceId=XXX",
  );
  return "";
}

// ── Initialize all subsystems ──
async function initPlayer(): Promise<void> {
  const deviceId = resolveDeviceId();
  if (!deviceId) {
    window.dispatchEvent(
      new CustomEvent("TAD_UI_TOAST", {
        detail: "ERROR — DEVICE ID NOT FOUND",
      }),
    );
    return;
  }

  console.log(`[TAD Player] Initializing for device: ${deviceId}`);

  // 1. Register Service Worker
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[TAD Player] Service Worker registered");
    } catch (err) {
      console.warn("[TAD Player] Service Worker registration failed:", err);
    }
  }

  // 2. Initialize subsystems
  const cacheManager = new CacheManager();
  const playbackQueue = new PlaybackQueue();
  const killSwitch = new KillSwitchEnforcer();
  killSwitch.init();

  // Sprint 2: Register video downloader Web Worker (offload network I/O
  // from UI thread so the playlist never stutters on low-end tablets).
  // The worker handles pre-fetching and updates CacheManager's IndexedDB
  // via postMessage progress events.
  const worker = new Worker(
    new URL("./workers/video-downloader.worker.js", import.meta.url),
    { type: "module" },
  );
  (window as unknown as Record<string, unknown>).__tadVideoWorker = worker;

  worker.addEventListener("message", (event: MessageEvent) => {
    const { type, ok, enqueued, skipped, finished, failed, message } =
      event.data;

    switch (type) {
      case "SYNC_ASSETS_RESULT":
        if (ok && enqueued > 0) {
          // Tasks enqueued — trigger actual downloads
          worker.postMessage({
            type: "DOWNLOAD_ASSETS",
            requestId: `dl-${Date.now()}`,
            payload: { concurrency: 2 },
          });
        }
        if (skipped > 0) {
          console.log(
            `[TAD Player] Worker: ${skipped} assets already cached or downloading`,
          );
        }
        break;

      case "DOWNLOAD_STATUS":
        if (ok && typeof finished === "number") {
          console.log(
            `[TAD Player] Worker download complete: ${finished} done, ${failed ?? 0} failed`,
          );
        }
        break;

      case "ERROR":
        console.warn(`[TAD Player] Worker error: ${message}`);
        break;

      // PROGRESS events are informational only (non-critical)
      default:
        break;
    }
  });

  const kioskBridge = new FullyKioskBridge();
  kioskBridge.init();

  const playlistEngine = new PlaylistEngine(
    playbackQueue,
    cacheManager,
    (status: PlayerStatus) => {
      console.log(`[TAD Player] Status: ${status}`);
    },
  );
  playlistEngine.init(deviceId);

  const syncManager = new SyncManager(cacheManager, playbackQueue, {
    onPlaylistUpdate: (assets: MediaAsset[], schedules: CampaignSchedule[]) => {
      console.log(
        `[TAD Player] Playlist updated: ${assets.length} assets, ${schedules.length} schedules`,
      );
      playlistEngine.setPlaylist(assets, schedules);
    },
    onKillSwitch: (reason: string) => {
      console.warn(`[TAD Player] Kill-switch activated: ${reason}`);
      killSwitch.activate(reason);
      kioskBridge.lockKiosk().catch(() => {});
    },
    onCommands: async (
      commands: DeviceCommand[],
    ): Promise<DeviceCommandResult[]> => {
      const outcomes: DeviceCommandResult[] = [];
      for (const cmd of commands) {
        // We are already inside an active full-sync request: launching a
        // recursive sync is unnecessary and can race the command state.
        if (cmd.type === "FORCE_SYNC") {
          outcomes.push({ id: cmd.id, success: true });
          continue;
        }
        try {
          const success = await kioskBridge.handleCommand(cmd.type, cmd.params);
          // REBOOT / RESTART_APP may terminate the process before any
          // confirmation can be persisted. Do not falsely mark EXECUTED;
          // their unknown outcomes require a durable receipt protocol (#234).
          const irreversible =
            cmd.type === "REBOOT" || cmd.type === "RESTART_APP";
          outcomes.push({
            id: cmd.id,
            success: success && !irreversible,
          });
          if (irreversible) {
            console.warn(
              "[TAD Player] Restart outcome requires reconciliation; execution ACK withheld.",
            );
          }
        } catch {
          outcomes.push({ id: cmd.id, success: false });
        }
      }
      return outcomes;
    },
  });
  syncManager.init(deviceId);

  // 3. Screen Wake Lock (fallback if FullyKiosk not available)
  requestWakeLock();

  // 4. Visibility change handler (re-sync when tablet comes back to foreground)
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      console.log("[TAD Player] Tab visible — triggering sync");
      syncManager.executeFullSync();
      playbackQueue.flushQueue();
      kioskBridge.screenOn().catch(() => {});
    }
  });

  console.log("[TAD Player] ✅ All systems initialized");
}

// ── Screen Wake Lock ──
async function requestWakeLock(): Promise<void> {
  try {
    if ("wakeLock" in navigator) {
      const wakeLock = await navigator.wakeLock.request("screen");
      console.log("[TAD Player] Screen Wake Lock acquired");

      document.addEventListener("visibilitychange", async () => {
        if (!document.hidden && !wakeLock.released) {
          try {
            await navigator.wakeLock.request("screen");
          } catch {
            /* non-critical */
          }
        }
      });
    }
  } catch {
    console.warn(
      "[TAD Player] Wake Lock not available — relying on FullyKiosk",
    );
  }
}

// ── Boot ──
initPlayer().catch((err) => {
  console.error("[TAD Player] Fatal initialization error:", err);
  window.dispatchEvent(
    new CustomEvent("TAD_UI_TOAST", {
      detail: "ERROR FATAL — PLAYER INIT FAILED",
    }),
  );
});
