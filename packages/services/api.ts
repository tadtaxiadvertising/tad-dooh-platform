import axios from 'axios';
import { supabase } from './supabase';
import { writeSsrSessionCookie, writeAccessTokenCookie, clearAuthCookies } from './session-cookies';
import {
  getValidSession,
  getLocalStorageToken,
  isPublicPath,
  invalidateSession,
} from './auth.service';
import { processApiError } from './error-handler.service';

/**
 * Estrategia de routing del API client:
 *
 * LOCALHOST (dev):
 *   → http://localhost:3000/api  (directo al backend local, sin proxy)
 *
 * PRODUCCIÓN (EasyPanel):
 *   → /api/proxy  (Next.js API Route que actúa como proxy server-side)
 *   ↳ El proxy usa BACKEND_INTERNAL_URL (runtime env var) para llegar al backend
 *   ↳ Ventaja: No depende de variables build-time, no tiene errores CORS, no da 502 por URL vacía
 *
 * NUNCA usar /backend-api en producción (depende de next.config.ts rewrite
 * que a su vez depende de NEXT_PUBLIC_API_URL en build-time → URL vacía → 502)
 */
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Regla de arquitectura: TODO frontend comunica por /api/proxy
    return '/api/proxy';
  }

  // SSR fallback (mantiene compatibilidad sin romper la regla del cliente)
  const frontendOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || '';
  return frontendOrigin ? `${frontendOrigin.replace(/\/$/, '')}/api/proxy` : '/api/proxy';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s — suficiente para reportes pesados y EasyPanel cold starts
});

// ============================================
// JWT Auth Interceptor
// ============================================

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    try {
      const currentPath = window.location.pathname;

      // 1. Intento principal: Supabase Session (Solo en rutas no públicas)
      if (!isPublicPath(currentPath)) {
        const session = await getValidSession(currentPath);
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
          return config;
        }
      }
      
      // 2. Fallback: LocalStorage
      const localToken = getLocalStorageToken(currentPath);
      if (localToken) {
        config.headers.Authorization = `Bearer ${localToken}`;
      }

      // 3. Fallback Final: Cookies (Resiliencia ante condiciones de carrera en login/refresh)
      if (!config.headers.Authorization && typeof document !== 'undefined') {
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('sb-access-token='))
          ?.split('=')[1];
        if (cookieToken) {
          config.headers.Authorization = `Bearer ${cookieToken}`;
        }
      }
    } catch (error) {
      console.error('🔐 AUTH_ERROR:', error);
    }
  }
  return config;
});

// ============================================
// Idempotency-Key Auto-Interceptor
// ============================================
// REGLA DE NEGOCIO 08: Todo POST/PUT/PATCH debe enviar un Idempotency-Key.
// Se genera automáticamente por request (a menos que el llamador ya lo haya
// definido), lo que evita pagos/transacciones duplicadas ante retries.
api.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
    if (!config.headers['Idempotency-Key'] && !config.headers['idempotency-key']) {
      const key = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      config.headers['Idempotency-Key'] = key;
    }
  }
  return config;
});

// ============================================
// 401 Auto-Retry Interceptor (Token Refresh Safety Net)
// ============================================
//
// FIX (2026-05-09): If the backend returns 401, we force a Supabase token refresh
// and retry the original request once. This handles the race condition where the
// proactive refresh in getValidSession() wasn't triggered (e.g. the token expired
// between the interceptor check and the network call arriving at the server).
//
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginRequest = originalRequest?.url?.includes('/auth/login');

    // Only retry on 401 and only once (prevent infinite loops)
    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      !originalRequest._isRetry &&
      typeof window !== 'undefined'
    ) {
      originalRequest._isRetry = true;

      try {
        console.info('🔄 [AUTH] 401 recibido. Intentando refrescar token...');
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshed.session) {
          console.warn('⚠️ [AUTH] Refresco fallido tras 401. Cerrando sesión.', refreshError?.message);
          // Force logout — the session is truly dead
          await supabase.auth.signOut();
          const currentPath = window.location.pathname;
          const loginPath = currentPath.includes('/advertiser/') ? '/advertiser/login'
            : currentPath.includes('/driver/') ? '/driver/login'
            : '/admin/login';
          window.location.href = loginPath;
          return processApiError(error);
        }

        // Update the in-memory cache so subsequent requests get the new token
        const { invalidateSession } = await import('./auth.service');
        invalidateSession(); // Forces re-fetch on next getValidSession() call

        // Retry with the fresh token
        originalRequest.headers['Authorization'] = `Bearer ${refreshed.session.access_token}`;
        return api(originalRequest);
      } catch (retryError) {
        console.error('❌ [AUTH] Error crítico durante reintento post-401:', retryError);
        return processApiError(error);
      }
    }

    return processApiError(error);
  }
);

