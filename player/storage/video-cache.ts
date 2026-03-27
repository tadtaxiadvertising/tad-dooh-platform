const CACHE_NAME = 'tad-dooh-campaign-v1';

export class VideoCache {
  
  /**
   * Checks if any video from the list is missing in the cache.
   */
  static async hasMissingAssets(videos: { url: string }[]): Promise<boolean> {
    try {
      if (!('caches' in window)) return true;
      const cache = await caches.open(CACHE_NAME);
      for (const v of videos) {
        const match = await cache.match(v.url);
        if (!match) return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Caches video assets into the Browser's persistent Cache Storage. 
   * Pre-fetches all videos when a new campaign is received.
   */
  static async cacheVideos(videos: { id: string; url: string; duration: number }[]): Promise<boolean> {
    try {
      if (!('caches' in window)) {
        console.warn('Cache API not supported in this browser.');
        return false;
      }

      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      const newUrls = videos.map(v => v.url);

      // 1. Cleanup: Remove videos that are NO LONGER in the playlist
      for (const request of keys) {
        if (!newUrls.includes(request.url)) {
          console.log(`🧹 Removing obsolete asset from cache: ${request.url}`);
          await cache.delete(request);
        }
      }

      // 2. Download: Add new videos to cache
      let allSuccess = true;
      for (const url of newUrls) {
        const match = await cache.match(url);
        if (!match) {
          console.log(`⬇️ Downloading & Caching: ${url}`);
          let success = false;
          let retries = 3;
          
          while (retries > 0 && !success) {
            try {
              const response = await fetch(url + '?v=' + Date.now(), { 
                mode: 'cors',
                credentials: 'omit' // Reduce header overhead for static assets
              });
              
              if (response.ok) {
                await cache.put(url, response);
                console.log(`✅ Cached: ${url}`);
                success = true;
              } else {
                throw new Error(`HTTP ${response.status}`);
              }
            } catch (err: any) {
              retries--;
              console.warn(`⚠️ Retry ${3-retries}/3 for ${url}:`, err.message);
              if (retries > 0) await new Promise(r => setTimeout(r, 2000));
            }
          }

          if (!success) {
            allSuccess = false;
            console.error(`❌ Permanent failure for: ${url}`);
          }
        } else {
          // Verify if it's still valid/exists in Cache Storage specifically
          console.log(`📦 Asset already in cache: ${url}`);
        }
      }

      return allSuccess;
    } catch (err) {
      console.error('Video caching pipeline failed:', err);
      return false;
    }
  }

  /**
   * Returns a local Blob URL if available in cache, otherwise returns the original URL.
   */
  static async getVideoSource(url: string): Promise<string> {
    try {
      if (!('caches' in window)) return url;
      
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse) {
        console.log(`🔋 Serving from Cache Storage: ${url}`);
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }
      
      console.warn(`📡 Cache miss. Streaming from network: ${url}`);
      return url;
    } catch (err) {
      console.error('Failed to retrieve from cache:', err);
      return url;
    }
  }
}
