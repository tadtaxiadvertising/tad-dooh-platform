const CACHE_NAME = 'tad-dooh-campaign-v1';

export class VideoCache {
  
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
      for (const url of newUrls) {
        const match = await cache.match(url);
        if (!match) {
          console.log(`⬇️ Downloading & Caching: ${url}`);
          try {
            // Using { mode: 'no-cors' } is NOT recommended for media if you need to manipulate bits,
            // but for simple <video src="..."> it works. Better with proper CORS.
            const response = await fetch(url + '?cache_bust=' + Date.now());
            if (response.ok) {
                await cache.put(url, response);
                console.log(`✅ Cached: ${url}`);
            }
          } catch (fetchErr) {
            console.error(`❌ Failed to cache ${url}:`, fetchErr);
          }
        } else {
            console.log(`📦 Asset already in cache: ${url}`);
        }
      }

      return true;
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
