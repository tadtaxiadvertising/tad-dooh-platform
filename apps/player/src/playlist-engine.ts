// ─── TAD DOOH Player — PlaylistEngine ───
// Manages the sequential video loop with intermission transitions,
// QR overlay, watchdog timer, and fallback behavior.

import type { MediaAsset, PlayerStatus, CampaignSchedule } from "./types";
import { PlaybackQueue } from "./playback-queue";
import { CacheManager } from "./cache-manager";
import env from "./config";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Business rule: each ad occupies an exact 30-second slot
// (mirrors BUSINESS_RULES.AD_SLOT_DURATION_SECONDS in apps/api)
const AD_SLOT_DURATION_MS = 30_000;

// C4: Nº máximo de errores de reproducción consecutivos antes de ceder a fallback idle.
const MAX_CONSECUTIVE_ERRORS = 5;

export class PlaylistEngine {
  private playlist: MediaAsset[] = [];
  private activePlaylist: MediaAsset[] = [];
  private currentIndex: number = 0;
  private schedules: CampaignSchedule[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private playbackQueue: PlaybackQueue;
  private cacheManager: CacheManager;
  private status: PlayerStatus = "idle";
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private intermissionTimer: ReturnType<typeof setTimeout> | null = null;
  private isTransitioning: boolean = false;
  private errorBackoffMs: number = 2000;
  private consecutiveErrors: number = 0;
  private deviceId: string = "";
  private onStatusChange?: (status: PlayerStatus) => void;
  private _scheduleCheckTimer: ReturnType<typeof setInterval> | null = null;

  // DOM references
  private intermissionScreen: HTMLElement | null = null;
  private intermissionAdvertiserName: HTMLElement | null = null;
  private intermissionQr: HTMLImageElement | null = null;
  private intermissionTimerBar: HTMLElement | null = null;
  private qrContainer: HTMLElement | null = null;

  constructor(
    playbackQueue: PlaybackQueue,
    cacheManager: CacheManager,
    onStatusChange?: (status: PlayerStatus) => void,
  ) {
    this.playbackQueue = playbackQueue;
    this.cacheManager = cacheManager;
    this.onStatusChange = onStatusChange;
  }

  init(deviceId: string): void {
    this.deviceId = deviceId;
    this.videoElement = document.getElementById(
      "tad-player",
    ) as HTMLVideoElement;
    this.intermissionScreen = document.getElementById("intermission-screen");
    this.intermissionAdvertiserName = document.getElementById(
      "intermission-advertiser-name",
    );
    this.intermissionQr = document.getElementById(
      "intermission-qr",
    ) as HTMLImageElement;
    this.intermissionTimerBar = document.getElementById(
      "intermission-timer-bar",
    );
    this.qrContainer = document.getElementById("qr-container");

    if (this.videoElement) {
      this.attachVideoEvents();
    }
    this.startScheduleCheckLoop();
  }

  setPlaylist(assets: MediaAsset[], schedules?: CampaignSchedule[]): void {
    // FIX LEAK-1: Clean up existing timers before rebuilding playlist
    this.clearWatchdog();
    if (this._scheduleCheckTimer) {
      clearInterval(this._scheduleCheckTimer);
      this._scheduleCheckTimer = null;
    }

    if (assets.length === 0) {
      this.showFallback();
      return;
    }

    this.playlist = assets;
    this.schedules = schedules || [];
    this.currentIndex = 0;
    this.rebuildActivePlaylist();
    // playNext() is async now but we fire-and-forget here;
    // errors are handled inside playNext()
    void this.playNext();
  }

  getPlaylistLength(): number {
    return this.activePlaylist.length;
  }

  getStatus(): PlayerStatus {
    return this.status;
  }

  // ── Schedule-Aware Playlist Filter ──
  private rebuildActivePlaylist(): void {
    const now = new Date();
    const currentDay = DAY_NAMES[now.getDay()];
    const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (this.schedules.length === 0) {
      // No scheduling data — play everything (legacy 24/7 behavior)
      this.activePlaylist = this.applyWeightedOrder(this.playlist);
      return;
    }

    const eligibleCampaignIds = new Set<string>();
    for (const schedule of this.schedules) {
      const days = schedule.scheduleDays;
      const hours = schedule.scheduleHours;

      // Empty/null schedule = always eligible (24/7)
      if (!days || days.length === 0) {
        eligibleCampaignIds.add(schedule.campaignId);
        continue;
      }

      if (days.includes(currentDay)) {
        if (!hours || hours.length === 0) {
          eligibleCampaignIds.add(schedule.campaignId);
        } else {
          // Check if current hour falls within any hour range
          for (const hourRange of hours) {
            if (this.isHourInRange(currentHour, hourRange)) {
              eligibleCampaignIds.add(schedule.campaignId);
              break;
            }
          }
        }
      }
    }

    const filtered = this.playlist.filter((a) =>
      eligibleCampaignIds.has(a.campaignId),
    );
    this.activePlaylist = this.applyWeightedOrder(
      filtered.length > 0 ? filtered : this.playlist,
    );
  }

  private isHourInRange(current: string, range: string): boolean {
    // Supports "HH:MM" or "HH:MM-HH:MM" format
    if (range.includes("-")) {
      const [start, end] = range.split("-");
      return current >= start && current <= end;
    }
    return current >= range;
  }

  private applyWeightedOrder(assets: MediaAsset[]): MediaAsset[] {
    // Weighted shuffle: assets with higher weight appear more frequently
    const maxWeight = Math.max(...assets.map((a) => a.weight || 1));
    if (maxWeight <= 1) return assets; // No weighting needed

    const weighted: MediaAsset[] = [];
    for (const asset of assets) {
      const repeatCount = asset.weight || 1;
      for (let i = 0; i < repeatCount; i++) {
        weighted.push(asset);
      }
    }

    // Fisher-Yates shuffle for randomized weighted order
    for (let i = weighted.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
    }
    return weighted;
  }

  private startScheduleCheckLoop(): void {
    // Re-check schedule every 60 seconds to activate/deactivate campaigns
    this._scheduleCheckTimer = setInterval(() => {
      this.rebuildActivePlaylist();
      // If current video is no longer in active playlist, transition to next eligible
      if (this.activePlaylist.length > 0) {
        const currentAsset = this.activePlaylist[this.currentIndex];
        if (!this.activePlaylist.some((a) => a.id === currentAsset?.id)) {
          this.currentIndex = 0;
          void this.playNext();
        }
      }
    }, 60_000);
  }

  private attachVideoEvents(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener("ended", () => this.handleTransition());
    this.videoElement.addEventListener("error", () => this.onPlaybackError());
    this.videoElement.addEventListener("stalled", () => this.resetWatchdog());
    this.videoElement.addEventListener("waiting", () => this.resetWatchdog());
  }

  private async playNext(): Promise<void> {
    if (this.activePlaylist.length === 0 || !this.videoElement) return;
    if (window.tadKillSwitchActive) return;

    const asset = this.activePlaylist[this.currentIndex];
    this.setStatus("playing");
    // C4: un intento de reproducción exitoso resetea el backoff de errores.
    this.consecutiveErrors = 0;
    this.errorBackoffMs = 2000;
    // Fixed 30s slot: transition even if the video is longer
    this.startWatchdog(
      Math.min(asset.duration * 1000 + 5000, AD_SLOT_DURATION_MS),
    );

    // Generate QR URL for the current campaign
    const qrUrl = this.generateQrUrl(asset);
    if (qrUrl) {
      this.showQrOverlay(qrUrl);
    } else {
      this.hideQrOverlay();
    }

    // Track playback start
    this.playbackQueue
      .saveToQueue({
        device_id: this.deviceId,
        video_id: asset.id,
        timestamp: Date.now(),
        event_type: "play_start",
      })
      .catch(() => {
        // Persist failures must be observable; do not print event data.
        console.error(
          "[PlaylistEngine] PoP START not persisted to offline queue",
        );
      });

    // FIX LEAK-2: Resolve video source from CacheManager (IndexedDB blob URL)
    // instead of streaming directly from CDN. This enables true offline playback.
    try {
      const blobUrl = await this.cacheManager.getVideoSource(asset);
      this.videoElement.src = blobUrl;
    } catch (err) {
      console.warn(
        `[PlaylistEngine] Cache miss for ${asset.filename}, falling back to CDN:`,
        err,
      );
      // Fallback: try direct CDN URL (may fail if offline)
      this.videoElement.src = asset.url;
    }

    this.videoElement.play().catch((err) => {
      console.warn("[PlaylistEngine] Auto-play blocked:", err);
      // Retry with muted (bypass browser policy)
      this.videoElement!.muted = true;
      this.videoElement!.play().catch(() => this.onPlaybackError());
    });
  }

  private handleTransition(): void {
    if (this.activePlaylist.length === 0) return;

    // A1: guard anti-race — si el watchdog y el evento `ended` se disparan juntos
    // (video que termina justo cuando expira el slot fijo), evita que currentIndex
    // avance dos veces y se salte un asset.
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    try {
      this.clearWatchdog();
      this.doTransition();
    } finally {
      this.isTransitioning = false;
    }
  }

  private doTransition(): void {
    const currentAsset = this.activePlaylist[this.currentIndex];

    // Track playback completion (PoP — Proof of Play)
    this.playbackQueue
      .saveToQueue({
        device_id: this.deviceId,
        video_id: currentAsset.id,
        timestamp: Date.now(),
        event_type: "play_confirm",
      })
      .catch(() => {
        // A missing END proof must not disappear as a silent accounting gap.
        console.error(
          "[PlaylistEngine] PoP END not persisted to offline queue",
        );
      });

    // Advance index (wraps around the active playlist)
    this.currentIndex = (this.currentIndex + 1) % this.activePlaylist.length;

    // Show intermission screen (5s transition with QR)
    this.showIntermission(currentAsset);
  }

  private showIntermission(_previousAsset: MediaAsset): void {
    this.setStatus("intermission");
    this.clearWatchdog();

    const nextAsset = this.activePlaylist[this.currentIndex];
    const nextAdvertiser = nextAsset.advertiserName || "TAD";
    const nextQrUrl = this.generateQrUrl(nextAsset);

    // Update intermission UI
    if (this.intermissionAdvertiserName) {
      this.intermissionAdvertiserName.textContent = nextAdvertiser;
    }
    if (this.intermissionQr && nextQrUrl) {
      this.intermissionQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=${encodeURIComponent(nextQrUrl)}`;
    }
    if (this.intermissionScreen) {
      this.intermissionScreen.style.display = "block";
    }

    // Timer bar animation
    if (this.intermissionTimerBar) {
      this.intermissionTimerBar.style.width = "0%";
      requestAnimationFrame(() => {
        this.intermissionTimerBar!.style.width = "100%";
      });
    }

    // Auto-advance after intermission duration
    // A1: guardar el timer para cancelarlo si ocurre otra transición antes.
    if (this.intermissionTimer) clearTimeout(this.intermissionTimer);
    this.intermissionTimer = setTimeout(() => {
      this.intermissionTimer = null;
      if (this.intermissionScreen) {
        this.intermissionScreen.style.display = "none";
      }
      if (this.intermissionTimerBar) {
        this.intermissionTimerBar.style.width = "0%";
      }
      void this.playNext();
    }, env.INTERMISSION_DURATION_MS);
  }

  private showQrOverlay(qrUrl: string): void {
    if (!this.qrContainer) return;
    const img = this.qrContainer.querySelector("img");
    if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrUrl)}`;
    }
    this.qrContainer.style.display = "block";
  }

  private hideQrOverlay(): void {
    if (this.qrContainer) {
      this.qrContainer.style.display = "none";
    }
  }

  private generateQrUrl(asset: MediaAsset): string | null {
    if (asset.qrUrl) return asset.qrUrl;
    // Build a TAD landing page URL from campaign metadata
    return null;
  }

  private onPlaybackError(): void {
    console.error(
      "[PlaylistEngine] Playback error on asset:",
      this.activePlaylist[this.currentIndex]?.filename,
    );

    // C4: reintento limitado con backoff. Antes reintentaba cada 2s SIN límite,
    // quemando red/CPU en un loop infinito cuando TODOS los assets fallaban
    // (p. ej. CDN inalcanzable y cache vacía). Tras N fallos consecutivos entra
    // en fallback idle y espera el próximo ciclo de schedule.
    this.consecutiveErrors += 1;
    if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn(
        `[PlaylistEngine] ${this.consecutiveErrors} errores consecutivos — entrando en fallback idle.`,
      );
      this.consecutiveErrors = 0;
      this.showFallback();
      return;
    }
    this.setStatus("error");

    // Skip to next asset with exponential backoff (2s → 4s → 8s … cap 60s)
    this.currentIndex = (this.currentIndex + 1) % this.activePlaylist.length;
    const delay = Math.min(this.errorBackoffMs, 60_000);
    this.errorBackoffMs = this.errorBackoffMs * 2;
    setTimeout(() => void this.playNext(), delay);
  }

