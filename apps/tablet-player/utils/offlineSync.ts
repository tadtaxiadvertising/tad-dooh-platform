const CACHE_NAME = 'tad-media-v5';

export interface PlaylistItem {
  campaignId: string;
  url: string;
  checksum: string;
  duration: number;
  version: number;
}

export class OfflineSyncManager {
  static async synchronize(deviceId: string): Promise<boolean> {
    try {
      console.log(`[TAD Sync] Iniciando sincronización para dispositivo: ${deviceId}`);
      
      // 1. Obtener manifiesto del servidor
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.tad.com.do'}/api/sync/${deviceId}`);
      if (!response.ok) {
        if (response.status === 402) console.error('[TAD Sync] Suscripción no pagada.');
        return false;
      }
      
      const manifest = await response.json();
      const serverPlaylist: PlaylistItem[] = manifest.playlist;
      const serverUrls = serverPlaylist.map(item => item.url);

      // 2. Abrir caché local
      const cache = await caches.open(CACHE_NAME);
      const cachedRequests = await cache.keys();
      const cachedUrls = cachedRequests.map(req => req.url);

      let hasChanges = false;

      // 3. Descargar contenido nuevo
      for (const item of serverPlaylist) {
        if (!cachedUrls.includes(item.url)) {
          console.log(`[TAD Sync] Descargando nuevo medio: ${item.campaignId}`);
          try {
            await cache.add(item.url);
            hasChanges = true;
          } catch (err) {
            console.error(`[TAD Sync] Error descargando ${item.url}:`, err);
          }
        }
      }

      // 4. Purgar contenido obsoleto
      for (const cachedReq of cachedRequests) {
        if (!serverUrls.includes(cachedReq.url)) {
          console.log(`[TAD Sync] Eliminando medio obsoleto: ${cachedReq.url}`);
          await cache.delete(cachedReq);
          hasChanges = true;
        }
      }

      // 5. Actualizar el Playlist activo en memoria para el Player
      localStorage.setItem('tad_active_playlist', JSON.stringify(serverPlaylist));
      localStorage.setItem('tad_last_sync', new Date().toISOString());

      console.log(`[TAD Sync] Sincronización completada. Total videos: ${serverPlaylist.length}`);
      return hasChanges; // Retorna true si hubo descargas o borrados para que el Player se reinicie

    } catch (error) {
      console.error('[TAD Sync] Fallo crítico en sincronización:', error);
      return false;
    }
  }
}

// For exposing globally during testing in the browser
if (typeof window !== 'undefined') {
  (window as any).OfflineSyncManager = OfflineSyncManager;
}
