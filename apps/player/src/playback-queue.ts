// ─── TAD DOOH Player — PlaybackQueue ───
// Fire-and-forget queue for Proof of Play (PoP) confirmations.
// Uses the validated /telemetry/playback endpoint (not the deprecated /device/playback).
// Buffers events locally when offline, flushes on reconnect.

import type { PlaybackEvent } from "./types";
import env from "./config";

const QUEUE_DB_NAME = "tad_playback_queue";
const QUEUE_DB_VERSION = 1;
const QUEUE_STORE = "events";

export class PlaybackQueue {
  private dbReady: Promise<IDBDatabase>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private deviceId: string = "";

  constructor() {
    this.dbReady = this.openDB();
  }

  init(deviceId: string): void {
    this.deviceId = deviceId;
    this.startFlushLoop();
    // Flush immediato al recuperar conectividad (item M4/R2): en 3G la red
    // cae/revive con frecuencia y no debemos esperar el timer largo antes
    // de entregar los Proofs of Play pendientes.
    window.addEventListener("online", () => {
      this.flushQueue().catch((err) => {
        console.error("[PlaybackQueue] Flush on reconnect error:", err);
      });
    });
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async saveToQueue(event: PlaybackEvent): Promise<void> {
    const db = await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const store = tx.objectStore(QUEUE_STORE);
      const entry = {
        id: `${event.video_id}_${event.timestamp}`,
        ...event,
        device_id: this.deviceId || event.device_id,
        queuedAt: Date.now(),
      };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async flushQueue(): Promise<{ sent: number; failed: number }> {
    const db = await this.dbReady;
    const events = await new Promise<PlaybackEvent[]>((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (events.length === 0) return { sent: 0, failed: 0 };

    // Trim queue to max size (anti-OOM)
    if (events.length > env.PLAYBACK_QUEUE_MAX_SIZE) {
      const excess = events.length - env.PLAYBACK_QUEUE_MAX_SIZE;
      for (let i = 0; i < excess; i++) {
        await this.removeEvent(`${events[i].video_id}_${events[i].timestamp}`);
      }
      events.splice(0, excess);
    }

    // Batch send — use the validated endpoint
    let sent = 0;
    let failed = 0;

    try {
      const payload = events.map((e) => ({
        deviceId: e.device_id,
        videoId: e.video_id,
        eventType:
          e.event_type === "play_start"
            ? "START"
            : e.event_type === "play_confirm"
              ? "END"
              : "END",
        lat: e.lat,
        lng: e.lng,
        clientTimestamp: new Date(e.timestamp).toISOString(),
      }));

      const response = await fetch(`${env.API_URL}/telemetry/playback-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": this.deviceId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        // Remove all successfully sent events
        for (const event of events) {
          await this.removeEvent(`${event.video_id}_${event.timestamp}`);
        }
        sent = events.length;
      } else {
        failed = events.length;
        console.warn(
          `[PlaybackQueue] Batch flush failed: HTTP ${response.status}`,
        );
      }
    } catch (err) {
      failed = events.length;
      console.warn("[PlaybackQueue] Network error during flush:", err);
    }

    return { sent, failed };
  }

  private startFlushLoop(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue().catch((err) => {
        console.error("[PlaybackQueue] Flush error:", err);
      });
    }, env.PLAYBACK_FLUSH_INTERVAL_MS);
  }

  private async removeEvent(id: string): Promise<void> {
    const db = await this.dbReady;
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(QUEUE_DB_NAME, QUEUE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
