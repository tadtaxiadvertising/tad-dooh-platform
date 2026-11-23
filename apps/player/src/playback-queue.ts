// ─── TAD DOOH Player — PlaybackQueue ───
// Fire-and-forget queue for Proof of Play (PoP) confirmations.
// Uses the validated /telemetry/playback endpoint (not the deprecated /device/playback).
// Buffers events locally when offline, flushes on reconnect.

import type { PlaybackEvent } from "./types";
import env from "./config";
import { buildPlaybackApiPayload } from "./playback-event-type";
import { attachNetworkListener } from "./network-listeners";
import {
  persistPlaybackEvent,
  removeAcknowledgedPlaybackEvents,
} from "./playback-queue-storage";

const QUEUE_DB_NAME = "tad_playback_queue";
const QUEUE_DB_VERSION = 1;
const QUEUE_STORE = "events";

export class PlaybackQueue {
  private dbReady: Promise<IDBDatabase>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushInFlight: Promise<{ sent: number; failed: number }> | null =
    null;
  private deviceId: string = "";
  private disposeOnlineListener: (() => void) | null = null;

  constructor() {
    this.dbReady = this.openDB();
  }

  init(deviceId: string): void {
    // A renewed init must not leave a previous timer or reconnect callback.
    this.destroy();
    this.deviceId = deviceId;
    this.startFlushLoop();
    // Flush immediato al recuperar conectividad (item M4/R2): en 3G la red
    // cae/revive con frecuencia y no debemos esperar el timer largo antes
    // de entregar los Proofs of Play pendientes.
    this.disposeOnlineListener = attachNetworkListener(window, "online", () => {
      this.flushQueue().catch((err) => {
        console.error("[PlaybackQueue] Flush on reconnect error:", err);
      });
    });
  }

  destroy(): void {
    this.disposeOnlineListener?.();
    this.disposeOnlineListener = null;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async saveToQueue(event: PlaybackEvent): Promise<void> {
    const db = await this.dbReady;
    // IDBRequest.onsuccess precedes the transaction commit and is not a
    // durability receipt. Propagate abort/errors so a caller cannot claim a
    // Proof-of-Play was persisted when IndexedDB rolled the transaction back.
    return persistPlaybackEvent(db, QUEUE_STORE, event, this.deviceId);
  }

  // Reconnect, visibility and the periodic timer can call flush at once.
  // Share the same Promise so no two callers upload the same local PoP batch.
  flushQueue(): Promise<{ sent: number; failed: number }> {
    if (this.flushInFlight) return this.flushInFlight;

    this.flushInFlight = this.flushPendingQueue().finally(() => {
      this.flushInFlight = null;
    });
    return this.flushInFlight;
  }

  private async flushPendingQueue(): Promise<{ sent: number; failed: number }> {
    const db = await this.dbReady;
    // Fetch a bounded batch rather than loading or deleting the full queue.
    // The remaining events stay durably queued until a later confirmed ACK.
    const batchSize = Math.max(1, Math.floor(env.PLAYBACK_QUEUE_MAX_SIZE));
    const events = await new Promise<PlaybackEvent[]>((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const store = tx.objectStore(QUEUE_STORE);
      const req = store.getAll(undefined, batchSize);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    if (events.length === 0) return { sent: 0, failed: 0 };

    // Batch send — use the validated endpoint
    let sent = 0;
    let failed = 0;

    try {
      // Fail closed on unrecognized persisted event kinds: an invalid
      // offline record must not become a verified billable END.
      const payload = buildPlaybackApiPayload(events);

      const response = await fetch(`${env.API_URL}/telemetry/playback-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": this.deviceId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      // The backend currently responds HTTP 201 even for
      // { success: false, reason: "TABLET_KEY_MISSING" }. Never clear local
      // proofs merely because HTTP succeeded: require full application ACK.
      const acknowledgement = (await response.json().catch(() => null)) as {
        success?: boolean;
        processed?: number;
        rejected?: number;
        reason?: string;
      } | null;
      const fullyAccepted =
        response.ok &&
        acknowledgement?.success === true &&
        acknowledgement.processed === payload.length &&
        acknowledgement.rejected === 0;

      if (fullyAccepted) {
        // A batch is locally acknowledged only after every covered record
        // has been deleted in one committed IndexedDB transaction.
        await removeAcknowledgedPlaybackEvents(db, QUEUE_STORE, events);
        sent = events.length;
      } else {
        // Preserve the entire local batch for retry/reconciliation if any
        // event is rejected or the receipt is missing/ambiguous.
        failed = events.length;
        console.warn(
          `[PlaybackQueue] Batch unacknowledged: HTTP ${response.status}, reason=${acknowledgement?.reason || "PARTIAL_OR_INVALID_ACK"}`,
        );
      }
    } catch {
      failed = events.length;
      // Could be network failure or an IndexedDB transaction rollback.
      // Avoid logging raw requests, credentials or stored proof payloads.
      console.warn(
        "[PlaybackQueue] Delivery or local ACK cleanup failed; proofs remain pending.",
      );
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
