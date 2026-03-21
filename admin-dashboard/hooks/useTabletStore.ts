import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TabletState {
  deviceId: string | null;
  gpsBuffer: any[];
  isOnline: boolean;
  lastSyncAt: string | null;
  
  // Actions
  setDeviceId: (id: string) => void;
  addToGpsBuffer: (data: any) => void;
  clearGpsBuffer: () => void;
  setOnlineStatus: (status: boolean) => void;
  markSynced: () => void;
}

export const useTabletStore = create<TabletState>()(
  persist(
    (set) => ({
      deviceId: null,
      gpsBuffer: [],
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSyncAt: null,

      setDeviceId: (id) => set({ deviceId: id }),
      
      addToGpsBuffer: (data) => set((state) => ({ 
        gpsBuffer: [...state.gpsBuffer, { ...data, timestamp: new Date().toISOString() }] 
      })),
      
      clearGpsBuffer: () => set({ gpsBuffer: [] }),
      
      setOnlineStatus: (status) => set({ isOnline: status }),
      
      markSynced: () => set({ lastSyncAt: new Date().toISOString() }),
    }),
    {
      name: 'tad-tablet-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
