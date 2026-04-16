
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { PrismaClient as SimulatorPrisma } from '../generated/client';
import { PrismaClient as AppPrisma } from '@prisma/client';
import { DriverModule } from './modules/drivers';
import { FinanceModule } from './modules/finance';

export class SimulationEngine {
  private workers: Map<string, Worker> = new Map();
  private localPrisma = new SimulatorPrisma();
  private appPrisma = new AppPrisma();
  private activeDrivers: Set<NodeJS.Timeout> = new Set();
  
  private config = {
    driverCount: 150,
    apiUrl: process.env.TAD_API_URL || 'http://localhost:3000/api/v1',
    jwtSecret: process.env.JWT_SECRET || 'tad-default-secret-2026',
    tickInterval: 15000 
  };

  private getResolvedApiUrl() {
    if (this.config.apiUrl.includes('proyecto_ia.ibusiness.com.do')) {
        console.warn(`[Engine] Detected unresolvable domain. Falling back to internal networking.`);
        return 'http://localhost:3000/api/v1';
    }
    return this.config.apiUrl;
  }

  get currentConfig() { return this.config; }
  get isRunning() { return this.activeDrivers.size > 0; }

  async start() {
    console.log(`[Engine] Starting TAD Simulator Engine (${this.config.driverCount} drivers, SRE-Grade Isolation)...`);
    try {
        await this.stop();
        await this.provisionBasics();

        for (let i = 1; i <= this.config.driverCount; i++) {
            const paddedId = String(i).padStart(4, '0');
            const driverId = `SIM_DRV_${paddedId}`;
            const vehicleId = `STI-${paddedId}`; // Using the expected STI prefix
            this.scheduleDriverLoop(driverId, vehicleId);
        }
    } catch (error: any) {
        console.error('[Engine] FATAL STARTUP ERROR:', error.message);
        throw error;
    }
    console.log(`[Engine] Simulation engine active using Node.js I/O Event Loop!`);
  }

  async stop() {
    console.log('[Engine] Stopping all active loops...');
    for (const interval of this.activeDrivers) { 
        clearInterval(interval); 
    }
    this.activeDrivers.clear();
    for (const worker of this.workers.values()) { worker.terminate(); }
    this.workers.clear();
  }

  private scheduleDriverLoop(driverId: string, vehicleId: string) {
    const loop = async () => {
        try {
            // Determine base city (Expert: Switch between STO and STI)
            const isSTI = Math.random() > 0.4;
            const ref = isSTI ? DriverModule.getSantiagoRef() : DriverModule.getSantoDomingoRef();
            
            const points = DriverModule.generateGpsBatch(ref.lat, ref.lng).map(p => ({
                lat: p.latitude,
                lng: p.longitude,
                speed: p.speed,
                timestamp: p.timestamp,
                isSimulated: true
            }));
            // Expert Level: Direct Prisma Injection for Guaranteed Map Visibility
            const latestPoint = points[points.length - 1];

            // 1. Update Device state (for Admin Map real-time tracking)
            await this.appPrisma.device.updateMany({
                where: { deviceId: vehicleId },
                data: {
                    lastLat: latestPoint.lat,
                    lastLng: latestPoint.lng,
                    batteryLevel: 98,
                    isOnline: true,
                    lastSeen: new Date(),
                    lastHeartbeat: new Date(),
                    lastSync: new Date(),
                    storageFree: "10GB"
                }
            });

            // 2. Insert Historical locations
            const locationInserts = points.map(p => ({
                driverId,
                deviceId: vehicleId,
                latitude: p.lat,
                longitude: p.lng,
                speed: p.speed,
                timestamp: new Date(p.timestamp),
                isSimulated: true
            }));

            await this.appPrisma.driverLocation.createMany({
                data: locationInserts,
                skipDuplicates: true
            });
            
            // 3. Simulate Playback Events
            if (Math.random() > 0.8) { 
                await this.appPrisma.playbackEvent.create({
                    data: {
                        deviceId: vehicleId,
                        eventType: 'PLAY',
                        videoId: 'campaign_sim_test',
                        timestamp: new Date(),
                        isSimulated: true
                    }
                });
                
                await this.appPrisma.analyticsEvent.create({
                    data: {
                        deviceId: vehicleId,
                        eventType: 'AD_PLAYED',
                        campaignId: 'simulated_campaign_id',
                        lat: latestPoint.lat,
                        lng: latestPoint.lng,
                        isSimulated: true,
                        processed: true,
                        occurredAt: new Date(),
                        receivedAt: new Date()
                    }
                });
            }
        } catch (e) {
            console.error(`[Simulator Engine] Loop error for ${driverId}:`, e);
        }
    };

    loop();
    const interval = setInterval(loop, this.config.tickInterval + (Math.random() * 5000));
    this.activeDrivers.add(interval);
  }

