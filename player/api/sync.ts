const API_URL = import.meta.env?.VITE_API_URL || "https://proyecto-ia-tad-api.rewvid.easypanel.host/api";

export interface SyncResponse {
  campaign_version: number;
  videos: {
    id: string;
    url: string;
    duration: number;
  }[];
}

const STORAGE_KEY = 'tad_cached_playlist';
const TTL_KEY = 'tad_access_ttl';

const dispatchAlert = (msg: string) => {
  window.dispatchEvent(new CustomEvent('TAD_UI_TOAST', { detail: msg }));
};

const loadLocalCache = (): SyncResponse | null => {
  const cached = localStorage.getItem(STORAGE_KEY);
  return cached ? JSON.parse(cached) : null;
};

export async function checkSync(deviceId: string): Promise<SyncResponse | null> {
  try {
    const res = await fetch(`${API_URL}/device/sync?device_id=${deviceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Sync failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.update === false || !data.videos) {
      return null;
    }
    
    // Almacenamiento Caching (Persistence)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(TTL_KEY, (Date.now() + 24 * 60 * 60 * 1000).toString());

    return data;
  } catch (error) {
    console.error("API Sync Error:", error);
    
    // Fallback: Red fallida (Túneles, Zonas Muertas 4G)
    const ttl = Number(localStorage.getItem(TTL_KEY));
    if (ttl && Date.now() > ttl) {
      dispatchAlert("⚠️ SIN CONEXIÓN POR > 24H. Por favor, asegure conectividad 4G.");
    }

    return loadLocalCache();
  }
}
