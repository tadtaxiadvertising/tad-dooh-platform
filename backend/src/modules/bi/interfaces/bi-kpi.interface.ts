export interface BiKpiResponse {
  mrr: number;
  activeSubscribers: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  criticalDevices: number;
  activeCampaigns: number;
  totalImpressionsMtd: number;
  deliveryRateAvg: number;
  syncHealthRate: number;
  lastUpdate: Date;
}

export type SemaphoreColor = 'GREEN' | 'YELLOW' | 'RED';

export interface TaxiDrillDownResponse {
  device: {
    id: string;
    deviceId: string;
    taxiNumber: string;
    city: string;
    appVersion: string;
    playerStatus: string;
  };
  connectivity: {
    status: SemaphoreColor;
    lastHeartbeat: Date;
    hoursOffline: number;
  };
  battery: {
    current: number;
    status: SemaphoreColor;
    history: { ts: Date; level: number }[];
  };
  gps: {
    lastLat: number;
    lastLng: number;
    lastKnownLocations: any[];
    googleMapsUrl: string;
  };
  financials: {
    subscriptionStatus: string;
    subscriptionEnd: Date;
    daysUntilExpiry: number;
    payrollPending: { amount: number; since: Date } | null;
  };
  driver: {
    name: string;
    phone: string;
    subscriptionPaid: boolean;
  };
}