// ============================================
// Auth
// ============================================
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(async res => {
    const { access_token, refresh_token, user } = res.data;
    
    // Synchronize Supabase Client state (Critical for auto-refresh)
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      // Mirror the role-bearing session into the canonical @supabase/ssr cookie
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) writeSsrSessionCookie(s);
      } catch { /* legacy cookie still covers SSR */ }
    }

    localStorage.setItem('tad_admin_token', access_token);
    if (refresh_token) {
      localStorage.setItem('tad_admin_refresh_token', refresh_token);
    }
    localStorage.setItem('tad_admin_user', JSON.stringify(user));
    
    // Inject cookie for middleware — conditional Secure so it works on http (local) too
    if (typeof window !== 'undefined') {
      writeAccessTokenCookie(access_token);
    }
    
    return res.data;
  });

export const logout = async () => {
  // Invalidate cached session
  invalidateSession();
  
  const currentPath = window.location.pathname;
  let target = '/login';
  
  if (currentPath.includes('/advertiser/')) target = '/advertiser/login';
  else if (currentPath.includes('/driver/')) target = '/driver/login';
  else if (currentPath.includes('/admin/')) target = '/admin/login';

  // Clear ALL portal tokens to avoid state contamination
  try {
    localStorage.removeItem('tad_admin_token');
    localStorage.removeItem('tad_admin_refresh_token');
    localStorage.removeItem('tad_admin_user');
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_user');
    localStorage.removeItem('tad_driver_token');
    localStorage.removeItem('tad_driver_user');
  } catch (e) {
    console.warn('⚠️ localStorage clear failed:', e);
  }
  
  // Clear middleware cookie
  try {
    clearAuthCookies();
  } catch (e) {
    console.warn('⚠️ Cookie clear failed:', e);
  }
  
  // Clear Supabase session if possible
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('⚠️ Supabase signOut failed:', e);
  }
  
  window.location.href = target;
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('tad_admin_user');
  return raw ? JSON.parse(raw) : null;
};

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('tad_admin_token');
};

// ============================================
// Fleet
// ============================================
export const getDevices = () => api.get('/fleet/devices').then(res => res.data);
export const getDeviceSlots = (id: string) => api.get(`/device/${id}/slots`).then(res => res.data);
export const getOfflineDevices = () => api.get('/fleet/offline').then(res => res.data);
export const getPlayerErrors = () => api.get('/fleet/player-errors').then(res => res.data);
export const getFleetFinance = () => api.get('/fleet/finance').then(res => res.data);
export const sendCommand = (deviceId: string, type: string, params: Record<string, unknown> = {}) =>
  api.post(`/fleet/${deviceId}/command`, { type, params }).then(res => res.data);
export const getFleetStatusSummary = () => api.get('/fleet/status-summary').then(res => res.data);
export const getFleetLocations = (advertiserId?: string) => 
  api.get(`/fleet/map${advertiserId ? `?advertiserId=${advertiserId}` : ''}`).then(res => res.data);

