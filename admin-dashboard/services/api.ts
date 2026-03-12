import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.vercel.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// JWT Auth Interceptor
// ============================================
// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('tad_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('tad_admin_token');
      localStorage.removeItem('tad_admin_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
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
export const sendCommand = (deviceId: string, type: string, params: any = {}) => 
  api.post(`/fleet/${deviceId}/command`, { type, params }).then(res => res.data);

// Device Inventory
export const getDeviceCampaigns = (deviceId: string) => api.get(`/devices/${deviceId}/campaigns`).then(res => res.data);
export const removeCampaignFromDevice = (deviceId: string, campaignId: string) => api.delete(`/devices/${deviceId}/campaigns/${campaignId}`).then(res => res.data);
export const getCampaignDevices = (campaignId: string) => api.get(`/campaigns/${campaignId}/devices`).then(res => res.data);

// Campaigns
export const getCampaigns = () => api.get('/campaigns').then(res => res.data);
export const getCampaignById = (id: string) => api.get(`/campaigns/${id}`).then(res => res.data);
export const createCampaign = (data: any) => api.post('/campaigns', data).then(res => res.data);
export const assignCampaignToDevices = (id: string, deviceIds: string[]) => 
  api.post(`/campaigns/${id}/assign`, { deviceIds }).then(res => res.data);
export const addVideoToCampaign = (campaignId: string, data: any) => api.post(`/campaigns/${campaignId}/assets`, data).then(res => res.data);

// Media
export const getMedia = () => api.get('/media').then(res => res.data);
export const getMediaStatus = (id: string) => api.get(`/media/${id}/status`).then(res => res.data);
export const uploadMedia = async (file: File, campaignId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('campaignId', campaignId || 'general');

  const res = await api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

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

  // 1. Upload safely via our backend, enforcing limits and injecting service credentials
  const res = await api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  // 2. Register metadata in our backend (NestJS/Prisma)
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
export const getTopTaxis = () => api.get('/analytics/top-taxis').then(res => res.data);
export const getHourlyPlays = () => api.get('/analytics/hourly').then(res => res.data);
export const getRecentPlays = () => api.get('/analytics/recent-plays').then(res => res.data);

// Drivers
export const getDrivers = () => api.get('/drivers').then(res => res.data);
export const getDriverStats = () => api.get('/drivers/stats').then(res => res.data);
export const createDriver = (data: any) => api.post('/drivers', data).then(res => res.data);
export const updateDriverSubscription = (id: string, data: any) => api.put(`/drivers/${id}/subscription`, data).then(res => res.data);

// Advertisers
export const getAdvertisers = () => api.get('/advertisers').then(res => res.data);
export const createAdvertiser = (data: any) => api.post('/advertisers', data).then(res => res.data);

// Finance
export const getCampaignBilling = () => api.get('/finance/report/campaigns').then(res => res.data);
export const getDriverPayroll = (month?: string) => api.get(`/finance/report/payroll${month ? `?month=${month}` : ''}`).then(res => res.data);
export const simulatePayment = (month?: string) => api.get(`/finance/simulate-payment${month ? `?month=${month}` : ''}`).then(res => res.data);
export const getPayrollExportUrl = (month?: string) => `${process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.vercel.app/api'}/finance/export/payroll.csv${month ? `?month=${month}` : ''}`;
export const getCampaignExportUrl = () => `${process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.vercel.app/api'}/finance/export/campaigns.csv`;
export const getInvoiceUrl = (id: string, print = false) => `${process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.vercel.app/api'}/finance/invoice/${id}${print ? '?print=true' : ''}`;
export const getAutoPayroll = () => api.get('/finance/payroll').then(res => res.data);
export const processPayrollPayment = (data: { driverId: string; month: number; year: number; reference: string }) => api.post('/finance/payroll/pay', data).then(res => res.data);

// Campaign Segmentation
export const assignDriversToCampaign = (campaignId: string, data: { driverIds: string[]; targetAll: boolean }) => 
  api.post(`/campaigns/${campaignId}/drivers`, data).then(res => res.data);

export const getTabletPlaylist = (deviceId: string) => api.get(`/campaigns/tablet/${deviceId}/playlist`).then(res => res.data);

// Delete operations
export const deleteCampaign = (id: string) => api.delete(`/campaigns/${id}`).then(res => res.data);
export const createDevice = (data: any) => api.post('/devices', data).then(res => res.data);
export const updateDevice = (id: string, data: any) => api.put(`/devices/${id}`, data).then(res => res.data);
export const deleteDevice = (deviceId: string) => api.delete(`/devices/${deviceId}`).then(res => res.data);

// Device Profile (full info with driver + campaigns)
export const getDeviceProfile = (deviceId: string) => api.get(`/devices/${deviceId}/profile`).then(res => res.data);

export default api;

