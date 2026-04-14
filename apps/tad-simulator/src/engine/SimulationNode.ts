import { DriverModule, VirtualDriver } from './modules/drivers';
import { FinanceModule } from './modules/finance';
import { SubscriptionModule } from './modules/subscription';
import { SyncEngine } from './SyncEngine';

export class SimulationNode {
  private isRunning: boolean = false;
  private fleet: VirtualDriver[] = [];
  private interval: NodeJS.Timeout | null = null;
  private logs: string[] = [];

  constructor(private config: { 
    driverCount: number, 
    telemetryFreq: number, 
    errorRate: number 
  }) {
    this.sync = new SyncEngine();
  }

  private addLog(msg: string) {
    this.logs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (this.logs.length > 20) this.logs.pop();
  }

  public getState() {
    return {
      isRunning: this.isRunning,
      fleetSize: this.fleet.length,
      config: this.config,
      recentLogs: this.logs
    };
  }

  public updateConfig(newConfig: Partial<{ driverCount: number, telemetryFrequency: number, errorRate: number }>) {
    if (newConfig.driverCount) {
      this.config.driverCount = newConfig.driverCount;
      // If running, we might need to adjust fleet size dynamically
      if (this.isRunning) {
        if (this.config.driverCount > this.fleet.length) {
          const extra = Array.from({ length: this.config.driverCount - this.fleet.length }, () => DriverModule.generateProfile());
          this.fleet.push(...extra);
          this.addLog(`Fleet expanded by ${extra.length} units`);
        } else if (this.config.driverCount < this.fleet.length) {
          const removed = this.fleet.length - this.config.driverCount;
          this.fleet = this.fleet.slice(0, this.config.driverCount);
          this.addLog(`Fleet reduced by ${removed} units`);
        }
      }
    }
    if (newConfig.telemetryFrequency) {
      this.config.telemetryFreq = newConfig.telemetryFrequency;
      if (this.isRunning) {
        this.restartLoop();
      }
    }
    if (newConfig.errorRate !== undefined) {
      this.config.errorRate = newConfig.errorRate;
    }
    this.addLog('System configuration updated live');
  }

  private restartLoop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => {
      this.tick();
    }, this.config.telemetryFreq * 1000);
  }

  public getSyncEngine() {
    return this.sync;
  }

  start(newConfig?: { driverCount: number, activeCampaigns: number, errorRate: number, telemetryFrequency: number }) {
    if (newConfig) {
      this.config = {
        driverCount: newConfig.driverCount,
        telemetryFreq: newConfig.telemetryFrequency,
        errorRate: newConfig.errorRate
      };
    }

    if (this.isRunning) return;

    this.isRunning = true;
    this.logs = [];
    this.addLog('Simulation sequence INITIALIZING...');
    console.log(`[Engine] Initializing simulation with ${this.config.driverCount} drivers...`);
    
    // 1. Generate virtual fleet
    this.fleet = Array.from({ length: this.config.driverCount }, () => DriverModule.generateProfile());

    // 2. Start simulation loop
    this.restartLoop();

    this.addLog('Simulation sequence ACTIVE');
    console.log('[Engine] Simulation sequence ACTIVE');
  }

  private async tick() {
    if (!this.isRunning) return;

    for (const driver of this.fleet) {
      // Check Subscription (Debtor Mode)
      if (SubscriptionModule.shouldTriggerDebtorMode(this.config.errorRate)) {
        console.warn(`[Engine] Driver ${driver.vehicleId} simulation of HTTP 402 interruption.`);
        continue;
      }

      // 1. Generate & Send GPS Batch
      const gpsBatch = DriverModule.generateGpsBatch();
      const gpsStatus = await this.sync.sendGpsBatch(driver, gpsBatch);
      
      // 2. Generate & Send Financial event (Strictly RD$500)
      const playback = FinanceModule.generatePlaybackEvent(driver.vehicleId, 'CAMP-001', 'AD-001');
      const finStatus = await this.sync.sendPlaybackBatch([playback]);

      // 3. Subscription handling from API response
      const subAction = SubscriptionModule.handleApiResponse(gpsStatus === 402 ? 402 : finStatus);
      if (subAction.stopActivity) {
         console.error(`[Engine] ${driver.vehicleId} HALTED: ${subAction.message}`);
         continue;
      }

      console.log(`[Sync] ${driver.vehicleId}: GPS ${gpsStatus} | Finance ${finStatus} (RD$${playback.revenue})`);
      if (gpsStatus === 200 || gpsStatus === 201) {
        this.addLog(`Driver ${driver.vehicleId}: GPS Sync SUCCESS`);
      }
      if (finStatus === 200 || finStatus === 201) {
        this.addLog(`Campaign ${playback.campaignId}: RD$500 Injected`);
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    console.log('[Engine] Simulation sequence HALTED');
  }
}
