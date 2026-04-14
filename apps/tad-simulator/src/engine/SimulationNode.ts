import { DriverModule, VirtualDriver } from './modules/drivers';
import { FinanceModule } from './modules/finance';
import { SubscriptionModule } from './modules/subscription';
import { SyncEngine } from './SyncEngine';

export class SimulationNode {
  private isRunning: boolean = false;
  private fleet: VirtualDriver[] = [];
  private interval: NodeJS.Timeout | null = null;
  private sync: SyncEngine;

  constructor(private config: { 
    driverCount: number, 
    telemetryFreq: number, 
    errorRate: number 
  }) {
    this.sync = new SyncEngine();
  }

  start() {
    this.isRunning = true;
    console.log(`[Engine] Initializing simulation with ${this.config.driverCount} drivers...`);
    
    // 1. Generate virtual fleet
    this.fleet = Array.from({ length: this.config.driverCount }, () => DriverModule.generateProfile());

    // 2. Start simulation loop
    this.interval = setInterval(() => {
      this.tick();
    }, this.config.telemetryFreq * 1000);

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
    }
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearInterval(this.interval);
    console.log('[Engine] Simulation sequence HALTED');
  }
}
