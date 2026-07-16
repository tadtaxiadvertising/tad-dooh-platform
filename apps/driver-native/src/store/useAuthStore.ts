import { create } from 'zustand';
import { readAuthValue, saveAuthValue, deleteAuthValue, initDatabase } from '../lib/database';

interface AuthState {
  isAuthenticated: boolean;
  driverId: string | null;
  driverName: string | null;
  deviceId: string | null;
  token: string | null;
  login: (token: string, driverId: string, driverName: string) => void;
  logout: () => void;
  setDeviceId: (deviceId: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  driverId: null,
  driverName: null,
  deviceId: null,
  token: null,

  login: (token, driverId, driverName) => {
    initDatabase();
    saveAuthValue('tad_driver_token', token);
    saveAuthValue('tad_driver_user', JSON.stringify({ entityId: driverId, name: driverName }));
    // Store in globalThis for background task access
    (globalThis as any).__TAD_DRIVER_ID = driverId;
    (globalThis as any).__TAD_DEVICE_ID = readAuthValue('TAD_DEVICE_ID') || 'unknown';
    set({ isAuthenticated: true, token, driverId, driverName });
  },

  logout: () => {
    initDatabase();
    deleteAuthValue('tad_driver_token');
    deleteAuthValue('tad_driver_user');
    (globalThis as any).__TAD_DRIVER_ID = undefined;
    set({ isAuthenticated: false, token: null, driverId: null, driverName: null });
  },

  setDeviceId: (deviceId) => {
    initDatabase();
    saveAuthValue('TAD_DEVICE_ID', deviceId);
    (globalThis as any).__TAD_DEVICE_ID = deviceId;
    set({ deviceId });
  },
}));
