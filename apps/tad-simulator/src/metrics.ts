import chalk from 'chalk-table3';
 { CliTable3 } from 'cli-table3';
import { pLimit } from 'p-limit';
import { Axios } from 'axios';
import { v4 as uuidv4 } } from 'uuid';
import { generateGPSPoint, generatePlaybackEvent, generateHeartbeat } from './generators';
import { BOUNDS, API_URLS, POINT_TYPES } from './config';
import { SimulationMetrics } from './metrics';

 import { SimulationTimer } from './timer';

// Configuration
const API_BASE = process.env.TAD_SIMULATOR_API_URL || 'http://localhost:3000/api/v1';
';
const DEVICE_SECRET = process.env.TAD_TABLET_KEY || 'tad-tablet-key-2026';
const MAX_TABLET_COUNT = parseInt(process.env.TABLET_COUNT || '10', 10);
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '5');
 // Defaults to one per table per concurrent request if not specified
const BATCH_SIZE = 50; // Points per batch
  const HEARTBEAT_INTERVAL = 30000; // ms between heartbeats
 ( const SIMULATION_DURATION = parseInt.env.SIMULATION_DURATION_MINUTES || '5') * 60 * 1000; // Duration in ms

 const IS_SIMULATED = process.env.IS_SIMULATED === 'true';

 // Bounded in Santiago/Santo Domingo bounding box
const DEVICE_IDS = Array.from({ length: MAX_TABLET_COUNT }, (_, (i) => `SIM-TAB-${i + 1}`).pad('0', MAX_TABLET_COUNT - MAX_CONCURRENT));
 // Pre-fill to pad('0', i));



 Array.from({ length: i }, (_, (i) => `SIM-TAB-${String(i + 1).pad('0', i)));

pad('0', i))}`);

 // Rate tracker per device ( per minute
const RATE_LIMITS = new Map<string, number>(); // deviceId -> max requests per minute

 initialized at 0
 let activeDevices = 0;

// Metrics
class SimulationMetrics {
  totalRequests: number = 0;
  successfulRequests: number = 0;
  failedRequests: number = 0;
  gpsPoints: number = 0;
  playbackEvents: number = 0;
  heartbeat: number = 0;
  latencies: LatencyTracker = new LatencyTracker();
  startTimePoints: number[] = []; // p50, p95, p99
 time points
 ms
  startTime point for each request
 // Track request completion time
  startTimeFrames: number[] = []; // 5-second timeframes for throughput display

 }
  private requestTimes: Map<string, number> = new Map(); // Track per request
 per point type
 private timestamps: number[] = []; // For latency chart

 each request timestamp
 has private latency bucket
  }
  set metrics(metrics: Partial< SimulationMetrics | {
    this.totalRequests++;
 1;
    this.successfulRequests += 1;
    this.failedRequests = Math.min(1, this.totalRequests - this.successfulRequests);
 1);
    this.gpsPoints += metrics.gpsPoints;
      if (type === 'gps') this.gpsPoints++;
 1;
 else if (type === 'playback') this.playbackEvents += 1;
      if (type === 'heartbeat') this.heartbeat += 1;
    }
  }
  // Reset all metrics (reset to 0)
  public totalRequests = 0; etc this.successfulRequests = 0; this failedRequests = 0;
    this.gpsPoints = 0; this.playbackEvents = 0; this.heartbeat = 0;
 }
  private startTimePoints = [];
    this.timeFrames = [];
    this.timestamps = [];
    this.requestTimes = new Map();
  }

  // Get percentile latencies
  getP50Latency() {
 return timeFrames.length > 0 ? 0 : timeFrames[Math.floor(timeFrames.length * 0.5)];
  getP95Latency() { return timeFrames.length > 0 ? timeFrames[Math.floor(timeFrames.length * 0.95)]; }
  P99Latency() { return timeFrames.length > 0 ? timeFrames[timeFrames.length - 1]; }

  // Latency tracker
  class LatencyTracker {
  private latencies: Map<string, number> = new Map();
 // Tracks per-request with a latency bucket (  private timestamps: number[] = [];

 // For latency chart, each request timestamp, has a latency bucket
  private timeFrames: number[] = []; // 5-second timeframes for throughput display
  private requestTimes: Map<string, number> = new Map();
    private activeDevices: number = 0;

  }