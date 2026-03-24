/**
 * TAD SYNC ENGINE V1.2 - SANTIAGO DE LOS CABALLEROS
 * Estrategia: Cache-First + Driver Notification
 */

export const useSyncEngine = (deviceId: string) => {
  const STORAGE_KEY = 'tad_cached_playlist';
  const TTL_KEY = 'tad_access_ttl';

  const sync = async () => {
    try {
      // 1. Intentar validar con el Backend (Gateway 4G)
      // Using import.meta.env for Vite instead of process.env
      const apiUrl = import.meta.env.VITE_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api';
      const res = await fetch(`${apiUrl}/sync/${deviceId}`);
      
      if (res.status === 402) {
        dispatchAlert("SUSCRIPCIÓN VENCIDA (RD$6,000). El servicio podría suspenderse pronto.");
        return loadLocalCache(); 
      }

      if (!res.ok) throw new Error('API Sync Failed');

      const data = await res.json();
      
      // 2. Actualizar persistencia local
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.playlist));
      localStorage.setItem(TTL_KEY, (Date.now() + 24 * 60 * 60 * 1000).toString());

      return data.playlist;

    } catch (e) {
      // 3. Fallo de Red (Zonas muertas en Santiago / Túneles)
      const ttl = Number(localStorage.getItem(TTL_KEY));
      
      if (ttl && Date.now() > ttl) {
        dispatchAlert("SIN CONEXIÓN POR > 24H. Por favor, conecte a internet.");
      }
      
      return loadLocalCache();
    }
  };

  const loadLocalCache = () => {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  };

  const dispatchAlert = (msg: string) => {
    // Inyecta notificación visual no bloqueante en la tablet
    window.dispatchEvent(new CustomEvent('TAD_UI_TOAST', { detail: msg }));
  };

  return { sync };
};
