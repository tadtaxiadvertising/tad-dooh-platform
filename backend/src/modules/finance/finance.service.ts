import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly PAY_PER_ACTIVE_TAXI = 500; // RD$500 per month

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a billing report for all campaigns with real impression counts.
   */
  async getCampaignBillingReport() {
    this.logger.log('Generating real-data campaign billing report');

    const campaigns = await this.prisma.campaign.findMany({
      include: {
        media: { select: { id: true } },
        _count: {
          select: { devices: true }
        }
      }
    });

    const reports = await Promise.all(
      campaigns.map(async (campaign) => {
        // Count impressions by summing plays of all media assets in this campaign
        const mediaIds = campaign.media.map(m => m.id);
        
        const impressions = await this.prisma.playbackEvent.count({
          where: {
            videoId: { in: mediaIds },
            eventType: 'play_confirm'
          }
        });

        // Calculate potential revenue (simulated pricing model for now: RD$0.10 per impression)
        // Usually, it's a fixed monthly fee or a CPM model. 
        // We'll show the impression count as the "Proof of Performance".
        const CPM = 100; // RD$100 per 1,000 impressions
        const revenue = (impressions / 1000) * CPM;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalImpressions: impressions,
          assignedTaxis: campaign._count.devices,
          estimatedRevenue: revenue,
          status: campaign.status
        };
      })
    );

    return reports;
  }

  /**
   * Generates a payroll report for drivers based on activity.
   * Logic: If a taxi has at least 1 playback event in the current month, they earn RD$500.
   */
  async getDriverPayrollReport(month?: Date) {
    const targetDate = month || new Date();
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    this.logger.log(`Generating driver payroll for period: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    const drivers = await this.prisma.driver.findMany();

    const payroll = await Promise.all(
      drivers.map(async (driver) => {
        // Check activity for the device assigned to this driver
        const deviceId = driver.deviceId;
        
        let uniqueAdsPlayed = 0;
        let totalPlays = 0;

        if (deviceId) {
          // Get unique campaign IDs played on this device this month
          const uniqueCampaigns = await this.prisma.playbackEvent.groupBy({
            by: ['videoId'],
            where: {
              deviceId: deviceId,
              timestamp: {
                gte: startDate,
                lte: endDate
              }
            }
          });

          uniqueAdsPlayed = uniqueCampaigns.length;
          
          totalPlays = await this.prisma.playbackEvent.count({
            where: {
              deviceId: deviceId,
              timestamp: {
                gte: startDate,
                lte: endDate
              }
            }
          });
        }

        const заработок = uniqueAdsPlayed * this.PAY_PER_ACTIVE_TAXI;

        return {
          driverId: driver.id,
          fullName: driver.fullName,
          cedula: driver.cedula,
          phone: driver.phone,
          taxiPlate: driver.taxiPlate,
          assignedDevices: deviceId ? 1 : 0,
          uniqueAdsPlayed,
          totalPlaysThisMonth: totalPlays,
          status: uniqueAdsPlayed > 0 ? 'ACTIVE' : 'INACTIVE',
          amountToPay: заработок,
          currency: 'DOP'
        };
      })
    );

    return {
      period: startDate.toLocaleString('es-DO', { month: 'long', year: 'numeric' }),
      totalPayout: payroll.reduce((sum, item) => sum + item.amountToPay, 0),
      drivers: payroll
    };
  }

  /**
   * Performs a pre-run simulation of the mass payment process.
   * Useful for auditing total budget before committing to a payroll run.
   */
  async getMassPaymentSimulation(month?: Date) {
    const targetDate = month || new Date();
    const payroll = await this.getDriverPayrollReport(targetDate);
    
    const summary = {
      period: payroll.period,
      totalBudgetRequired: payroll.totalPayout,
      totalDriversInFleet: payroll.drivers.length,
      qualifiedDrivers: payroll.drivers.filter(d => d.amountToPay > 0).length,
      idleDrivers: payroll.drivers.filter(d => d.amountToPay === 0).length,
      totalUniqueAdsPlayed: payroll.drivers.reduce((sum, d) => sum + d.uniqueAdsPlayed, 0),
      avgPayoutPerDriver: payroll.totalPayout / (payroll.drivers.filter(d => d.amountToPay > 0).length || 1),
      currency: 'DOP',
      timestamp: new Date().toISOString()
    };

    return {
      summary,
      details: payroll.drivers.map(d => ({
        name: d.fullName,
        plate: d.taxiPlate,
        adsCount: d.uniqueAdsPlayed,
        earnings: d.amountToPay,
        isQualified: d.amountToPay > 0
      }))
    };
  }

  /**
   * Flattens JSON data to a CSV string.
   */
  generateCSV(data: any[]) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(fieldName => {
          const value = row[fieldName];
          // Basic CSV escaping
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }
}
