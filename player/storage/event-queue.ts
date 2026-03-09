import { sendPlaybackEvent, PlaybackEvent } from '../api/playback';

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
    if (!navigator.onLine) return; // Prevent draining if strictly offline
    
    const queue = this.getQueue();
    if (queue.length === 0) return;

    // We can try to send them sequentially or we can batch them if backend supports it.
    // The current endpoint /api/device/playback takes a single object. 
    // Sending them loop by loop.
    let remaining = [...queue];

    for (const event of queue) {
      if (!navigator.onLine) break; // connection dropped mid-flush
      
      const success = await sendPlaybackEvent(event);
      if (success) {
        remaining = remaining.filter(e => e !== event);
      }
    }

    // Save whatever couldn't be requested or if internet dropped
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }
}
