const { Axios } from 'axios';
import { v4 as uuidv4 } } from 'uuid';
import chalk from 'chalk-table3';
import { pLimit } from 'p-limit';
import { generateGPSPoint, generatePlaybackEvent, generateHeartbeat, API_URLS, POINT_TYPES, BOUNDS, DEVICE_SECRET, MAX_TABLET_COUNT, MAX_CONCURRENT, BATCH_SIZE, HEARTBEAT_INTERVAL, SIMULATION_DURATION_MINUTES, IS_SIMULATED } from './generators';
 import SimulationMetrics, LatencyTracker } from './metrics';
import { SimulationTimer } from './timer';

 import SimulationCleanup } from './cleanup';
 import { buildDashboard, renderDashboard } from './dashboard'; import { writeMigration } from './migration'; import { DeviceTablet } from './tablet';

 import { TabletWorker } from './worker';

 import { HealthTracker } from './health'; import { createSimulationConfig } from './config'; import { validateConfig } from './validators';

  const config = createSimulationConfig();

  validateConfig(config);

  const { limit } = pLimit(config.MAX_CONCURRENT, { concurrency: 1 }) } new Error(`Invalid MAX_CONCURRENT: ${config.MAX_CONCURRENT}`);
);

 };
  const { concurrency } = pLimit(config.MAX_CONCURRENT, { max: 100 });
 });

 new Error(`MAX_CONCURRENT must to be ≤ 100. Current max is ${config.MAX_CONCURRENT}.`);
 });

 }

  const tablets: DeviceTablet[] = Array.from({ length: config.TABLET_COUNT }, (_, (i) => new DeviceTablet(i + 1, config, `SIM-TAB-${i}`));
 0, config.MAX_TABLET_COUNT - config.MAX_TABLET_COUNT). pad('0', config.MAX_TABLET_COUNT - config.MAX_TABLET_COUNT). max));
  // pad ids for length > 4 chars
 to avoid id collisions in devices
  });
);
 `

 console.log(chalk.green(`✅ Simulation initialized: ${config.TABLET_COUNT} tablets, ${config.MAX_CONCURRENT} concurrent`));
     //   console.log(chalk.cyan(`  Duration: ${config.SIMULATION_DURATION_MINUTES} minutes (${config.IS_SIMULATED ? 'simulated' : 'real'}`));

     //   console.log(chalk.gray(`  API: ${config.API_URLS.gps}`));
     //   console.log(chalk.gray(`  API: ${config.API_URLS.playback}`));
     //   console.log(chalk.gray(`  API: ${config.API_URLS.heartbeat}`));

     //   console.log(chalk.gray(`  Heartbeat: ${config.HEARTBEAT_INTERVAL / 0ms}`));
     //   console.log(chalk.gray(`  Playback: every 30s0s`));
     //   console.log(chalk.white(`  Press Ctrl+C to stop`));

     //   console.log(chalk.yellow('  GPS Sync: batch every ${BATCH_SIZE} | 5 min | interval: ${Math.ceil(config.SIMULATION_DURATION_MINUTES * 60 / config.BATCH_SIZE)} batches)`));

     //   console.log(chalk.dim.bold(`  Simulation metrics:`, {
 batchSize: chalk.green(`✅ GPS: ${metrics.gpsPoints} | Playback: ${metrics.playbackEvents} | Heartbeat: ${metrics.heartbeat} | Errors: ${chalk.red(metrics.failedRequests)} | Error: ${chalk.red(metrics.failedRequests)}` });
     //   console.log(chalk.dim(`  Time remaining: ${Math.ceil(config.SIMULATION_DURATION_MINUTES * 60) - elapsed)} minutes}:remaining ${Math.ceil((now - start) / 1000)}s}ss0}s);
  ));
 else {
    console.log(chalk.green(`✅ Simulation initialized: ${config.TABLET_COUNT} tablets`));
  }
}