  private async provisionBasics() {
    console.log(`[Engine] Provisioning ${this.config.driverCount} drivers/devices (SRE Isolation)...`);
    const batchSize = 10;
    for (let i = 1; i <= this.config.driverCount; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) <= this.config.driverCount; j++) {
            const currentId = i + j;
            const paddedId = String(currentId).padStart(4, '0');
            const driverId = `SIM_DRV_${paddedId}`;
            const deviceId = `STI-${paddedId}`;
            
            batch.push((async () => {
                try {
                    // Create Sim Driver
                    await this.appPrisma.driver.upsert({
                        where: { id: driverId },
                        update: { status: 'ACTIVE', isSimulated: true },
                        create: {
                            id: driverId,
                            fullName: `Virtual Pilot ${paddedId}`,
                            phone: `1999${paddedId}`,
                            status: 'ACTIVE',
                            subscriptionPaid: true,
                            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            onboardingStatus: 'COMPLETED',
                            isSimulated: true
                        }
                    });

                    // Create Sim Device
                    await this.appPrisma.device.upsert({
                        where: { deviceId: deviceId },
                        update: { status: 'ACTIVE', isSimulated: true, taxiNumber: `TX-${paddedId}` },
                        create: {
                            deviceId: deviceId,
                            name: `TAD-SIM-${paddedId}`,
                            status: 'ACTIVE',
                            isOnline: true,
                            isSimulated: true,
                            driverId: driverId,
                            taxiNumber: `TX-${paddedId}`,
                            city: paddedId.startsWith('00') ? 'Santiago' : 'Santo Domingo'
                        }
                    });

                    // Create Sim Subscription
                    await this.appPrisma.subscription.upsert({
                        where: { id: `SIM_SUB_${paddedId}` },
                        update: { status: 'ACTIVE', isSimulated: true, validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                        create: {
                            id: `SIM_SUB_${paddedId}`,
                            driverId: driverId,
                            deviceId: deviceId,
                            plan: 'SIMULATED_PRO',
                            status: 'ACTIVE',
                            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                            isSimulated: true
                        }
                    });
                } catch (e) {
                    console.error(`[Provision] Error for ${driverId}:`, e);
                }
            })());
        }
        await Promise.all(batch);
    }
  }

  getMetrics() {
    const mem = process.memoryUsage();
    return {
      ram: Math.round(mem.rss / 1024 / 1024), 
      totalDrivers: this.activeDrivers.size,
      timestamp: new Date().toISOString(),
      cpu: Math.round(Math.random() * 50 + 10), // Mock CPU activity
      activeThreads: this.activeDrivers.size,
      heap: Math.round(mem.heapUsed / 1024 / 1024)
    };
  }

  updateConfig(newConfig: Partial<typeof this.config>) {
    this.config = { ...this.config, ...newConfig };
  }
  
  async refreshMaterializedViews() {
    try {
        await this.appPrisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fleet_health');
        return true;
    } catch (e: any) { 
        if (e.message.includes('does not exist')) {
            console.warn('[Engine] ⚠️ Materialized view "mv_fleet_health" is missing. Skipping refresh for now. Please ensure UI backend migrations are up to date.');
        } else {
            console.error('[Engine] Failed to refresh MV:', e.message);
        }
        return false; 
    }
  }
}
