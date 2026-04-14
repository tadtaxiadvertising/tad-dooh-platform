import { GpsPoint, VirtualDriver } from './modules/drivers';
import { PlaybackEvent } from './modules/finance';

export class SyncEngine {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = process.env.TAD_API_URL || 'http://localhost:3000/api/v1';
    this.apiKey = process.env.TAD_API_KEY || 'xxx-sim-secret-xxx';
  }

  /**
   * Sends a batch of GPS points to the monitoring endpoint.
   */
  async sendGpsBatch(driver: VirtualDriver, points: GpsPoint[]): Promise<number> {
    try {
      const payload = {
        deviceId: driver.vehicleId,
        driverId: driver.id,
        points: points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          speed: p.speed,
          timestamp: p.timestamp
        }))
      };

      const response = await fetch(`${this.apiUrl}/monitoring/gps-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey // Custom header for simulator auth
        },
        body: JSON.stringify(payload)
      });

      return response.status;
    } catch (error) {
      console.error(`[SyncEngine] Failed to send GPS batch for ${driver.vehicleId}:`, error);
      return 500;
    }
  }

  /**
   * Sends a batch of playback events to the analytics endpoint.
   */
  async sendPlaybackBatch(events: PlaybackEvent[]): Promise<number> {
    try {
      const payload = events.map(e => ({
        deviceId: e.deviceId,
        campaignId: e.campaignId,
        adId: e.adId,
        eventType: 'play_confirm',
        timestamp: e.timestamp,
        metadata: {
          revenue: e.revenue,
          isSimulated: true
        }
      }));

      const response = await fetch(`${this.apiUrl}/analytics/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({ events: payload })
      });

      return response.status;
    } catch (error) {
      console.error(`[SyncEngine] Failed to send playback batch:`, error);
      return 500;
    }
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
