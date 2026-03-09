const CACHE_NAME = 'tad-dooh-campaign-v1';

export class VideoCache {
  
  /**
   * Caches video blob chunks into the Browser's persistent Cache Storage. 
   * Useful for loading video elements explicitly offline seamlessly with >50MB limitations overridden.
   */
  static async cacheVideos(videos: { id: string; url: string; duration: number }[]): Promise<boolean> {
    try {
      if (!('caches' in window)) {
        console.warn('Cache API not supported in this browser. Offline playback may not work.');
        return false;
      }

      const cache = await caches.open(CACHE_NAME);
      const existingReqs = await cache.keys();
      
      const newUrls = videos.map(v => v.url);
      
      // Delete obsolete videos not part of the active campaign sync payload
      for (const req of existingReqs) {
        if (!newUrls.includes(req.url)) {
          await cache.delete(req);
        }
      }

      // Download entirely new ones sequentially (to avoid hammering connection constraints)
      for (const url of newUrls) {
        const cached = await cache.match(url);
        if (!cached) {
          console.log(`Downloading campaign asset: ${url}`);
          // Re-fetch using cors ensuring the CDN allows media byte ranges
          await cache.add(new Request(url, { mode: 'cors' }));
        }
      }

      return true;
    } catch (err) {
      console.error('Video caching failed', err);
      return false; // Could trigger retry logic upward
    }
  }

  /**
   * Retrieves Blob URL mapped from a specific URL if present, or falls back to standard HTTP stream 
   * if offline playback caching failed or skipped.
   */
  static async getVideoSource(url: string): Promise<string> {
    try {
      if (!('caches' in window)) return url;
      
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      
      // Fallback
      return url;
    } catch {
      return url;
    }
  }
}