  private showFallback(): void {
    this.setStatus("idle");
    if (this.videoElement) {
      this.videoElement.src = "";
      this.videoElement.poster = "";
    }
    if (this.intermissionScreen) {
      this.intermissionScreen.style.display = "none";
    }
    console.log("[PlaylistEngine] No playlist — showing fallback/idle");
  }

  private startWatchdog(timeoutMs: number): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      console.warn("[PlaylistEngine] Watchdog triggered — forcing transition");
      this.handleTransition();
    }, timeoutMs);
  }

  private resetWatchdog(): void {
    if (this.watchdogTimer && this.activePlaylist.length > 0) {
      const asset = this.activePlaylist[this.currentIndex];
      this.startWatchdog(
        Math.min(asset.duration * 1000 + 5000, AD_SLOT_DURATION_MS),
      );
    }
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    // A1: cancelar también el timer de intermisión pendiente
    if (this.intermissionTimer) {
      clearTimeout(this.intermissionTimer);
      this.intermissionTimer = null;
    }
  }

  private setStatus(status: PlayerStatus): void {
    this.status = status;
    this.onStatusChange?.(status);
  }

  destroy(): void {
    this.clearWatchdog();
    if (this._scheduleCheckTimer) {
      clearInterval(this._scheduleCheckTimer);
      this._scheduleCheckTimer = null;
    }
  }
}
