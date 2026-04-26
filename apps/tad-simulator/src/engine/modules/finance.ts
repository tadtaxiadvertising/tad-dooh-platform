export interface PlaybackEvent {
  deviceId: string;
  campaignId: string;
  adId: string;
  timestamp: string;
  revenue: number; // RD$500 strictly as per requirement
  duration: number; // 15s default
}

export class FinanceModule {
  private static readonly FIXED_REVENUE = 500;

  /**
   * Generates a Playback Complete event designed to validate the payroll engine.
   * Every event generated here must result in RD$500 in the tad-api ledger.
   */
  static generatePlaybackEvent(deviceId: string, campaignId: string, adId: string): PlaybackEvent {
    return {
      deviceId,
      campaignId,
      adId,
      timestamp: new Date().toISOString(),
      revenue: this.FIXED_REVENUE,
      duration: 15
    };
  }

  /**
   * Simulates a batch of events (e.g. after a full day shift)
   */
  static generateShiftReport(deviceId: string, campaignId: string, adId: string, playCount: number): PlaybackEvent[] {
    const events: PlaybackEvent[] = [];
    const baseTime = new Date().getTime() - (8 * 60 * 60 * 1000); // 8 hours ago

    for (let i = 0; i < playCount; i++) {
      const eventTime = new Date(baseTime + (i * 5 * 60 * 1000)); // Every 5 mins
      events.push({
        ...this.generatePlaybackEvent(deviceId, campaignId, adId),
        timestamp: eventTime.toISOString()
      });
    }

    return events;
  }

  static calculateTotalRevenue(events: PlaybackEvent[]): number {
    return events.reduce((sum, e) => sum + e.revenue, 0);
  }
}