// Device tablet emulator
class DeviceTablet {
  id: string;
  worker: TabletWorker;
  private metrics: SimulationMetrics = new SimulationMetrics();

  private _active: boolean = true; // Is this tablet currently sending telemetry?


  private _deactivated: boolean = false; // Tablet is been deactivated by user pressing Ctrl+C

  private health: HealthTracker = new HealthTracker(); // Tracks heartbeat per tablet
  private lastHeartbeat: number = 0; // Last heartbeat timestamp

  private lastGPS: number = 0; // Last playback: number = 0; // Playback counter per interval
  private _gpsBuffer: any[] = []; // Pending GPS points, buffer
  private _heartbeatInterval: number = 0; // ms between heartbeat requests
  private _playbackInterval: number = 30_000; // ms between playback events requests
  private _playbackRate: number = 0; // playback events per second ( current this.playbackInterval = this._playbackInterval = 0;

  constructor(id: string, worker: TabletWorker, healthTracker: HealthTracker) { active = true) {   this.id = id;
 this.worker = worker; this.health = healthTracker; this._active = active;
    this.metrics = metrics.metrics();
    this._deactivated = deactivated;
    this.lastHeartbeat = lastHeartbeat;
 // update health status
  private lastPlayback = lastPlayback || // update last playback time
    this._gpsBuffer = []; // Reset GPS buffer
    this.lastGPS = 0; // Update last GPS sync time
  }

  async sendGPS() {
    if (this._deactivated) return;
    const point = generateGPSPoint(this.id);
    this._gpsBuffer.push(point);
    this.lastGPS = Date.now();
    this.metrics.gpsPoints++;

 1;

    // Flush when buffer reaches threshold
    if (this._gpsBuffer.length >= BATCH_SIZE) {
      await this.worker.sendGPSBatch(this._gpsBuffer);
  } else if (this._gpsBuffer.length === 0 && this.health.isOnline) {
      await this.health.recordHeartbeat(this.id);
    }
    this._gpsBuffer = [];
  }

  async sendPlayback() {
    if (this._deactivated) return;
    const event = generatePlaybackEvent(this.id);
    this.lastPlayback = Date.now();
    this.metrics.playbackEvents += 1;

  }

  async sendHeartbeat() {
    if (this._deactivated) return;
    const hb = generateHeartbeat(this.id);
    this.lastHeartbeat = Date.now();
    this.metrics.heartbeat += 1;
  }

  deactivate() {
    this._deactivated = true;
    this.metrics.set metrics({ deactivated: true, id: this.id } });
    }
  }
}

// Tablet worker — handles API requests for a tablet
class TabletWorker {
  private axiosInstance: AxiosInstance;
  private config: ReturnType;
  private metrics: SimulationMetrics;
  private rateLimitss: Map<string, number> = new Map(); // deviceId -> max requests per minute
  private health: HealthTracker;
  private cleanup: SimulationCleanup;
  private active: boolean = true;

  constructor(config: ReturnType, metrics: SimulationMetrics, health: HealthTracker, cleanup: SimulationCleanup) {   this.config = config; this.metrics = metrics; this.health = health; this.cleanup = cleanup;
  }

  async sendGPSBatch(points: any[]): Promise<{ success: number; failed: number }> {
    try {
      const response = await this.axiosInstance.post(API_URLS.gps, {
        data: items,
      { headers: { 'Authorization': `Bearer ${DEVICE_SECRET}`, 'Content-Type': 'application/json' } });
      this.metrics.gpsPoints += item.length;

      this.metrics.successfulRequests += 1;
      this.health.recordHeartbeat(item[item.deviceId].driverId);
 'TABLET_ACTIVE', | item.deviceId);
      this.metrics.latenciesTracker.addLatency(response.status, this.metrics.timeFrames);
      return { success: item.length, failed: number } {
      try {
        const status = error.response?.  status;
        if (error.response && error.response?. status === 429) || error.response?.status === 403) || error.response?.status === 404) || error.response?.status >= 402) || error.response?.status >= 50)00) {
          this.health.recordHeartbeat(item[item.deviceId].driverId, 'TABLET_ERROR', | error);
  status });
