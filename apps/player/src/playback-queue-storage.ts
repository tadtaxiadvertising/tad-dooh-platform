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
    tx.onabort = () => reject(tx.error ?? new Error("PLAYBACK_QUEUE_WRITE_ABORTED"));
    tx.onerror = () => reject(tx.error ?? new Error("PLAYBACK_QUEUE_WRITE_FAILED"));
    tx.objectStore(storeName).put({
      id: `${event.video_id}_${event.timestamp}`,
      ...event,
      device_id: deviceId || event.device_id,
      queuedAt: Date.now(),
    });
  });
}
