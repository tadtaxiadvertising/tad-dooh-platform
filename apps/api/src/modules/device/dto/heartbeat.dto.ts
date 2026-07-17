export class HeartbeatDto {
  device_id!: string;
  battery_level?: number;
  storage_free?: string;
  player_status?: string;
  lat?: number;
  lng?: number;
  timestamp?: string;
}