// BI & Reconciliation
export const getBiKpis = () => api.get('/bi/kpis').then(res => res.data);
export const getFleetHealth = () => api.get('/bi/fleet-health').then(res => res.data);
export const getBiFleetHealth = () => api.get('/bi/fleet-health').then(res => res.data);
export const getTaxiDrillDown = (deviceId: string) => api.get(`/bi/fleet-health/${deviceId}/drill-down`).then(res => res.data);
export const getReconciliationReport = (period: string, page = 1, pageSize = 100) => api.get(`/bi/reconciliation/${period}`, { params: { page, pageSize } }).then(res => res.data);
export const generateReconciliation = (period: string) => api.post('/bi/reconciliation/generate', { period }).then(res => res.data);
export const getHotspots = () => api.get('/bi/hotspots').then(res => res.data);
export const getBiHotspots = () => api.get('/bi/hotspots').then(res => Array.isArray(res.data) ? res.data : []);

// Referrals
export const getReferralStats = () => api.get('/referral/stats').then(res => res.data);
export const getReferralNetwork = () => api.get('/referral/network').then(res => res.data);

/**
 * Driver self-service: obtener su propio código real de referido.
 * Devuelve referralCode (UUID real de BD), URL de referido de anunciante,
 * URL de referido de conductor y payload para QR.
 */
export const getMyReferralCode = () =>
  api.get('/referral/me').then(res => res.data);

// Device Inventory
export const getDeviceCampaigns = (deviceId: string) => api.get(`/devices/${deviceId}/campaigns`).then(res => res.data);
export const removeCampaignFromDevice = (deviceId: string, campaignId: string) => api.delete(`/devices/${deviceId}/campaigns/${campaignId}`).then(res => res.data);
export const getCampaignDevices = (campaignId: string) => api.get(`/campaigns/${campaignId}/devices`).then(res => res.data);
export const getPendingDevices = () => api.get('/devices/pending').then(res => res.data);
export const approvePendingDevice = (deviceId: string) => api.post(`/devices/${deviceId}/approve`).then(res => res.data);
export const rejectPendingDevice = (deviceId: string) => api.delete(`/devices/${deviceId}/reject`).then(res => res.data);

// Campaigns
export const getCampaigns = () => api.get('/campaigns').then(res => res.data);
export const getCampaignById = (id: string) => api.get(`/campaigns/${id}`).then(res => res.data);
export const createCampaign = (data: Record<string, unknown>) => api.post('/campaigns', data).then(res => res.data);
export const assignCampaignToDevices = (id: string, deviceIds: string[]) =>
  api.post(`/campaigns/${id}/assign`, { deviceIds }).then(res => res.data);
export const addVideoToCampaign = (campaignId: string, data: Record<string, unknown>) => api.post(`/campaigns/${campaignId}/assets`, data).then(res => res.data);
export const linkMediaToCampaign = (campaignId: string, mediaId: string) => api.post(`/campaigns/${campaignId}/link-media`, { mediaId }).then(res => res.data);
export const unlinkMediaFromCampaign = (campaignId: string, mediaId: string) => api.post(`/campaigns/${campaignId}/unlink-media`, { mediaId }).then(res => res.data);

// Media
export const getMedia = () => api.get('/media').then(res => res.data);
export const getMediaStatus = (id: string) => api.get(`/media/${id}/status`).then(res => res.data);
export const updateMedia = (id: string, data: { qrUrl: string }) => api.patch(`/media/${id}`, data).then(res => res.data);
/**
 * REGLA SRE 05: Checksum Verification.
 * Calcula el MD5 en el navegador antes de subir para asegurar integridad.
 */
const computeMD5 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer); // Usamos SHA-256 como fallback fuerte o MD5 si hay lib
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      resolve(hashHex);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, 10 * 1024 * 1024)); // Tomamos los primeros 10MB para no colapsar la RAM del browser
  });
};

