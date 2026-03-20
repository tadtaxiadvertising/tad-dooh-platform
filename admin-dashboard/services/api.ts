import axios from 'axios';
import { supabase } from './supabaseClient';

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
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    // Producción: usar el proxy interno de Next.js (API Route)
    // /api/proxy/{endpoint} → backend NestJS server-side
    return '/api/proxy';
  }
  // SSR: usar URL interna si está disponible, pública como fallback
  return process.env.BACKEND_INTERNAL_URL
    ? `${process.env.BACKEND_INTERNAL_URL}/api`
    : (process.env.NEXT_PUBLIC_API_URL || 'https://proyecto-ia-tad-api.rewvid.easypanel.host/api');
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000, // 25s — suficiente para EasyPanel free tier con cold starts
});

// ============================================
// JWT Auth Interceptor
// ============================================
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    // 🔥 Extract token dynamic session from Supabase to guarantee it's auto-refreshed
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Fallback for edge cases where login just ran
      const localToken = localStorage.getItem('tad_admin_token');
      if (localToken) {
        config.headers.Authorization = `Bearer ${localToken}`;
      } else {
        console.warn('⚠️ AUTH_CORE: No se ha detectado un Bearer Token para la petición:', config.url);
      }
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && (error.message === 'Network Error' || error.code === 'ECONNABORTED')) {
      console.error('📡 ERROR DE RED:', {
        baseURL: api.defaults.baseURL,
        url: error.config?.url,
        code: error.code,
        message: error.message,
      });
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('tad_admin_token');
      localStorage.removeItem('tad_admin_user');
      
      // 🔥 Destruir la sesión de Supabase cliente para matar el ping-pong loop
      // donde el Frontend la cree viva pero el Backend la rechaza.
      supabase.auth.signOut().catch(() => {});
      
      if (!window.location.pathname.includes('/login')) {
        // Un pequeño delay para permitir que el SIGNED_OUT auth event dispare primero si es posible
        setTimeout(() => { window.location.href = '/login'; }, 100);
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth
// ============================================
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(res => {
    const { access_token, user } = res.data;
    localStorage.setItem('tad_admin_token', access_token);
    localStorage.setItem('tad_admin_user', JSON.stringify(user));
    return res.data;
  });

export const logout = () => {
  localStorage.removeItem('tad_admin_token');
  localStorage.removeItem('tad_admin_user');
  window.location.href = '/login';
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
export const getFleetLocations = () => api.get('/fleet/map').then(res => res.data);

// Device Inventory
export const getDeviceCampaigns = (deviceId: string) => api.get(`/devices/${deviceId}/campaigns`).then(res => res.data);
export const removeCampaignFromDevice = (deviceId: string, campaignId: string) => api.delete(`/devices/${deviceId}/campaigns/${campaignId}`).then(res => res.data);
export const getCampaignDevices = (campaignId: string) => api.get(`/campaigns/${campaignId}/devices`).then(res => res.data);

// Campaigns
export const getCampaigns = () => api.get('/campaigns').then(res => res.data);
export const getCampaignById = (id: string) => api.get(`/campaigns/${id}`).then(res => res.data);
export const createCampaign = (data: Record<string, unknown>) => api.post('/campaigns', data).then(res => res.data);
export const assignCampaignToDevices = (id: string, deviceIds: string[]) =>
  api.post(`/campaigns/${id}/assign`, { deviceIds }).then(res => res.data);
export const addVideoToCampaign = (campaignId: string, data: Record<string, unknown>) => api.post(`/campaigns/${campaignId}/assets`, data).then(res => res.data);

// Media
export const getMedia = () => api.get('/media').then(res => res.data);
export const getMediaStatus = (id: string) => api.get(`/media/${id}/status`).then(res => res.data);
export const updateMedia = (id: string, data: { qrUrl: string }) => api.patch(`/media/${id}`, data).then(res => res.data);
export const uploadMedia = async (file: File, campaignId?: string, qrUrl?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('campaignId', campaignId || 'general');
  if (qrUrl) formData.append('qrUrl', qrUrl);

  const res = await api.post('/media/upload', formData);

  return {
    id: res.data.id,
    url: res.data.url,
    size: res.data.size,
    name: file.name,
    path: `campaign-videos/${res.data.id}`
  };
};

export const uploadCampaignMedia = async (campaignId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('campaignId', campaignId);

  const res = await api.post('/media/upload', formData);

  return api.post(`/campaigns/${campaignId}/assets`, {
    type: 'video',
    filename: file.name,
    url: res.data.url,
    fileSize: res.data.size,
    checksum: res.data.hash || `sha256-${Date.now()}`,
    duration: 0
  }).then(r => r.data);
};

export const registerMockMedia = (data: { filename: string; mimetype: string; size: number }) =>
  api.post('/media/register-mock', data).then(res => res.data);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary').then(res => res.data);
export const getTopTaxis = () => api.get('/analytics/top-taxis').then(res => res.data);
export const getHourlyPlays = () => api.get('/analytics/hourly').then(res => res.data);
export const getRecentPlays = () => api.get('/analytics/recent-plays').then(res => res.data);
export const getHeatmapData = () => api.get('/analytics/heatmap').then(res => res.data);

// Drivers
export const getDrivers = () => api.get('/drivers').then(res => res.data);
export const getDriverStats = () => api.get('/drivers/stats').then(res => res.data);
export const createDriver = (data: Record<string, unknown>) => api.post('/drivers', data).then(res => res.data);
export const updateDriverSubscription = (id: string, data: Record<string, unknown>) => api.put(`/drivers/${id}/subscription`, data).then(res => res.data);

// Advertisers
export const getAdvertisers = () => api.get('/advertisers').then(res => res.data);
export const createAdvertiser = (data: Record<string, unknown>) => api.post('/advertisers', data).then(res => res.data);

// Finance
export const getCampaignBilling = () => api.get('/finance/report/campaigns').then(res => res.data);
export const getDriverPayroll = (month?: string) => api.get(`/finance/report/payroll${month ? `?month=${month}` : ''}`).then(res => res.data);
export const simulatePayment = (month?: string) => api.get(`/finance/simulate-payment${month ? `?month=${month}` : ''}`).then(res => res.data);
// URLs de export usan /api/proxy en producción o directo en dev
const getProxyBase = () => typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api/proxy' : 'http://localhost:3000/api';
export const getPayrollExportUrl = (month?: string) => `${getProxyBase()}/finance/export/payroll.csv${month ? `?month=${month}` : ''}`;
export const getCampaignExportUrl = () => `${getProxyBase()}/finance/export/campaigns.csv`;
export const getCampaignReportUrl = (id: string) => `${getProxyBase()}/finance/export/campaign/${id}.csv`;
export const getInvoiceUrl = (id: string, print = false) => `${getProxyBase()}/finance/invoice/${id}${print ? '?print=true' : ''}`;
export const getAutoPayroll = () => api.get('/finance/payroll').then(res => res.data);
export const processPayrollPayment = (data: { driverId: string; month: number; year: number; reference: string }) => api.post('/finance/payroll/pay', data).then(res => res.data);

// Campaign Segmentation
export const assignDriversToCampaign = (campaignId: string, data: { driverIds: string[]; targetAll: boolean }) =>
  api.post(`/campaigns/${campaignId}/drivers`, data).then(res => res.data);

export const getTabletPlaylist = (deviceId: string) => api.get(`/campaigns/tablet/${deviceId}/playlist`).then(res => res.data);

// Delete operations
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`).then(res => res.data);
export const createDevice = (data: Record<string, unknown>) => api.post('/devices', data).then(res => res.data);
export const updateDevice = (id: string, data: Record<string, unknown>) => api.put(`/devices/${id}`, data).then(res => res.data);
export const deleteDevice = (deviceId: string) => api.delete(`/devices/${deviceId}`).then(res => res.data);

// Device Profile
export const getDeviceProfile = (deviceId: string) => api.get(`/devices/${deviceId}/profile`).then(res => res.data);
export const updateDeviceProfile = (deviceId: string, data: Record<string, unknown>) => api.put(`/devices/${deviceId}/profile`, data).then(res => res.data);

// GPS Tracking
export const getTrackingData = () => api.get('/fleet/tracking').then(res => res.data);
export const getTrackingSummary = () => api.get('/fleet/tracking/summary').then(res => res.data);

export default api;
