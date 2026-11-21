import type { CacheManager } from "./cache-manager";
import type { MediaAsset } from "./types";

/**
 * Prepare a new playlist without evicting the currently playable offline
 * videos until EVERY replacement asset is actually present in IndexedDB.
 *
 * CacheManager.cacheVideos() may only enqueue work to the video worker and
 * report optimistic counts. Therefore those counts are NOT a durability ACK.
 */
export async function prepareOfflinePlaylist(
  cache: Pick<
    CacheManager,
    "cacheVideos" | "hasMissingAssets" | "evictStaleAssets"
  >,
  assets: MediaAsset[],
): Promise<boolean> {
  if (assets.length === 0) return true;

  const result = await cache.cacheVideos(assets);
  if (result.failed > 0) return false;

  // Verify the durable local cache, not the asynchronous worker queue.
  if (await cache.hasMissingAssets(assets)) return false;

  // Only a fully staged playlist can replace the offline fallback.
  await cache.evictStaleAssets(assets);
  return true;
}
