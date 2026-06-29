// ─── TAD DOOH Player — CacheManager ───
// IndexedDB-based video blob caching for offline resilience.
// Falls back to Cache API then network when IndexedDB is unavailable.

import type { MediaAsset, CachedVideo } from './types';
import env from './config';

const DB_NAME = 'tad_video_cache';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

export class CacheManager {
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.openDB();
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getVideoSource(asset: MediaAsset): Promise<string> {
    // 1. Check IndexedDB
    const cached = await this.getFromIndexedDB(asset.url);
    if (cached) {
      if (asset.checksum && cached.checksum !== asset.checksum) {
        // Integrity mismatch — evict stale entry
        await this.evict(asset.url);
      } else {
        return URL.createObjectURL(cached.blob);
      }
    }

    // 2. Check Cache API (browser cache)
    try {
      const cache = await caches.open('tad-player-videos');
      const response = await cache.match(asset.url);
      if (response) {
        const blob = await response.blob();
        if (blob.size <= env.MAX_VIDEO_SIZE_BYTES) {
          await this.saveToIndexedDB(asset, blob);
          return URL.createObjectURL(blob);
        }
      }
    } catch {
      // Cache API unavailable — proceed to network
    }

    // 3. Network fetch (online-only path)
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (blob.size <= env.MAX_VIDEO_SIZE_BYTES) {
        await this.saveToIndexedDB(asset, blob);
        // Also store in Cache API for dual-layer resilience
        try {
          const cache = await caches.open('tad-player-videos');
          await cache.put(asset.url, new Response(blob));
        } catch { /* non-critical */ }
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.error(`[CacheManager] Network fetch failed for ${asset.filename}:`, err);
      throw err;
    }

    throw new Error(`No video source available for ${asset.filename}`);
  }

  async cacheVideos(assets: MediaAsset[]): Promise<{ cached: number; failed: number }> {
    let cached = 0;
    let failed = 0;

    for (const asset of assets) {
      try {
        const existing = await this.getFromIndexedDB(asset.url);
        if (existing && existing.checksum === asset.checksum) {
          cached++;
          continue; // Already cached and valid
        }
        await this.getVideoSource(asset); // Downloads + caches
        cached++;
      } catch {
        failed++;
      }
    }

    return { cached, failed };
  }

  async hasMissingAssets(assets: MediaAsset[]): Promise<boolean> {
    for (const asset of assets) {
      const cached = await this.getFromIndexedDB(asset.url);
      if (!cached || (asset.checksum && cached.checksum !== asset.checksum)) {
        return true;
      }
    }
    return false;
  }

  async evictStaleAssets(currentAssets: MediaAsset[]): Promise<number> {
    const db = await this.dbReady;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allKeys = await new Promise<string[]>(resolve => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
    });

    const currentUrls = new Set(currentAssets.map(a => a.url));
    let evicted = 0;

    for (const key of allKeys) {
      if (!currentUrls.has(key as string)) {
        await this.evict(key as string);
        evicted++;
      }
    }
    return evicted;
  }

  private async getFromIndexedDB(url: string): Promise<CachedVideo | null> {
    const db = await this.dbReady;
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  private async saveToIndexedDB(asset: MediaAsset, blob: Blob): Promise<void> {
    const db = await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: CachedVideo = {
        url: asset.url,
        blob,
        checksum: asset.checksum || asset.hashMd5 || 'no-checksum',
        cachedAt: Date.now(),
        size: blob.size,
      };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async evict(url: string): Promise<void> {
    const db = await this.dbReady;
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(url);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // Non-critical
    });
  }
}