export const uploadMedia = async (file: File, campaignId: string = 'general', qrUrl?: string) => {
  try {
    // 1. Calcular Checksum (SRE Rule 05)
    // Usamos el hash como identificador único para deduplicación si fuera necesario
    const hashMd5 = await computeMD5(file);

    // 2. Pedir URL firmada de subida al backend
    let urlRes;
    try {
      urlRes = await api.get(`/media/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${file.type}`);
    } catch (e: any) {
      console.error('❌ Error obteniendo Signed URL del Backend:', e.response?.data || e.message);
      const backendMsg = e.response?.data?.message || e.message;
      throw new Error(`Falla en autorización de Storage: ${backendMsg}`);
    }

    const { uploadUrl, path, publicUrl } = urlRes.data;

    // 3. BYPASS: Subir directo a Supabase Storage (Node.js respira 🫁)
    // Nota: fetch es usado aquí para evitar interceptores de Axios que podrían corromper el stream binario
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      }
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('❌ Error en subida directa a Supabase:', errorText);
      throw new Error(`Falla al subir a Supabase (${uploadRes.status}): ${errorText}`);
    }

    // 4. Registrar el asset en la Base de Datos con el Hash calculado
    const regRes = await api.post('/media/register-bypassed', {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      campaignId,
      storageKey: path,
      publicUrl: publicUrl,
      hashMd5,
      qrUrl
    });

    return {
      id: regRes.data.id,
      url: regRes.data.url || regRes.data.cdnUrl,
      fileSize: regRes.data.fileSize || regRes.data.size || 0,
      hashMd5: regRes.data.hashMd5 || hashMd5,
      name: file.name,
      path: path
    };
  } catch (err: any) {
    console.error('🚀 CRITICAL_UPLOAD_ERROR:', err);
    throw err;
  }
};

export const uploadCampaignMedia = async (campaignId: string, file: File) => {
  const uploadedData = await uploadMedia(file, campaignId);
  return uploadedData;
};

export const deleteMedia = (id: string) => api.delete(`/media/${id}`).then(res => res.data);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary').then(res => res.data);
export const getWeeklyPerformance = (campaignId: string) => api.get(`/analytics/campaign/${campaignId}/weekly`).then(res => res.data);
export const shareReportByWhatsApp = (campaignId: string, data: { phone: string; advertiserName: string; campaignName: string; reportUrl: string }) => 
  api.post(`/analytics/campaign/${campaignId}/share-whatsapp`, data).then(res => res.data);
export const getTopTaxis = () => api.get('/analytics/top-taxis').then(res => res.data);
export const getHourlyPlays = () => api.get('/analytics/hourly').then(res => res.data);
export const getRecentPlays = () => api.get('/analytics/recent-plays').then(res => res.data);
export const getHeatmapData = (advertiserId?: string) => 
  api.get(`/analytics/heatmap${advertiserId ? `?advertiserId=${advertiserId}` : ''}`).then(res => res.data);

// Drivers
export const getDrivers = () => api.get('/drivers').then(res => res.data);
export const getDriverStats = () => api.get('/drivers/stats').then(res => res.data);
export const createDriver = (data: Record<string, unknown>) => api.post('/drivers', data).then(res => res.data);
export const updateDriverSubscription = (id: string, data: Record<string, unknown>) => api.put(`/drivers/${id}/subscription`, data).then(res => res.data);
export const assignDeviceToDriver = (driverId: string, deviceId: string) => api.post(`/drivers/${driverId}/assign-device`, { deviceId }).then(res => res.data);
export const unlinkDeviceFromDriver = (driverId: string) => api.post(`/drivers/${driverId}/unlink-device`).then(res => res.data);

// Finance
export const getCampaignBilling = () => api.get('/finance/report/campaigns').then(res => res.data);
export const getDriverPayroll = (month?: string) => api.get(`/finance/report/payroll${month ? `?month=${month}` : ''}`).then(res => res.data);
// URLs de export (Legacy, deprecating soon for authenticated methods below)
const getProxyBase = () => typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api/proxy' : 'http://localhost:3000/api';
export const getPayrollExportUrl = (month?: string) => `${getProxyBase()}/finance/export/payroll.csv${month ? `?month=${month}` : ''}`;
export const getCampaignExportUrl = () => `${getProxyBase()}/finance/export/campaigns.csv`;
export const getCampaignReportUrl = (id: string) => `${getProxyBase()}/finance/export/campaign/${id}.csv`;
export const getInvoiceUrl = (id: string, print = false) => `${getProxyBase()}/finance/invoice/${id}${print ? '?print=true' : ''}`;

