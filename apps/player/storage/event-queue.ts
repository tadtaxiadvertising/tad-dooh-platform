import { sendPlaybackBatch, PlaybackEvent } from '../api/playback';

const QUEUE_KEY = "tad_playback_queue";

export class EventQueue {
  static saveToQueue(event: PlaybackEvent) {
    const queue = this.getQueue();
    queue.push(event);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  static getQueue(): PlaybackEvent[] {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  static clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
  }

  static async flushQueue() {
    if (!navigator.onLine) return;
    
    const queue = this.getQueue();
    if (queue.length === 0) return;

    // TAREA GPS_001: Batching Implementation
    // En lugar de enviar uno por uno, enviamos todo el lote en un solo POST /batch
    const success = await sendPlaybackBatch(queue);
    
    if (success) {
      this.clearQueue();
      console.log(`Successfully flushed batch of ${queue.length} events.`);
    } else {
      console.warn(`Failed to flush batch of ${queue.length} events. Keeping in queue.`);
    }
  }
}
