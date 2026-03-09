import axios from 'axios';

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

// Campaigns
export const getCampaigns = () => api.get('/campaigns').then(res => res.data);
export const getCampaignById = (id: string) => api.get(`/campaigns/${id}`).then(res => res.data);
export const createCampaign = (data: any) => api.post('/campaigns', data).then(res => res.data);
export const addVideoToCampaign = (campaignId: string, data: any) => api.post(`/campaigns/${campaignId}/assets`, data).then(res => res.data);

// Media
export const getMedia = () => api.get('/media').then(res => res.data);
export const uploadMedia = (formData: FormData) => 
  api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);

export const registerMockMedia = (data: { filename: string; mimetype: string; size: number }) => 
  api.post('/media/register-mock', data).then(res => res.data);

// Analytics
export const getTopTaxis = () => api.get('/analytics/top-taxis').then(res => res.data);
export const getHourlyPlays = () => api.get('/analytics/hourly').then(res => res.data);

export default api;

