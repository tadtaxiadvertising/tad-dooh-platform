import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://tad-api.vercel.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDevices = () => api.get('/fleet/devices').then(res => res.data);
export const getOfflineDevices = () => api.get('/fleet/offline').then(res => res.data);
export const getPlayerErrors = () => api.get('/fleet/player-errors').then(res => res.data);

export const getCampaigns = () => api.get('/campaigns').then(res => res.data);
export const createCampaign = (data: any) => api.post('/campaigns', data).then(res => res.data);
export const addVideoToCampaign = (campaignId: string, data: any) => api.post(`/campaigns/${campaignId}/assets`, data).then(res => res.data);

export const getMedia = () => api.get('/media').then(res => res.data);
export const uploadMedia = (formData: FormData) => 
  api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);

export const getTopTaxis = () => api.get('/analytics/top-taxis').then(res => res.data);
export const getHourlyPlays = () => api.get('/analytics/hourly').then(res => res.data);

export default api;