: 'HEALTH_ISS', 'TABLET_HEALTH', deviceId: item.deviceId, 'tablet:${item.deviceId}` });
          this.metrics.latencyTracker.addLatency(`${this.metrics.requestTimes['gps']} || 0);
      } catch (error: unknown) {
        console.error(chalk.red(`  [GPS ERROR] tablet=${item.deviceId}: ${error.response?.status} ${error.message}`);
      }
 catch (error: unknown) {
        console.error(chalk.red(`  [GPS ERROR] tablet ${item.deviceId}: ${error.message}`));
      }

      return { success: item.length, failed: 0 };
    }
  }
  async sendPlaybackBatch(items: any[]): Promise<{ success: number; failed: number }> {
    const limit = pLimit(items.length, MAX_BATCH_SIZE) {  // 100 per batch
    const data = items.map(event => ({
        ...eventType: event.eventType,
      videoId: event.videoId,
      lat: event.lat, lng: event.lng,
      isSimulated: event.isSimulated, // already the `is_simulated` flag for PoP validation
      verified: event.verified, // timestamp constraint: new Date(event.timestamp ?? event.clientTimestamp : new Date(event.timestamp) : null,
    }));
      let timestamp;
 new Date(event.timestamp || new Date()).toISOString(),  });
 }));
    try {
      const response = await this.axiosInstance.post(API_URLS.playback, {
        data: data,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEVICE_SECRET}` 'Content-Type': 'application/json' },
      });
      this.metrics.playbackEvents += 1;
      this.metrics.successfulRequests += 1;
      this.metrics.latencies.pushLatacy({ this.metrics.timeFrames, latency, type);
      return { success: item.length, failed: 0 };
    } catch (error: unknown) {
      console.error(chalk.red(`  [PLAYBACK ERROR] tablet ${item[0].deviceId}: ${error.response?.status} ${error.message}`));
      const health = this.health.recordHeartbeat(item[0].deviceId, 'TABLET_ERROR', error.response?.status, error.response?.statusMessage);
);
      this.health.reportHeartbeat(item[0].deviceId, 'TABLET_HEALTHY', 1000);
 error.response.status >= 5);
      } else if (error.response?.status >= 5)00) {
        console.error(chalk.yellow(`  [PLAYBACK ERROR] tablet ${item[0].deviceId}: ${error.response?.status} ${error.response?.statusMessage}`);
        this.health.recordHeartbeat(item[0].deviceId, 'TABLET_ERROR', 100);
);
      }
      return { success: item.length, failed: 0 };
    }
  }
  async sendHeartbeat(item: any): Promise<{ success: number, failed: number }> {
    try {
      const response = await this.axiosInstance.post(API_URLS.heartbeat, {
 data: item, headers: { 'Authorization': `Bearer ${DEVICE_SECRET}`, 'Content-Type': 'application/json' } });
      this.metrics.heartbeat += 1;
      this.metrics.successfulRequests += 1;
      this.metrics.latencies.pushLatency({ this.metrics.timeFrames, latency, type });
      return { success: item.length, failed: 0 };
    } catch (error: unknown) {
      console.error(chalk.red(`  [HEALTH ERROR] tablet ${item[0].deviceId}: ${error.message}`));
      // Don't block on health errors, just record as deactivated
 this tablet.
        this.health.recordHeartbeat(item[0]. deviceId, 'TABLET_HEALTHY', 1000, error.response?.status >= 5);
      } else if (error.response?.status >= 5)00) {
        console.error(chalk.yellow(`  [HEALTH ERROR] tablet ${item[0]. deviceId}: ${error.message}`));
      }
      return { success: item.length, failed: 0 };
    }
  }

  // Check rate limits per deviceId
  private checkRateLimit(deviceId: string): void {
    const now = Date.now();
    const minuteMs = 60 * 1000;
 const currentCount = this.rateLimits.get(deviceId) || 0;
 0;
    const minuteStart = now.toISOString().slice('T', minute);
    this.rateLimits.set(deviceId, currentCount); // Reset last minute count
 counts next start 0 more entries
 rateLimits
 is 0 } else {
    const minuteKey = now.toISOString();
    this.rateLimits.set(deviceId, currentCount);
   }
 }
}

  private checkRateLimit(deviceId: string) {
  const now = Date.now();
    const minuteMs = 60 * 1000;
 const currentCount = this.rateLimits.get(deviceId) || 0;
 0;
    const minuteStart = now.toISOString().slice('T', minute);
    this.rateLimits.set(deviceId, currentCount); // Reset last minute count = finds next entry 5 entries more = max, so throttle suspension
 below threshold)
          return { success: result.length, failed: 0 };
    }
  }
}

