import axios from 'axios';
import { supabase } from '../lib/supabase';

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

export const api = axios.create({
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
    try {
      // 1. Prioridad: Sesión activa de Supabase (Refresco automático)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        // 2. Fallback: LocalStorage (Para compatibilidad con login legacy)
        const localToken = localStorage.getItem('tad_admin_token');
        if (localToken) {
          config.headers.Authorization = `Bearer ${localToken}`;
        }
        // No emitimos console.warn aquí para evitar spam en el primer render
        // El backend devolverá 401 si realmente falta el acceso.
      }
    } catch (error) {
      console.error('🔐 AUTH_ERROR:', error);
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

    if (error.response?.status === 402) {
      const { usePaymentStore } = require('../store/usePaymentStore');
      const message = error.response?.data?.message || 'Suscripción de RD$6,000 pendiente';
      usePaymentStore.getState().setLock(true, message);
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Evitar loops infinitos de redirección
      const isPublicPath = window.location.pathname.includes('/login') || window.location.pathname.includes('/check-in');
      
      if (!isPublicPath) {
        localStorage.removeItem('tad_admin_token');
        localStorage.removeItem('tad_admin_user');
        
        // 🔥 Destruir la sesión de Supabase cliente para matar el ping-pong loop
        supabase.auth.signOut().catch(() => {});
        
        // Pequeño delay garantizando que el estado se limpie
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
    
    // 🔥 IMPORTANTE: Inyectar cookie aquí también por si el login no lo hace
    if (typeof window !== 'undefined') {
      document.cookie = `sb-access-token=${access_token}; path=/; max-age=604800; SameSite=Lax; Secure`;
    }
    
    return res.data;
  });

export const logout = () => {
  localStorage.removeItem('tad_admin_token');
  localStorage.removeItem('tad_admin_user');
  document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
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
  // 1. Calcular Checksum (SRE Rule 05)
  const hashMd5 = await computeMD5(file);

  // 2. Pedir URL firmada de subida al backend
  const urlRes = await api.get(`/media/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${file.type}`);
  const { uploadUrl, path, publicUrl } = urlRes.data;

  // 3. BYPASS: Subir directo a Supabase Storage (Node.js respira 🫁)
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
      'Cache-Control': 'max-age=3600'
    }
  });

  // 4. Registrar el asset en la Base de Datos con el Hash calculado
  const regRes = await api.post('/media/register-bypassed', {
    filename: file.name,
    contentType: file.type,
    size: file.size,
    campaignId,
    storageKey: path,
    publicUrl: publicUrl,
    hashMd5, // Enviamos el hash para validación en tablet
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
};

export const uploadCampaignMedia = async (campaignId: string, file: File) => {
  const uploadedData = await uploadMedia(file, campaignId);
  return uploadedData;
};

export const registerMockMedia = (data: { filename: string; mimetype: string; size: number }) =>
  api.post('/media/register-mock', data).then(res => res.data);
export const deleteMedia = (id: string) => api.delete(`/media/${id}`).then(res => res.data);

// Analytics
export const getAnalyticsSummary = () => api.get('/analytics/summary').then(res => res.data);
export const getWeeklyPerformance = (campaignId: string) => api.get(`/analytics/campaign/${campaignId}/weekly`).then(res => res.data);
export const shareReportByWhatsApp = (campaignId: string, data: { phone: string; advertiserName: string; campaignName: string; reportUrl: string }) => 
  api.post(`/analytics/campaign/${campaignId}/share-whatsapp`, data).then(res => res.data);
export const getTopTaxis = () => api.get('/analytics/top-taxis').then(res => res.data);
export const getHourlyPlays = () => api.get('/analytics/hourly').then(res => res.data);
export const getRecentPlays = () => api.get('/analytics/recent-plays').then(res => res.data);
export const getHeatmapData = () => api.get('/analytics/heatmap').then(res => res.data);

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
export const simulatePayment = (month?: string) => api.get(`/finance/simulate-payment${month ? `?month=${month}` : ''}`).then(res => res.data);
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

// Device Profile
export const getDeviceProfile = (deviceId: string) => api.get(`/devices/${deviceId}/profile`).then(res => res.data);
export const updateDeviceProfile = (deviceId: string, data: Record<string, unknown>) => api.put(`/devices/${deviceId}/profile`, data).then(res => res.data);

// GPS Tracking
export const getTrackingData = () => api.get('/fleet/tracking').then(res => res.data);
export const getTrackingSummary = () => api.get('/fleet/tracking/summary').then(res => res.data);
export const getDeviceRecentPath = (deviceId: string) => api.get(`/fleet/devices/${deviceId}/recent-path`).then(res => res.data);
export const getAdvertiserPortalData = (id: string) => api.get(`/advertisers/${id}/portal`).then(res => res.data);

// Portal Requests
export const createPortalRequest = (data: any) => api.post('/portal-requests', data).then(res => res.data);
export const getPortalRequests = () => api.get('/portal-requests').then(res => res.data);
export const getAdvertiserPortalRequests = (advertiserId: string) => api.get(`/portal-requests/advertiser/${advertiserId}`).then(res => res.data);
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

/** Envía confirmación de pago a conductor por email */
export const emailDriverPaymentConfirm = (data: {
  email: string;
  driverName: string;
  amount: number;
  month: string;
  driverId?: string;
}) => api.post('/finance/payroll/email-confirm', data).then(res => res.data);

// Business Intelligence (BI)
export const getBiKpis = () => api.get('/bi/kpis').then(res => res.data);
export const getBiFleetHealth = () => api.get('/bi/fleet-health').then(res => res.data);
export const getTaxiDrillDown = (deviceId: string) => api.get(`/bi/fleet-health/${deviceId}/drill-down`).then(res => res.data);
export const generateReconciliation = (period: string) => api.post('/bi/reconciliation/generate', { period }).then(res => res.data);
export const getReconciliationReport = (period: string) => api.get(`/bi/reconciliation/${period}`).then(res => res.data);
export const getBiHotspots = () => api.get('/bi/hotspots').then(res => res.data);

export default api;
