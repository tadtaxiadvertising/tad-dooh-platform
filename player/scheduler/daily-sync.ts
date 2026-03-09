import { checkSync } from '../api/sync';
import { sendHeartbeat } from '../api/heartbeat';
import { EventQueue } from '../storage/event-queue';
import { VideoCache } from '../storage/video-cache';
import { VideoEngine, VideoAsset } from '../player/video-engine';

export class Scheduler {
  private deviceId: string;
  private engine: VideoEngine;
  
  // Local state reference mapping 
  private currentVersion: number | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deviceId: string, engine: VideoEngine) {
    this.deviceId = deviceId;
    this.engine = engine;
  }

  public async init() {
    this.setupNetworkListeners();
    this.startHeartbeatPulse();

    // Evaluate sync immediately on boot
    if (navigator.onLine) {
       await this.executeFullSync();
    } else {
       // Pull from localStorage fallback initially before connection establishes
       const cached = localStorage.getItem('tad_active_campaign');
       if (cached) {
          const payload = JSON.parse(cached);
          this.currentVersion = payload.campaign_version;
          this.engine.setPlaylist(payload.videos);
       }
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', async () => {
      console.log('Network restored. Offloading cached loops and fetching Sync.');
      await EventQueue.flushQueue();
      await this.executeFullSync();
    });
  }

  /**
   * Called primarily once per day or upon network re-establishment to execute full campaign syncs securely
   */
  private async executeFullSync() {
    // 1. Send lingering queue drops
    await EventQueue.flushQueue();

    // 2. Poll the Campaign Payload mapping version states
    const syncData = await checkSync(this.deviceId);
    
    // 3. Compare Version integer overrides logically
    if (syncData && syncData.campaign_version !== this.currentVersion) {
      console.log(`Receiving new Campaign (v${syncData.campaign_version}). Executing Blob Mapping.`);
      
      const success = await VideoCache.cacheVideos(syncData.videos);
      
      if (success) {
        this.currentVersion = syncData.campaign_version;
        localStorage.setItem('tad_active_campaign', JSON.stringify(syncData));
        this.engine.setPlaylist(syncData.videos as VideoAsset[]);
        console.log('Campaign Sync Complete!');
      }
    } else {
      console.log('No new campaigns available or currently fully up to date.');
    }

    // 4. End with Heartbeat verification over states
    await this.transmitHeatbeat();
  }

  private startHeartbeatPulse() {
    // 5 Minute Interval
    this.heartbeatInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.transmitHeatbeat();
      }
    }, 5 * 60 * 1000);
  }

  private async transmitHeatbeat() {
      const battery = ('getBattery' in navigator) ? await (navigator as any).getBattery() : null;
      let batteryLevel = battery ? Math.round(battery.level * 100) : 100;
      
      // Attempt Storage Quota parsing if available
      let storageFree = "Unknown";
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota && estimate.usage) {
           const freeBytes = estimate.quota - estimate.usage;
           storageFree = `${(freeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
        }
      }

      // Check Engine watchdog/status logically mapping anomalies natively.
      await sendHeartbeat(
        this.deviceId,
        batteryLevel,
        storageFree,
        this.engine.playerStatus
      );
  }

  public stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
