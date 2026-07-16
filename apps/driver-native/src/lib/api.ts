/**
 * api.ts — Direct Backend API Client for Native App
 *
 * In React Native, there is NO CORS issue, so we call the NestJS backend
 * directly without the Next.js proxy layer (`/api/proxy/*`).
 *
 * Same endpoints, same payloads — zero backend modification required.
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { readAuthValue, deleteAuthValue } from './database';

const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000/api/v1'   // Android emulator → host localhost
  : 'https://api.tad.dooh.com/api/v1';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth Interceptors ────────────────────────────────────────────────────────

client.interceptors.request.use(async (config) => {
  const token = readAuthValue('tad_driver_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const deviceId = readAuthValue('TAD_DEVICE_ID');
  if (deviceId) {
    config.headers['x-device-id'] = deviceId;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;

    // Kill-Switch 402: Subscription unpaid → lock the device
    if (status === 402) {
      deleteAuthValue('tad_driver_token');
      deleteAuthValue('tad_driver_user');
      // Emit global event for KillSwitchOverlay
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).__TAD_FORCE_LOGOUT = { reason: 'SUBSCRIPTION_UNPAID' };
      }
    }

    // 401: Token expired — attempt refresh or redirect to login
    if (status === 401) {
      deleteAuthValue('tad_driver_token');
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).__TAD_FORCE_LOGOUT = { reason: 'TOKEN_EXPIRED' };
      }
    }

    return Promise.reject(error);
  }
);

export default client;
export { API_BASE_URL };
