// ─── TAD DOOH Player — SyncManager ───
// Manages the full sync cycle: manifest download, delta comparison,
// heartbeat pulse, and Supabase Realtime WAKE_UP_CALL listener.

import type {
  MediaAsset,
  DeviceSyncPayload,
  DeviceCommand,
  DeviceCommandResult,
  SyncManifest,
  CampaignSchedule,
} from "./types";
import { CacheManager } from "./cache-manager";
import { PlaybackQueue } from "./playback-queue";
import env from "./config";
import { attachNetworkListener } from "./network-listeners";
import { attachDeferredSubscription } from "./deferred-subscription";
import { isWakeUpForDevice } from "./wake-up-targeting";
import { prepareOfflinePlaylist } from "./offline-playlist-ready";

// ─── Browser Battery API (W3C) ───
// The W3C Battery Status API is not part of the installed lib.dom.d.ts.
// Add a minimal local augmentation so `"getBattery" in navigator` guards
// can cast to a typed proxy without resorting to `as any`.
interface NavigatorWithBattery extends Navigator {
  getBattery: () => Promise<{ level: number }>;
}

export class SyncManager {
  private deviceId: string = "";
  private lastSyncHash: string = "";
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private wakeUpDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly WAKE_UP_DEBOUNCE_MS = 5000; // 5s debounce to avoid API saturation
  private cacheManager: CacheManager;
  private playbackQueue: PlaybackQueue;
  private isOnline: boolean = navigator.onLine;
  private offlineLicenseExpiresAt: number | null = null;
  private offlineLicenseCheckTimer: ReturnType<typeof setInterval> | null =
    null;
  private networkListenerDisposers: Array<() => void> = [];
  private disposeRealtimeListener: (() => void) | null = null;
  private onPlaylistUpdate: (
    assets: MediaAsset[],
    schedules: CampaignSchedule[],
  ) => void;
  private onKillSwitch: (reason: string) => void;
  private onCommands: (
    commands: DeviceCommand[],
  ) => Promise<DeviceCommandResult[]>;

  constructor(
    cacheManager: CacheManager,
    playbackQueue: PlaybackQueue,
    callbacks: {
      onPlaylistUpdate: (
        assets: MediaAsset[],
        schedules: CampaignSchedule[],
      ) => void;
      onKillSwitch: (reason: string) => void;
      onCommands: (commands: DeviceCommand[]) => Promise<DeviceCommandResult[]>;
    },
  ) {
    this.cacheManager = cacheManager;
    this.playbackQueue = playbackQueue;
    this.onPlaylistUpdate = callbacks.onPlaylistUpdate;
    this.onKillSwitch = callbacks.onKillSwitch;
    this.onCommands = callbacks.onCommands;
  }

  init(deviceId: string): void {
    // Reinitialization must clear all timers, network handlers and Realtime.
    this.destroy();
    this.isOnline = navigator.onLine;
    this.deviceId = deviceId;
    this.playbackQueue.init(deviceId);
    this.setupNetworkListeners();
    this.startOfflineLicenseValidator(); // Fix #4: Restore offline license state from localStorage on boot
    this.executeFullSync();
    this.startHeartbeatLoop();
    this.startSyncLoop();
    this.setupRealtimeListener();
  }

  destroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (this.wakeUpDebounceTimer) clearTimeout(this.wakeUpDebounceTimer);
    if (this.offlineLicenseCheckTimer)
      clearInterval(this.offlineLicenseCheckTimer);
    for (const detach of this.networkListenerDisposers) {
      detach();
    }
    this.networkListenerDisposers = [];
    this.disposeRealtimeListener?.();
    this.disposeRealtimeListener = null;
    this.playbackQueue.destroy();
  }

  async executeFullSync(): Promise<void> {
    if (!this.isOnline || !this.deviceId) return;

    try {
      const payload: DeviceSyncPayload = await this.postDeviceSync();

      // Kill-switch check
      if (payload.blocked) {
        const reason = payload.reason || "awaiting_approval";
        this.revokeOfflineLicense();
        this.onKillSwitch(reason);
        return;
      }

      // A matching media hash still requires a renewed offline license.
      // Remote commands are also independent of whether creatives changed.
      if (payload.licenseToken && payload.expiresAt) {
        this.persistOfflineLicense(payload.licenseToken, payload.expiresAt);
      }

      if (payload.commands && payload.commands.length > 0) {
        // Dispatch is not proof of execution. Wait for the actual command
        // result before ACK, and never ACK failures or unknown outcomes.
        try {
          const outcomes = await this.onCommands(payload.commands);
          const delivered = new Set(payload.commands.map((cmd) => cmd.id));
          for (const outcome of outcomes) {
            if (outcome.success && delivered.has(outcome.id)) {
              await this.acknowledgeCommand(outcome.id);
            }
          }
        } catch {
          // A command failure must not block playlist/media sync or erase
          // offline content. The server keeps it pending reconciliation.
          console.warn(
            "[SyncManager] Command result unavailable; no execution ACK sent.",
          );
        }
      }

      // Delta check — no update needed
      if (!payload.update) {
        console.log("[SyncManager] Delta sync matches. No update needed.");
        return;
      }

      // The worker only ACKs that a download was scheduled, not that the
      // file is cached. Preserve the current offline playlist and hash until
      // every replacement file is durably available on the tablet.
      const assets = payload.media_assets || payload.videos || [];
      if (!(await prepareOfflinePlaylist(this.cacheManager, assets))) {
        console.warn(
          "[SyncManager] New playlist not fully cached; keeping current offline playlist.",
        );
        return;
      }

      this.lastSyncHash = payload.sync_hash;

      this.onPlaylistUpdate(assets, []);
    } catch (err) {
      console.error("[SyncManager] Full sync failed:", err);
    }
  }

  async executeManifestSync(): Promise<void> {
    if (!this.isOnline || !this.deviceId) return;

    try {
      const response = await fetch(`${env.API_URL}/sync/${this.deviceId}`, {
        cache: "no-store",
      });
      if ([402, 403, 404].includes(response.status)) {
        const reason =
          response.status === 402
            ? "SUBSCRIPTION_UNPAID"
            : response.status === 403
              ? "DEVICE_DEACTIVATED"
              : "DEVICE_NOT_FOUND_IN_CLUSTER";
        this.revokeOfflineLicense();
        this.onKillSwitch(reason);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const manifest: SyncManifest = await response.json();

      // Kill-switch from manifest
      if (manifest.killSwitch) {
        this.revokeOfflineLicense();
        this.onKillSwitch(manifest.killSwitchReason || "SUBSCRIPTION_UNPAID");
        return;
      }

      // The server issues a fresh license even when the media ETag matches.
      // Persist that license before skipping the expensive media update.
      if (manifest.licenseToken && manifest.expiresAt) {
        this.persistOfflineLicense(manifest.licenseToken, manifest.expiresAt);
      }

      // ETag comparison
      if (manifest.etag === this.lastSyncHash) {
        console.log("[SyncManager] Manifest ETag matches. No update.");
        return;
      }

      const assets = manifest.playlist || [];
      if (!(await prepareOfflinePlaylist(this.cacheManager, assets))) {
        console.warn(
          "[SyncManager] Manifest videos not fully cached; keeping current offline playlist.",
        );
        return;
      }

      this.lastSyncHash = manifest.etag;

      this.onPlaylistUpdate(assets, manifest.schedules || []);
    } catch (err) {
      console.error("[SyncManager] Manifest sync failed:", err);
    }
  }

  private async postDeviceSync(): Promise<DeviceSyncPayload> {
    const response = await fetch(`${env.API_URL}/device/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: this.deviceId,
        lastHash: this.lastSyncHash,
      }),
    });

    if (response.status === 402) {
      // Payment required — kill-switch
      return {
        update: false,
        blocked: true,
        sync_hash: "",
        media_assets: [],
        reason: "subscription_unpaid",
      };
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  private startHeartbeatLoop(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch((err) => {
        console.warn("[SyncManager] Heartbeat error:", err);
      });
    }, env.HEARTBEAT_INTERVAL_MS);
  }

  private startSyncLoop(): void {
    this.syncTimer = setInterval(() => {
      this.executeFullSync().catch((err) => {
        console.warn("[SyncManager] Sync loop error:", err);
      });
    }, env.SYNC_INTERVAL_MS);
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.isOnline || !this.deviceId) return;

    try {
      const payload = {
        device_id: this.deviceId,
        battery_level: await this.getBatteryLevel(),
        player_status: (
          document.getElementById("tad-player") as HTMLVideoElement | null
        )?.paused
          ? "paused"
          : "playing",
        timestamp: new Date().toISOString(),
      };

      await fetch(`${env.API_URL}/device/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Heartbeat is non-critical fire-and-forget
    }
  }

  private async acknowledgeCommand(commandId: string): Promise<void> {
    try {
      // Do not treat an unverified HTTP response (including 401/403) as ACK.
      // Device credentials must be provisioned via the secure pairing flow
      // (#233); an OFFLINE_LICENSE obtained from public manifest is NOT auth.
      const response = await fetch(
        `${env.API_URL}/device/command/${encodeURIComponent(commandId)}/ack`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        },
      );
      if (!response.ok) {
        console.warn(
          `[SyncManager] Command execution ACK rejected (HTTP ${response.status}).`,
        );
        return;
      }
      const receipt: { acknowledged?: boolean } = await response.json();
      if (!receipt.acknowledged) {
        console.warn(
          "[SyncManager] Command execution ACK not confirmed by server.",
        );
      }
    } catch {
      // Unknown ACK outcome: never assume the server recorded execution.
      console.warn("[SyncManager] Command execution ACK unavailable.");
    }
  }

  private setupNetworkListeners(): void {
    // Re-entrant init must not keep event handlers from an earlier session.
    for (const detach of this.networkListenerDisposers) detach();
    this.networkListenerDisposers = [
      attachNetworkListener(window, "online", () => {
        this.isOnline = true;
        console.log("[SyncManager] Network online — triggering immediate sync");
        this.executeFullSync();
        this.playbackQueue.flushQueue();
      }),
      attachNetworkListener(window, "offline", () => {
        this.isOnline = false;
        console.log("[SyncManager] Network offline — entering offline mode");
      }),
    ];
  }

  private setupRealtimeListener(): void {
    // A second init cannot retain an older WAKE_UP_CALL subscription.
    this.disposeRealtimeListener?.();
    this.disposeRealtimeListener = null;
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      console.warn(
        "[SyncManager] Supabase Realtime not configured — relying on poll-based sync only",
      );
      return;
    }

    this.disposeRealtimeListener = attachDeferredSubscription(
      // Import completes asynchronously; destroy may run before it resolves.
      () => import("@supabase/supabase-js"),
      ({ createClient }, isActive) => {
        const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        const channel = client.channel("fleet_sync");
        channel
          .on(
            "broadcast",
            { event: "WAKE_UP_CALL" },
            (payload: Record<string, unknown>) => {
              if (!isActive()) return;
              console.log("[SyncManager] WAKE_UP_CALL received:", payload);

              // SDK Broadcast messages carry their targets in payload.payload.
              // Never treat an explicit empty/invalid target list as global.
              if (!isWakeUpForDevice(payload, this.deviceId)) {
                console.log(
                  "[SyncManager] WAKE_UP_CALL skipped — not for this device",
                );
                return;
              }

              if (this.wakeUpDebounceTimer)
                clearTimeout(this.wakeUpDebounceTimer);
              this.wakeUpDebounceTimer = setTimeout(() => {
                if (!isActive()) return;
                this.executeFullSync();
                this.wakeUpDebounceTimer = null;
              }, this.WAKE_UP_DEBOUNCE_MS);
            },
          )
          .subscribe((status: string) => {
            if (!isActive()) return;
            console.log("[SyncManager] Realtime subscription status:", status);
          });

        return () => {
          // Never let a failed network unsubscribe break destroy().
          void Promise.resolve()
            .then(() => client.removeChannel(channel))
            .catch(() => {
              console.warn(
                "[SyncManager] Supabase Realtime channel removal failed",
              );
            });
        };
      },
      (error) => {
        console.warn("[SyncManager] Supabase Realtime disabled:", error);
      },
    );
  }

  // ── Fix #4: Offline License Persistence & Self-Destruct ──
  // Persiste el JWT de licencia offline y su fecha de expiración en localStorage.
  // Inicia un validator que evalúa cada 5 min si la licencia sigue válida.
  // Revocation changes authorization only; retain downloaded creatives so
  // they can be re-used after the device is legitimately reauthorized.
  private revokeOfflineLicense(): void {
    this.offlineLicenseExpiresAt = null;
    try {
      localStorage.removeItem("TAD_OFFLINE_LICENSE");
    } catch {
      // A blocked device must still receive its kill switch if storage fails.
    }
  }

  private persistOfflineLicense(token: string, expiresAt: string): void {
    try {
      const expiresAtMs = new Date(expiresAt).getTime();
      localStorage.setItem(
        "TAD_OFFLINE_LICENSE",
        JSON.stringify({
          token,
          expiresAt: expiresAtMs,
          persistedAt: Date.now(),
        }),
      );
      this.offlineLicenseExpiresAt = expiresAtMs;
      this.startOfflineLicenseValidator();
      console.log(
        `[SyncManager] Offline license persisted. Expires at: ${new Date(expiresAtMs).toISOString()}`,
      );
    } catch (err) {
      console.warn("[SyncManager] Failed to persist offline license:", err);
    }
  }

  // Evalúa cada 5 min si el JWT offline ha expirado.
  // Si expira y la tablet está offline → activa KillSwitch (SELF_DESTRUCT anti-ghosting).
  // Si expira y la tablet está online → fuerza un sync inmediato para refrescar la licencia.
  private startOfflineLicenseValidator(): void {
    if (this.offlineLicenseCheckTimer)
      clearInterval(this.offlineLicenseCheckTimer);

    // Cargar estado persistido al iniciar (si la tablet se reinicia offline)
    if (this.offlineLicenseExpiresAt === null) {
      try {
        const stored = localStorage.getItem("TAD_OFFLINE_LICENSE");
        if (stored) {
          const data = JSON.parse(stored);
          this.offlineLicenseExpiresAt = data.expiresAt || null;
        }
      } catch {
        /* non-critical */
      }
    }

    this.offlineLicenseCheckTimer = setInterval(() => {
      if (this.offlineLicenseExpiresAt === null) return;

      const now = Date.now();
      if (now >= this.offlineLicenseExpiresAt) {
        // Licencia expirada — determinar acción según conectividad
        if (this.isOnline) {
          console.warn(
            "[SyncManager] Offline license EXPIRED but online — refreshing sync",
          );
          this.executeFullSync();
        } else {
          // SELF_DESTRUCT: El conductor no puede reproducir contenido sin validar
          console.error(
            "[SyncManager] ⛔ Offline license EXPIRED and offline — activating SELF_DESTRUCT",
          );
          this.onKillSwitch("OFFLINE_LICENSE_EXPIRED");
        }
      }
    }, 300_000); // 5 min check interval
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      if ("getBattery" in navigator) {
        const battery = await (navigator as NavigatorWithBattery).getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      /* Battery API not available */
    }
    return undefined;
  }
}
