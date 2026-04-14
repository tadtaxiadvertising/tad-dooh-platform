
import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { PrismaClient as SimulatorPrisma } from '../generated/client';
import { PrismaClient as AppPrisma } from '@prisma/client';

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
            const vehicleId = `SIM_DEV_${paddedId}`;
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
            const points = Array.from({ length: 10 }, (_, i) => ({
                lat: 19.4517 + (Math.random() - 0.5) * 0.01,
                lng: -70.6970 + (Math.random() - 0.5) * 0.01,
                speed: Math.floor(Math.random() * 60),
                timestamp: new Date(Date.now() - (10 - i) * 5000).toISOString(),
                isSimulated: true
            }));
            
            const apiUrl = this.getResolvedApiUrl();
            // In a real SRE env, we would fetch a real JWT here using a service account
            const authToken = "eyJhY2Nlc3NfdG9rZW4iOiJzaW11bGF0ZWQtY29uZHVjdG9yLXRva2VuIn0="; 
            
            const sr = await fetch(`${apiUrl}/device/bulk-sync`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${authToken}`,
                    'x-simulation-id': 'TAD-SIM-AUTO-2026'
                },
                body: JSON.stringify({ 
                    device_id: vehicleId, 
                    driverId, 
                    locations: points,
                    isSimulated: true,
                    battery_level: 98,
                    storage_free: "10GB"
                })
            }).catch(() => ({ status: 500 }));
            
            if (Math.random() > 0.8) { 
                await fetch(`${apiUrl}/device/playback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ 
                        device_id: vehicleId, 
                        video_id: 'campaign_sim_test', 
                        timestamp: new Date().toISOString(), 
                        revenue: 500, 
                        isSimulated: true 
                    })
                }).catch(() => ({ status: 500 }));
            }
        } catch (e) {}
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
            const deviceId = `SIM_DEV_${paddedId}`;
            
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
                        update: { status: 'ACTIVE', isSimulated: true },
                        create: {
                            deviceId: deviceId,
                            name: `ST-SIM-${paddedId}`,
                            status: 'ACTIVE',
                            isOnline: true,
                            isSimulated: true,
                            driverId: driverId
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
        console.error('[Engine] Failed to refresh MV:', e.message);
        return false; 
    }
  }
}
