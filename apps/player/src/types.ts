// ─── TAD DOOH Player — Type Definitions ───

export interface MediaAsset {
  id: string;
  campaignId: string;
  filename: string;
  url: string;
  checksum: string;
  hashMd5: string | null;
  duration: number;
  qrUrl: string | null;
  version: number;
  advertiserId: string | null;
  advertiserName: string;
  weight: number;
}

export interface CampaignSchedule {
  campaignId: string;
  scheduleDays: string[];
  scheduleHours: string[];
  frequencyCap: number;
}

export interface SyncManifest {
  timestamp: string;
  expiresAt: string;
  etag: string;
  licenseToken: string;
  device: { id: string; deviceId: string; taxi: string };
  count: number;
  playlist: MediaAsset[];
  schedules: CampaignSchedule[];
  killSwitch?: boolean;
  killSwitchReason?: string;
}

export interface DeviceSyncPayload {
  update: boolean;
  blocked: boolean;
  sync_hash: string;
  licenseToken?: string;
  expiresAt?: string;
  campaign_version?: number;
  media_assets: MediaAsset[];
  videos?: MediaAsset[];
  commands?: DeviceCommand[];
  reason?: string;
}

export interface DeviceCommand {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

/** Execution result, not a delivery receipt. Only successful safe operations may be ACKed. */
export interface DeviceCommandResult {
  id: string;
  success: boolean;
}

export interface PlaybackEvent {
  device_id: string;
  video_id: string;
  timestamp: number;
  lat?: number;
  lng?: number;
  event_type: string;
}

export interface HeartbeatPayload {
  device_id: string;
  battery_level?: number;
  storage_free?: number;
  player_status?: string;
  lat?: number;
  lng?: number;
  timestamp?: string;
}

export interface CachedVideo {
  url: string;
  blob: Blob;
  checksum: string;
  cachedAt: number;
  size: number;
}

export type PlayerStatus =
  "idle" | "playing" | "intermission" | "error" | "killswitch";