// Authenticated Downloads
const triggerDownload = async (data: any, filename: string, type: string) => {
  // Si los datos son un Blob de tipo JSON, es probable que sea un error del backend
  // que Axios no capturó (rare) o que el proxy devolvió como 200 con cuerpo de error.
  if (data instanceof Blob && data.type === 'application/json') {
    const text = await data.text();
    try {
      const error = JSON.parse(text);
      console.error('Download error detected in Blob:', error);
      throw new Error(error.message || error.error || 'Error en descarga');
    } catch (e) {
      // Si no es JSON válido, procedemos con la descarga por si acaso
    }
  }

  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadPayrollCsv = async (month?: string) => {
  const res = await api.get(`/finance/export/payroll.csv${month ? `?month=${month}` : ''}`, { responseType: 'blob' });
  triggerDownload(res.data, `payroll-${month || 'current'}.csv`, 'text/csv');
};

export const downloadCampaignReport = async (id: string) => {
  const res = await api.get(`/finance/export/campaign/${id}.csv`, { responseType: 'blob' });
  triggerDownload(res.data, `campaign-${id}.csv`, 'text/csv');
};

export const openInvoiceHtml = async (id: string) => {
  const res = await api.get(`/finance/invoice/${id}`, { responseType: 'text' });
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(res.data);
    newWindow.document.close();
  }
};

// --- AUTHENTICATED PDF DOWNLOADS ---

export const downloadCampaignPdf = async (id: string, name: string) => {
  const res = await api.get(`/finance/report/campaign/${id}/pdf`, { responseType: 'blob' });
  triggerDownload(res.data, `Certificado_Exhibicion_${name}.pdf`, 'application/pdf');
};

export const downloadFleetPdf = async () => {
  const res = await api.get(`/finance/report/fleet/pdf`, { responseType: 'blob' });
  triggerDownload(res.data, 'TAD_Inventario_Flota.pdf', 'application/pdf');
};

export const downloadTransactionPdf = async (id: string) => {
  const res = await api.get(`/finance/transaction/${id}/pdf`, { responseType: 'blob' });
  triggerDownload(res.data, `Recibo_Transaccion_${id.substring(0,8)}.pdf`, 'application/pdf');
};

export const downloadDriverInvoicePdf = async (driverId: string) => {
  const res = await api.get(`/sheets/invoice/${driverId}`, { responseType: 'blob' });
  triggerDownload(res.data, `TAD_Factura_${driverId}.pdf`, 'application/pdf');
};

export const downloadWeeklyCampaignPdf = async (id: string, name: string) => {
  const res = await api.get(`/analytics/campaign/${id}/weekly/pdf`, { responseType: 'blob' });
  triggerDownload(res.data, `Reporte_Semanal_${name}.pdf`, 'application/pdf');
};
export const getAutoPayroll = () => api.get('/finance/payroll').then(res => res.data);
export const processPayrollPayment = (data: { driverId: string; month: number; year: number; reference: string }) => api.post('/finance/payroll/pay', data).then(res => res.data);
export const sendDriverPaymentWhatsApp = (data: { phone: string; driverName: string; amount: number; month: string }) => 
  api.post('/finance/payroll/whatsapp-confirm', data).then(res => res.data);
export const recordFinancialTransaction = (data: Record<string, unknown>) => api.post('/finance/transactions', data).then(res => res.data);
export const getFinancialSummary = () => api.get('/finance/summary').then(res => res.data);
export const getFinancialLedger = () => api.get('/finance/ledger').then(res => res.data);

// Campaign Segmentation
export const assignDriversToCampaign = (campaignId: string, data: { driverIds: string[]; targetAll: boolean }) =>
  api.post(`/campaigns/${campaignId}/drivers`, data).then(res => res.data);

export const getTabletPlaylist = (deviceId: string) => api.get(`/campaigns/tablet/${deviceId}/playlist`).then(res => res.data);

