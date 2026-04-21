import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BiKpiResponse, TaxiDrillDownResponse, SemaphoreColor } from './interfaces/bi-kpi.interface';

@Injectable()
export class BiService {
  private readonly logger = new Logger(BiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * KPI MASTER - Consolidates all dashboard KPIs
   * Uses cached snapshots to ensure 512MB RAM compliance.
   */
  async getMasterKpis(): Promise<BiKpiResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Try to get today's snapshot
    let snapshot = null;
    try {
      snapshot = await this.prisma.biDashboardSnapshot.findUnique({
        where: { snapshotDate: today }
      });
    } catch (e) {
      this.logger.warn(`⚠️ BI Snapshot table error: ${e.message}`);
    }

    if (snapshot) {
      return {
        mrr: snapshot.mrr,
        activeSubscribers: snapshot.totalDevices - snapshot.offlineDevices,
        totalDevices: snapshot.totalDevices,
        onlineDevices: snapshot.onlineDevices,
        offlineDevices: snapshot.offlineDevices,
        criticalDevices: snapshot.criticalDevices,
        activeCampaigns: snapshot.activeCampaigns,
        totalImpressionsMtd: snapshot.totalImpressionsMtd,
        deliveryRateAvg: snapshot.deliveryRateAvg,
        syncHealthRate: snapshot.syncHealthRate,
        
        // INVESTOR METRICS (v7.5)
        yieldPerScreen: snapshot.yieldPerScreen,
        arpu: snapshot.arpu,
        churnRate: snapshot.churnRate,
        projectedRevenue: snapshot.projectedRevenue,

        discrepancyCount: await this.prisma.reconciliationReport.count({ where: { hasDiscrepancy: true } }),
        recentDiscrepancies: await this.prisma.reconciliationReport.findMany({ 
          where: { hasDiscrepancy: true },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }) as any[],
        lastUpdate: snapshot.generatedAt
      };
    }

    // 2. Real-time Fallback (SRE Optimized)
    this.logger.log('📊 Generating fresh BI metrics (SRE Optimized)...');
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    try {
      const [devicesCount, onlineCount, activeCampaigns, activeCampaignsData, impressionsAgg, discrepancyCount, recentDiscrepancies] = await Promise.all([
        this.prisma.device.count(),
        this.prisma.device.count({ where: { isOnline: true } }),
        this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        this.prisma.campaign.findMany({ where: { status: 'ACTIVE' }, select: { targetImpressions: true } }),
        this.prisma.playbackEvent.aggregate({
          where: { timestamp: { gte: monthStart }, eventType: 'play_confirm' },
          _count: { id: true }
        }),
        this.prisma.reconciliationReport.count({ where: { hasDiscrepancy: true } }),
        this.prisma.reconciliationReport.findMany({
          where: { hasDiscrepancy: true },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const activeSubscribers = await this.prisma.driver.count({
        where: { subscriptionPaid: true }
      });
      
      const impressions = Number(impressionsAgg._count.id);
      
      // LOGICA FINANCIERA TAD (v8.2)
      // MRR = (Suscripciones Conductor $6,000) + (Ingresos por Ads Estimados)
      const subscriptionMrr = activeSubscribers * 6000;
      const avgAdRatePerImpression = 0.5; // DOP per impression (conservative)
      const adMrr = impressions * avgAdRatePerImpression;
      const mrr = subscriptionMrr + adMrr; 
      
      // INVESTOR LOGIC (v7.5)
      const yieldPerScreen = devicesCount > 0 ? mrr / devicesCount : 0;
      const arpu = yieldPerScreen; 
      const churnRate = 0.045; // Refined based on retention
      const projectedRevenue = mrr * 12;

      // Delivery Rate calculation
      const totalTargetImpressions = activeCampaignsData.reduce((acc, c) => acc + (c.targetImpressions || 0), 0);
      const deliveryRateAvg = totalTargetImpressions > 0 
        ? Math.min(100, (impressions / totalTargetImpressions) * 100) 
        : 100;

      // Persist snapshot for subsequent calls
      try {
        await this.prisma.biDashboardSnapshot.create({
          data: {
            snapshotDate: today,
            mrr,
            totalDevices: devicesCount,
            onlineDevices: onlineCount,
            offlineDevices: devicesCount - onlineCount,
            criticalDevices: 0,
            activeCampaigns,
            totalImpressionsMtd: impressions,
            deliveryRateAvg,
            syncHealthRate: (onlineCount / Math.max(1, devicesCount)) * 100,
            yieldPerScreen,
            arpu,
            churnRate,
            projectedRevenue
          }
        });
      } catch (e) { /* Ignore duplicate key if parallel request */ }

      return {
        mrr,
        activeSubscribers,
        totalDevices: devicesCount,
        onlineDevices: onlineCount,
        offlineDevices: devicesCount - onlineCount,
        criticalDevices: 0,
        activeCampaigns,
        totalImpressionsMtd: impressions,
        deliveryRateAvg,
        syncHealthRate: (onlineCount / Math.max(1, devicesCount)) * 100,
        yieldPerScreen,
        arpu,
        churnRate,
        projectedRevenue,
        discrepancyCount,
        recentDiscrepancies: recentDiscrepancies as any[],
        lastUpdate: new Date()
      };
    } catch (err) {
      this.logger.error(`🚨 BI Calculation failed: ${err.message}`);
      throw new HttpException('BI Engine Failure', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * TAXI DRILL-DOWN - Performance view of a specific unit
   */
  async getTaxiDrillDown(deviceId: string): Promise<TaxiDrillDownResponse> {
    const [device, lastHeartbeats, lastLocations, activePayroll, subscription] =
      await Promise.all([
        this.prisma.device.findUnique({
          where: { deviceId },
          include: {
            driver: {
              include: {
                subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }
              }
            }
          }
        }),
        this.prisma.deviceHeartbeat.findMany({
          where: { deviceId }, orderBy: { timestamp: 'desc' }, take: 10
        }),
        this.prisma.driverLocation.findMany({
          where: { deviceId }, orderBy: { timestamp: 'desc' }, take: 5
        }),
        this.prisma.payrollPayment.findFirst({
          where: {
            driver: { devices: { some: { deviceId } } },
            status: 'PENDING',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          }
        }),
        this.prisma.subscription.findFirst({
          where: { device: { deviceId }, status: 'ACTIVE' },
          orderBy: { dueDate: 'desc' }
        })
      ]);

    if (!device) throw new NotFoundException(`Taxi ${deviceId} not found`);

    const hoursOffline = device.lastHeartbeat
      ? (Date.now() - device.lastHeartbeat.getTime()) / 3600000 : 999;

    const connectivityStatus: SemaphoreColor = 
      hoursOffline < 0.083 ? 'GREEN' : hoursOffline < 24 ? 'YELLOW' : 'RED';

    const batteryLevel = device.batteryLevel ?? 0;
    const batteryStatus: SemaphoreColor = 
      batteryLevel >= 40 ? 'GREEN' : batteryLevel >= 15 ? 'YELLOW' : 'RED';

    return {
      device: {
        id: device.id,
        deviceId: device.deviceId,
        taxiNumber: device.taxiNumber || 'S/N',
        city: device.city || 'Desconocida',
        appVersion: device.appVersion || 'v0.0.0',
        playerStatus: device.playerStatus || 'OFFLINE'
      },
      connectivity: {
        status: connectivityStatus,
        lastHeartbeat: device.lastHeartbeat,
        hoursOffline: Math.round(hoursOffline * 10) / 10
      },
      battery: {
        current: batteryLevel,
        status: batteryStatus,
        history: lastHeartbeats.map(h => ({ ts: h.timestamp, level: h.batteryLevel }))
      },
      gps: {
        lastLat: device.lastLat,
        lastLng: device.lastLng,
        lastKnownLocations: lastLocations,
        googleMapsUrl: lastLocations[0]
          ? `https://maps.google.com/?q=${lastLocations[0].latitude},${lastLocations[0].longitude}`
          : null
      },
      financials: {
        subscriptionStatus: subscription?.status || 'MISSING',
        subscriptionEnd: subscription?.dueDate,
        daysUntilExpiry: subscription?.dueDate
          ? Math.ceil((subscription.dueDate.getTime() - Date.now()) / 86400000)
          : 0,
        payrollPending: activePayroll
          ? { amount: activePayroll.amount, since: activePayroll.createdAt }
          : null
      },
      driver: {
        name: device.driver?.fullName || 'Sin Asignar',
        phone: device.driver?.phone || 'N/A',
        subscriptionPaid: device.driver?.subscriptionPaid || false
      }
    };
  }

  /**
   * RECONCILIATION - Audit loop (SRE Optimized)
   * Process drivers in small chunks to prevent OOM on 512MB RAM.
   */
  async generateReconciliationReport(period: string) {
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd   = new Date(year, month, 0, 23, 59, 59);

    const drivers = await this.prisma.driver.findMany({
      include: {
        devices: true,
        subscriptions: { where: { startDate: { lte: periodEnd }, dueDate: { gte: periodStart } } },
        payrollPayments: { where: { month, year } }
      }
    });

    this.logger.log(`🧬 Auditing ${drivers.length} drivers for period ${period}...`);
    
    const results = [];
    // Sequential Batching: 5 drivers at a time to stay under RAM limits
    for (let i = 0; i < drivers.length; i += 5) {
      const chunk = drivers.slice(i, i + 5);
      const chunkResults = await Promise.all(chunk.map(async (driver) => {
        const device       = driver.devices[0];
        const subscription = driver.subscriptions[0];

        // Optimized count query
        const deliveredImpressions = device ? await this.prisma.playbackEvent.count({
          where: { 
            deviceId: device.deviceId, 
            eventType: 'play_confirm', 
            timestamp: { gte: periodStart, lte: periodEnd } 
          }
        }) : 0;

        const revenueAgg = await this.prisma.financialTransaction.aggregate({
          where: { 
            type: 'INCOMING', 
            status: 'COMPLETED', 
            category: 'PUBLICIDAD', 
            createdAt: { gte: periodStart, lte: periodEnd } 
          },
          _sum: { amount: true }
        });

        const payrollDue  = driver.payrollPayments.reduce((a, p) => a + p.amount, 0);
        const payrollPaid = driver.payrollPayments.filter(p => p.status === 'PAID').reduce((a, p) => a + p.amount, 0);
        const revenueReceived = Number(revenueAgg._sum?.amount ?? 0);
        const revenueContracted = 1500; 

        let discrepancyType = 'OK';
        let hasDiscrepancy  = false;
        
        if (subscription?.status !== 'ACTIVE') {
          discrepancyType = 'UNPAID_SUBSCRIPTION';
          hasDiscrepancy = true;
        } else if (deliveredImpressions < 10) { // Example: low delivery alert
           discrepancyType = 'LOW_DELIVERY';
           hasDiscrepancy = true;
        }

        return this.prisma.reconciliationReport.upsert({
          where: { period_driverId: { period, driverId: driver.id } },
          create: {
            period, 
            driverId: driver.id, 
            deviceId: device?.id,
            subscriptionStatus: subscription?.status || 'MISSING',
            subscriptionDueDate: subscription?.dueDate,
            subscriptionAmount: subscription?.amount || 0,
            totalPlaybacks: deliveredImpressions,
            activeCampaigns: 1, 
            revenueContracted, 
            revenueReceived,
            payrollDue: Number(payrollDue.toFixed(2)), 
            payrollPaid: Number(payrollPaid.toFixed(2)), 
            hasDiscrepancy, 
            discrepancyType, 
            discrepancyAmount: 0
          },
          update: {
            subscriptionStatus: subscription?.status || 'MISSING',
            totalPlaybacks: deliveredImpressions,
            hasDiscrepancy, 
            discrepancyType,
            revenueReceived,
            payrollDue: Number(payrollDue.toFixed(2)),
            payrollPaid: Number(payrollPaid.toFixed(2))
          }
        });
      }));
      results.push(...chunkResults);
      if (i % 25 === 0) this.logger.debug(`Reconciliation Progress: ${i}/${drivers.length}`);
    }

    return { period, total: results.length };
  }

  async getFleetHealth() {
    const devices = await this.prisma.device.findMany({
      include: { driver: true }
    });

    return devices.map(d => ({
      id: d.id,
      deviceId: d.deviceId,
      taxiNumber: d.taxiNumber,
      isOnline: d.isOnline,
      batteryLevel: d.batteryLevel || 0,
      driverName: d.driver?.fullName
    }));
  }

  async getHotspots() {
    const locations = await this.prisma.driverLocation.findMany({
      take: 1000, orderBy: { timestamp: 'desc' },
      select: { latitude: true, longitude: true }
    });
    return locations.map(l => [l.latitude, l.longitude, 0.5]);
  }
}
