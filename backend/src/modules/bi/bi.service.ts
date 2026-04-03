import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BiKpiResponse, TaxiDrillDownResponse, SemaphoreColor } from './interfaces/bi-kpi.interface';

@Injectable()
export class BiService {
  private readonly logger = new Logger(BiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * KPI MASTER - Consolidates all dashboard KPIs
   * In a real Phase 2 implementation, this should read from BiDashboardSnapshot
   * but we also include a real-time fallback logic.
   */
  async getMasterKpis(): Promise<BiKpiResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to get today's snapshot with error resilience
    let snapshot = null;
    try {
      snapshot = await this.prisma.biDashboardSnapshot.findUnique({
        where: { snapshotDate: today }
      });
    } catch (e) {
      this.logger.warn(`⚠️ BI Snapshot table missing or error (fallback to real-time): ${e.message}`);
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
        lastUpdate: snapshot.generatedAt
      };
    }

    // Fresh calculation if no snapshot exists or table missing
    this.logger.log('📊 Generating fresh BI metrics (Real-time calculation)...');
    
    // Calculate impressions from PlaybackEvent (MTD)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    try {
      const [devicesCount, onlineCount, activeCampaigns, impressions] = await Promise.all([
        this.prisma.device.count(),
        this.prisma.device.count({ where: { isOnline: true } }),
        this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        this.prisma.playbackEvent.count({
          where: {
            timestamp: { gte: monthStart },
            eventType: 'play_confirm'
          }
        })
      ]);

      const activeSubscribers = await this.prisma.driver.count({
        where: { subscriptionPaid: true }
      });
      
      const mrr = activeSubscribers * 6000; // Simplified logic v1

      // Try to persist the snapshot if possible
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
            deliveryRateAvg: 100,
            syncHealthRate: 100,
            generatedAt: new Date()
          }
        });
      } catch (saveError) {
        this.logger.error(`❌ Could not save BI snapshot: ${saveError.message}`);
      }

      return {
        mrr,
        activeSubscribers,
        totalDevices: devicesCount,
        onlineDevices: onlineCount,
        offlineDevices: devicesCount - onlineCount,
        criticalDevices: 0,
        activeCampaigns,
        totalImpressionsMtd: impressions,
        deliveryRateAvg: 100,
        syncHealthRate: 100,
        lastUpdate: new Date()
      };
    } catch (realtimeError) {
      this.logger.error(`🚨 Fatal error in BI metrics calculation: ${realtimeError.message}`);
      throw new HttpException('Error al calcular métricas de BI', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * TAXI DRILL-DOWN - 360 view of a taxi health and financials
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

    if (!device) {
      throw new NotFoundException(`Taxi ${deviceId} no encontrado.`);
    }

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
   * GENERATE RECONCILIATION REPORT - Audit subscriptions vs playbacks
   */
  async generateReconciliationReport(period: string) {
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd   = new Date(year, month, 0, 23, 59, 59);

    const drivers = await this.prisma.driver.findMany({
      include: {
        devices: true,
        subscriptions: {
          where: { startDate: { lte: periodEnd }, dueDate: { gte: periodStart } }
        },
        payrollPayments: { where: { month, year } }
      }
    });

    const results = await Promise.all(drivers.map(async (driver) => {
      const device       = driver.devices[0];
      const subscription = driver.subscriptions[0];

      // Impressions delivered in the period
      const deliveredImpressions = device
        ? await this.prisma.playbackEvent.count({
            where: {
              deviceId: device.deviceId,
              eventType: 'play_confirm',
              timestamp: { gte: periodStart, lte: periodEnd }
            }
          })
        : 0;

      // Revenue RECEIVED in the period
      const revenueAgg = await this.prisma.financialTransaction.aggregate({
        where: {
          type: 'INCOMING', status: 'COMPLETED', category: 'PUBLICIDAD',
          createdAt: { gte: periodStart, lte: periodEnd }
        },
        _sum: { amount: true }
      });

      const payrollDue  = driver.payrollPayments.reduce((a, p) => a + p.amount, 0);
      const payrollPaid = driver.payrollPayments
        .filter(p => p.status === 'PAID')
        .reduce((a, p) => a + p.amount, 0);

      // Placeholder for active campaigns per driver logic
      const activeCampaigns   = 1; 
      const revenueContracted = activeCampaigns * 1500;
      const revenueReceived   = revenueAgg._sum?.amount ?? 0;
      const discrepancyAmount = revenueContracted - revenueReceived;

      // Evaluation of discrepancy
      let discrepancyType = 'OK';
      let hasDiscrepancy  = false;

      if (subscription?.status !== 'ACTIVE') {
        discrepancyType = 'UNPAID_SUBSCRIPTION';
        hasDiscrepancy = true;
      } else if (discrepancyAmount > 0) {
        discrepancyType = 'MISSING_PAYMENT';
        hasDiscrepancy = true;
      } else if (payrollDue > payrollPaid) {
        discrepancyType = 'PAYROLL_PENDING';
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
          activeCampaigns, 
          revenueContracted, 
          revenueReceived,
          payrollDue, 
          payrollPaid,
          hasDiscrepancy, 
          discrepancyType, 
          discrepancyAmount
        },
        update: {
          subscriptionStatus: subscription?.status || 'MISSING',
          subscriptionDueDate: subscription?.dueDate,
          subscriptionAmount: subscription?.amount || 0,
          totalPlaybacks: deliveredImpressions,
          activeCampaigns,
          revenueContracted,
          revenueReceived,
          payrollDue,
          payrollPaid,
          hasDiscrepancy,
          discrepancyType,
          discrepancyAmount
        }
      });
    }));

    return {
      period,
      totalRecords: results.length,
      discrepancies: results.filter(r => r.hasDiscrepancy).length
    };
  }

  /**
   * GET FLEET HEALTH - Returns current health status of all devices
   */
  async getFleetHealth() {
    const devices = await this.prisma.device.findMany({
      include: {
        driver: {
          select: {
            fullName: true,
            subscriptionPaid: true,
            subscriptionEnd: true
          }
        }
      }
    });

    return devices.map(d => {
      const hoursOffline = d.lastHeartbeat
        ? (Date.now() - d.lastHeartbeat.getTime()) / 3600000 : 999;
      
      const connectivityStatus: SemaphoreColor = 
        hoursOffline < 0.083 ? 'GREEN' : hoursOffline < 24 ? 'YELLOW' : 'RED';
      
      const batteryLevel = d.batteryLevel ?? 0;
      const batteryStatus: SemaphoreColor = 
        batteryLevel >= 40 ? 'GREEN' : batteryLevel >= 15 ? 'YELLOW' : 'RED';

      return {
        id: d.id,
        deviceId: d.deviceId,
        taxiNumber: d.taxiNumber,
        city: d.city,
        isOnline: d.isOnline,
        batteryLevel,
        batteryStatus,
        connectivityStatus,
        hoursOffline,
        driverName: d.driver?.fullName,
        subscriptionPaid: d.driver?.subscriptionPaid
      };
    });
  }
}