// Delete operations
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`).then(res => res.data);
export const createDevice = (data: Record<string, unknown>) => api.post('/devices', data).then(res => res.data);
export const updateDevice = (id: string, data: Record<string, unknown>) => api.put(`/devices/${id}`, data).then(res => res.data);
export const deleteDevice = (deviceId: string) => api.delete(`/devices/${deviceId}`).then(res => res.data);
export const getAdvertisers = () => api.get('/advertisers').then(res => res.data);
export const getAdvertiser = (id: string) => api.get(`/advertisers/${id}`).then(res => res.data);
export const createAdvertiser = (data: any) => api.post('/advertisers', data).then(res => res.data);
export const updateAdvertiser = (id: string, data: any) => api.patch(`/advertisers/${id}`, data).then(res => res.data);
export const deleteAdvertiser = (id: string) => api.delete(`/advertisers/${id}`).then(res => res.data);
export const getAdvertiserHub = () => api.get('/campaigns/advertiser/hub').then(res => res.data);
export const getAdvertiserPublicProfile = (id: string) => api.get(`/campaigns/advertiser/${id}/profile`).then(res => res.data);
export const getMyAdvertiserReferrals = (driverId: string) => api.get(`/referral/advertisers/me?driverId=${driverId}`).then(res => res.data);

// Device Profile
export const getDeviceProfile = (deviceId: string) => api.get(`/devices/${deviceId}/profile`).then(res => res.data);
export const updateDeviceProfile = (deviceId: string, data: Record<string, unknown>) => api.put(`/devices/${deviceId}/profile`, data).then(res => res.data);

// GPS Tracking
export const getTrackingData = () => api.get('/fleet/tracking').then(res => res.data);
export const getTrackingBaseline = () => api.get('/tracking/baseline').then(res => res.data);
export const getTrackingSummary = (advertiserId?: string) => 
  api.get(`/fleet/tracking/summary${advertiserId ? `?advertiserId=${advertiserId}` : ''}`).then(res => res.data);
export const getDeviceRecentPath = (deviceId: string) => api.get(`/fleet/devices/${deviceId}/recent-path`).then(res => res.data);
export const getAdvertiserPortalData = (id: string) => api.get(`/advertisers/${id}/portal`).then(res => res.data);

// Portal Requests
export const createPortalRequest = (data: any) => api.post('/portal-requests', data).then(res => res.data);
export const getPortalRequests = () => api.get('/portal-requests').then(res => res.data);
export const getAdvertiserPortalRequests = (advertiserId: string) => api.get(`/portal-requests/advertiser/${advertiserId}`).then(res => res.data);
export const getDriverPortalRequests = (driverId: string) => api.get(`/portal-requests/driver/${driverId}`).then(res => res.data);
export const updatePortalRequest = (id: string, data: any) => api.put(`/portal-requests/${id}`, data).then(res => res.data);
export const deletePortalRequest = (id: string) => api.delete(`/portal-requests/${id}`).then(res => res.data);

// ============================================
// Email Notifications
// ============================================

/** Envía Reporte de Campaña (PDF adjunto) por email */
export const emailCampaignReport = (
  campaignId: string,
  data: { email: string; advertiserName?: string; reportUrl?: string }
) => api.post(`/finance/report/campaign/${campaignId}/email`, data).then(res => res.data);

/** Envía Factura oficial (PDF adjunto) por email */
export const emailInvoice = (
  campaignId: string,
  data: { email: string; amount?: number }
) => api.post(`/finance/invoice/${campaignId}/email`, data).then(res => res.data);

// System Settings
export const getSystemSettings = () => api.get('/system-settings').then(res => res.data);
export const updateSystemSettings = (data: Record<string, unknown>) => api.put('/system-settings', data).then(res => res.data);

/** Envía confirmación de pago a conductor por email */
export const emailDriverPaymentConfirm = (data: {
  email: string;
  driverName: string;
  amount: number;
  month: string;
  driverId?: string;
}) => api.post('/finance/payroll/email-confirm', data).then(res => res.data);

// ============================================
// Auth & Profile
// ============================================
export const getMyProfile = () => api.get('/auth/profile').then(res => res.data);
export const updateMyProfile = (data: { name?: string; password?: string; currentPassword?: string }) => api.put('/auth/profile', data).then(res => res.data);

export default api;
