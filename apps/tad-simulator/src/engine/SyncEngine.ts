import { GpsPoint, VirtualDriver } from './modules/drivers';
import { PlaybackEvent } from './modules/finance';

export class SyncEngine {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    let rawUrl = process.env.TAD_API_URL || 'http://tad-api:3000/api/v1';
    // SRE Fix: Fallback for unresolvable domain in monorepo/docker
    if (rawUrl.includes('proyecto_ia.ibusiness.com.do') || rawUrl.includes('localhost')) {
        // In EasyPanel/Docker, 'tad-api' is the typically internal hostname
        rawUrl = 'http://tad-api:3000/api/v1'; 
    }
    this.apiUrl = rawUrl;
    this.apiKey = process.env.SIMULATOR_API_KEY || process.env.TAD_API_KEY || 'xxx-sim-secret-xxx';
  }

  /**
   * Professional Synchronizer: Uses the production payload format (bulk-sync)
   */
  private async unifiedSync(deviceId: string, data: { locations?: any[], playbacks?: any[] }): Promise<number> {
    if (!this.apiUrl) return 500;

    try {
      const payload = {
        device_id: deviceId,
        isSimulated: true, // SRE Requirement: Flag every simulated request
        battery_level: 95,
        storage_free: '12GB',
        lat: data.locations?.[data.locations.length - 1]?.lat,
        lng: data.locations?.[data.locations.length - 1]?.lng,
        locations: (data.locations || []).map(l => ({ ...l, isSimulated: true })),
        playbacks: (data.playbacks || []).map(p => ({ ...p, isSimulated: true }))
      };

      const response = await fetch(`${this.apiUrl}/device/bulk-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      return response.status;
    } catch (error) {
      console.error(`[SyncEngine] Bulk Sync Failed for ${deviceId}:`, error);
      return 500;
    }
  }

  /**
   * Sends a batch of GPS points to the monitoring endpoint.
   */
  async sendGpsBatch(driver: VirtualDriver, points: GpsPoint[]): Promise<number> {
    const locations = points.map(p => ({
      lat: p.latitude,
      lng: p.longitude,
      timestamp: p.timestamp
    }));
    return this.unifiedSync(driver.vehicleId, { locations });
  }

  /**
   * Sends a batch of playback events to the analytics endpoint.
   */
  async sendPlaybackBatch(events: PlaybackEvent[]): Promise<number> {
    if (events.length === 0) return 200;
    const deviceId = events[0].deviceId;
    
    const playbacks = events.map(e => ({
      video_id: e.campaignId, // Map to video_id
      timestamp: e.timestamp,
      lat: 19.45, // Fallback lat for Santiago if not provided
      lng: -70.69
    }));
    
    return this.unifiedSync(deviceId, { playbacks });
  }

  /**
   * Measures API latency (Healthcheck)
   */
  async measureLatency(): Promise<number> {
    const start = Date.now();
    try {
      await fetch(`${this.apiUrl}/monitoring/fleet-status?limit=1`, {
        headers: { 'x-api-key': this.apiKey }
      });
      return Date.now() - start;
    } catch (e) {
      return -1;
    }
  }
}
