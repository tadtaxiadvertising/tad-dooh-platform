// ─── TAD DOOH Player — SyncManager ───
// Manages the full sync cycle: manifest download, delta comparison,
// heartbeat pulse, and Supabase Realtime WAKE_UP_CALL listener.

import type {
  MediaAsset,
  DeviceSyncPayload,
  DeviceCommand,
  SyncManifest,
  CampaignSchedule,
} from "./types";
import { CacheManager } from "./cache-manager";
import { PlaybackQueue } from "./playback-queue";
import env from "./config";

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
  private onPlaylistUpdate: (
    assets: MediaAsset[],
    schedules: CampaignSchedule[],
  ) => void;
  private onKillSwitch: (reason: string) => void;
  private onCommands: (commands: DeviceCommand[]) => void;

  constructor(
    cacheManager: CacheManager,
    playbackQueue: PlaybackQueue,
    callbacks: {
      onPlaylistUpdate: (
        assets: MediaAsset[],
        schedules: CampaignSchedule[],
      ) => void;
      onKillSwitch: (reason: string) => void;
      onCommands: (commands: DeviceCommand[]) => void;
    },
  ) {
    this.cacheManager = cacheManager;
    this.playbackQueue = playbackQueue;
    this.onPlaylistUpdate = callbacks.onPlaylistUpdate;
    this.onKillSwitch = callbacks.onKillSwitch;
    this.onCommands = callbacks.onCommands;
  }

  init(deviceId: string): void {
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
    this.playbackQueue.destroy();
  }

  async executeFullSync(): Promise<void> {
    if (!this.isOnline || !this.deviceId) return;

    try {
      const payload: DeviceSyncPayload = await this.postDeviceSync();

      // Kill-switch check
      if (payload.blocked) {
        const reason = payload.reason || "awaiting_approval";
        this.onKillSwitch(reason);
        return;
      }

      // Delta check — no update needed
      if (!payload.update) {
        console.log("[SyncManager] Delta sync matches. No update needed.");
        return;
      }

      // Process commands
      if (payload.commands && payload.commands.length > 0) {
        this.onCommands(payload.commands);
        // Acknowledge commands
        for (const cmd of payload.commands) {
          this.acknowledgeCommand(cmd.id).catch(() => {});
        }
      }

      // Download + cache new assets
      const assets = payload.media_assets || payload.videos || [];
      if (assets.length > 0) {
        const result = await this.cacheManager.cacheVideos(assets);
        console.log(
          `[SyncManager] Cached ${result.cached}/${assets.length} assets (${result.failed} failed)`,
        );
        await this.cacheManager.evictStaleAssets(assets);
      }

      this.lastSyncHash = payload.sync_hash;

      // Fix #4: Persistir licencia offline para validación anti-ghosting.
      // Si el JWT expira tras 48h sin handshake del servidor, el Player debe
      // activar el KillSwitch (pantalla negra "Conecte a Internet para Validar").
      if (payload.licenseToken && payload.expiresAt) {
        this.persistOfflineLicense(payload.licenseToken, payload.expiresAt);
      }

      this.onPlaylistUpdate(assets, []);
    } catch (err) {
      console.error("[SyncManager] Full sync failed:", err);
    }
  }

  async executeManifestSync(): Promise<void> {
    if (!this.isOnline || !this.deviceId) return;

    try {
      const response = await fetch(`${env.API_URL}/sync/${this.deviceId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const manifest: SyncManifest = await response.json();

      // Kill-switch from manifest
      if (manifest.killSwitch) {
        this.onKillSwitch(manifest.killSwitchReason || "SUBSCRIPTION_UNPAID");
        return;
      }

      // ETag comparison
      if (manifest.etag === this.lastSyncHash) {
        console.log("[SyncManager] Manifest ETag matches. No update.");
        return;
      }

      const assets = manifest.playlist || [];
      if (assets.length > 0) {
        const result = await this.cacheManager.cacheVideos(assets);
        console.log(
          `[SyncManager] Manifest cached ${result.cached}/${assets.length} assets`,
        );
        await this.cacheManager.evictStaleAssets(assets);
      }

      this.lastSyncHash = manifest.etag;

      // Fix #4: Persistir licencia offline del manifest
      if (manifest.licenseToken && manifest.expiresAt) {
        this.persistOfflineLicense(manifest.licenseToken, manifest.expiresAt);
      }

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
      await fetch(`${env.API_URL}/device/command/${commandId}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: { acknowledged: true } }),
      });
    } catch {
      /* non-critical */
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("[SyncManager] Network online — triggering immediate sync");
      this.executeFullSync();
      this.playbackQueue.flushQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("[SyncManager] Network offline — entering offline mode");
    });
  }

  private setupRealtimeListener(): void {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      console.warn(
        "[SyncManager] Supabase Realtime not configured — relying on poll-based sync only",
      );
      return;
    }

    try {
      // Dynamic import to avoid bundling Supabase when not configured
      import("@supabase/supabase-js")
        .then(({ createClient }) => {
          const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
          client
            .channel("fleet_sync")
            .on(
              "broadcast",
              { event: "WAKE_UP_CALL" },
              (payload: Record<string, unknown>) => {
                console.log("[SyncManager] WAKE_UP_CALL received:", payload);

                // Fix #1: Filtrar por targets — solo sincronizar si este device está
                // en la lista de destinatarios. Si no hay targets, es un broadcast global.
                const targets = payload.targets as string[] | undefined;
                if (
                  targets &&
                  Array.isArray(targets) &&
                  targets.length > 0 &&
                  !targets.includes(this.deviceId)
                ) {
                  console.log(
                    "[SyncManager] WAKE_UP_CALL filtered out — device not in targets",
                  );
                  return;
                }

                // Fix #2: Debounce de 5s — si llegan múltiples WAKE_UP_CALL en ráfaga
                // (ej: campaign_updated + media_asset_added), solo ejecutar el último.
                // Esto previbe saturar el API Gateway con peticiones duplicadas.
                if (this.wakeUpDebounceTimer)
                  clearTimeout(this.wakeUpDebounceTimer);
                this.wakeUpDebounceTimer = setTimeout(() => {
                  this.executeFullSync();
                  this.wakeUpDebounceTimer = null;
                }, this.WAKE_UP_DEBOUNCE_MS);
              },
            )
            .subscribe((status: string) => {
              console.log(
                "[SyncManager] Realtime subscription status:",
                status,
              );
            });
        })
        .catch((err) => {
          console.warn(
            "[SyncManager] Supabase import failed, Realtime disabled:",
            err,
          );
        });
    } catch {
      console.warn("[SyncManager] Realtime listener setup failed");
    }
  }

  // ── Fix #4: Offline License Persistence & Self-Destruct ──
  // Persiste el JWT de licencia offline y su fecha de expiración en localStorage.
  // Inicia un validator que evalúa cada 5 min si la licencia sigue válida.
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
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      /* Battery API not available */
    }
    return undefined;
  }
}