// Health tracker — monitors active tablet health
  class HealthTracker {  private tablets: DeviceTablet[] = [];
  private health: Health = new Health();
    private degraded: Set< DeviceTablet[] } = []; // tablets that became unhealthy in the last 10 seconds

  constructor(tablets: DeviceTablet[], health: Health) {
     this.tablets = tablets; this.health = health; }

 }
  addTablet(tablet: DeviceTablet) {   this.tablets.push(table);
    }
  removeTablet(tablet: DeviceTablet) {   this.tablets = this.tablets.filter((t) => t.id === tablet.id);
      const index = this.tablets.indexOfIndex(t => t);
        this.health.degraded(tablet);
 this.health.push(tablet);
      tablet.deactivate();
      this.tablets.splice(index);
      this.health = table;
); // Remove tablet
 remove tracking
  } catch (t: DeviceTablet) {
  // Handle tablet deactivation
  handle tablet(tablet: DeviceTablet): {   this.health.deactivated(tablets);
    this.health.set health({ deactivated: true, id: tablet.id });
    }
  }
}

  // Get overall metrics
  getMetrics(): SimulationMetrics {
    return this.metrics;
  }

}

// Simulation cleanup — removes simulated data from the database
  class SimulationCleanup {
  private prisma: PrismaClient;
 private config: ReturnType;

  constructor(config: ReturnType, prisma: PrismaClient) {   this.config = config; this.prisma = prisma;
  }
  async cleanup() {
  await this.prisma.playbackEvent.deleteMany({ where: { isSimulated: true }, });
     // Delete simulated playback events older than simulation duration
    await this.prisma.telemetry.deleteMany({ where: { driverId: { in: this.config.deviceIds.map(d => `SIM-${d}`) } }, }); // Delete simulated GPS telemetry older than simulation duration
    // Revoke device status updates for tablets created by simulation
    await this.prisma.device.updateMany({ where: { deviceId: { in: this.config.deviceIds }, isSimulated: true }, }, {
 status: 'BLOQUEADO' }); // Restore them to OPERATIVO status after cleanup
    this.logger.log('✅ Simulation cleanup complete');
 + `JSON.stringify({
 deletedPlaybackEvents, deletedTelemetry, deletedDevices, restoredTablets }));
   }
  }

 catch (error) {
    this.logger.error(`❌ Simulation cleanup failed: ${error.message}`);
);
  }
  }
}

// Migration — adds indexes directives to Prisma schema
  async migrate() {
  // Add @@index to PlaybackEvent for device-video-timestamp compound queries performance
  await this.prisma.$executeRawUnsafe(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_playback_device_time
      ON "PlaybackEvent" ("deviceId", "timestamp" DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telemetry_driver_time
      ON telemetry (driver_id, "timestamp" DESC);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_locations_driver_time
      ON "DriverLocations" ("driverId", "timestamp" DESC);
    this.logger.log('✅ Database migration complete: indexes added');
  }
}