export interface FleetVehicle {
  deviceId: string;
  taxiNumber?: string;
  driverName?: string;
  plate?: string;
  isOnline?: boolean;
  subscriptionStatus?: string;
  lastLat?: number | null;
  lastLng?: number | null;
}

export type HeatmapPoint = [number, number, number];
export interface PathPoint {
  lat: number;
  lng: number;
}
