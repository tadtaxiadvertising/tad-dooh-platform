import type { PlaybackEvent } from "./types";

/** A PoP is not durably queued until the full IndexedDB transaction commits. */
export function persistPlaybackEvent(
  db: IDBDatabase,
  storeName: string,
  event: PlaybackEvent,
  deviceId: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("PLAYBACK_QUEUE_WRITE_ABORTED"));
    tx.onerror = () =>
      reject(tx.error ?? new Error("PLAYBACK_QUEUE_WRITE_FAILED"));
    tx.objectStore(storeName).put({
      id: `${event.video_id}_${event.timestamp}`,
      ...event,
      device_id: deviceId || event.device_id,
      queuedAt: Date.now(),
    });
  });
}

/**
 * Deletes only the exact records covered by a full server batch ACK.
 * The read+delete checks and all removals share one IndexedDB transaction:
 * commit is the only success receipt, and an overwritten unacknowledged PoP
 * must never be removed just because it reused the same IndexedDB key.
 */
export function removeAcknowledgedPlaybackEvents(
  db: IDBDatabase,
  storeName: string,
  events: PlaybackEvent[],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("PLAYBACK_QUEUE_ACK_ABORTED"));
    tx.onerror = () =>
      reject(tx.error ?? new Error("PLAYBACK_QUEUE_ACK_FAILED"));
    const store = tx.objectStore(storeName);
    for (const event of events) {
      const request = store.get(`${event.video_id}_${event.timestamp}`);
      request.onsuccess = () => {
        const current = request.result as
          (PlaybackEvent & { queuedAt?: number }) | undefined;
        // Another tab may have already removed the acknowledged item.
        if (!current) return;

        const sent = event as PlaybackEvent & { queuedAt?: number };
        if (
          current.device_id !== sent.device_id ||
          current.video_id !== sent.video_id ||
          current.timestamp !== sent.timestamp ||
          current.event_type !== sent.event_type ||
          current.lat !== sent.lat ||
          current.lng !== sent.lng ||
          current.queuedAt !== sent.queuedAt
        ) {
          // Avoid deleting an updated/reused key after network latency.
          // Abort rolls back other deletes in this batch too.
          tx.abort();
          return;
        }
        store.delete(`${event.video_id}_${event.timestamp}`);
      };
    }
  });
}
