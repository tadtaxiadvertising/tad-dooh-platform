export interface TaxiData {
  id: string;
  driver_name?: string;
  license_plate?: string;
  latitude: number;
  longitude: number;
  status: 'online' | 'offline' | 'idle';
  speed?: number;
  last_update?: string | Date;
}
