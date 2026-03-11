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
   * Generates a professional HTML invoice for a campaign.
   */
  async generateInvoiceHtml(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiserRef: true,
        media: true
      }
    });

    if (!campaign) return null;

    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map(m => m.id) },
        eventType: 'play_confirm'
      }
    });

    // Business Rule: RD$1,500 per month
    const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
    
    const subtotal = diffMonths * 1500;
    const taxes = subtotal * 0.18; // ITBIS
    const total = subtotal + taxes;

    const data = {
      invoiceNumber: `INV-${campaign.id.substring(0, 8).toUpperCase()}`,
      date: new Date().toLocaleDateString('es-DO'),
      client: campaign.advertiserRef?.companyName || campaign.advertiser,
      email: campaign.advertiserRef?.email || 'N/A',
      campaign: campaign.name,
      period: `${campaign.startDate.toLocaleDateString('es-DO')} - ${campaign.endDate.toLocaleDateString('es-DO')}`,
      impressions,
      qty: diffMonths,
      unitPrice: 1500,
      subtotal,
      taxes,
      total
    };

    return this.generateInvoiceTemplate(data);
  }

  private generateInvoiceTemplate(data: any) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura ${data.invoiceNumber} - TAD</title>
    <style>
        body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 40px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 40px; background: #111; border: 1px solid #333; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #fad400; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: 900; color: #fad400; letter-spacing: -1px; }
        .info { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .info div { flex: 1; }
        .info h3 { color: #888; text-transform: uppercase; font-size: 12px; margin-bottom: 10px; }
        .info p { margin: 0; font-size: 16px; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { text-align: left; border-bottom: 1px solid #333; padding: 15px 5px; color: #fad400; text-transform: uppercase; font-size: 12px; }
        td { padding: 20px 5px; border-bottom: 1px solid #222; font-size: 15px; }
        .total-section { margin-left: auto; width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #222; }
        .total-row.final { border-bottom: none; color: #fad400; font-size: 24px; font-weight: 700; padding-top: 20px; }
        .footer { margin-top: 60px; text-align: center; color: #555; font-size: 12px; border-top: 1px solid #222; padding-top: 20px; }
        @media print {
            body { background: #fff; color: #000; padding: 0; }
            .invoice-box { border: none; box-shadow: none; background: #fff; color: #000; border: 1px solid #000; }
            .header { border-bottom: 2px solid #000; color: #000; }
            .logo { color: #000; }
            th { color: #000; border-bottom: 2px solid #000; }
            td { border-bottom: 1px solid #ddd; color: #000; }
            .total-row.final { color: #000; }
            .info p, .info h3 { color: #000; }
            .total-row { border-bottom: 1px solid #eee; }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="logo">TAD<span style="color:#fff">DOOH</span></div>
            <div style="text-align: right">
                <p style="margin: 0; font-weight: 900; font-size: 20px;">FACTURA COMERCIAL</p>
                <p style="color: #888; margin: 5px 0;"># ${data.invoiceNumber}</p>
                <p style="color: #888; margin: 0;">Fecha: ${data.date}</p>
            </div>
        </div>

        <div class="info">
            <div>
                <h3>EMISOR</h3>
                <p>TAD Advertising SRL</p>
                <p>RNC: 132-XXXXX-X</p>
                <p>Santo Domingo, Rep. Dom.</p>
            </div>
            <div style="text-align: right">
                <h3>CLIENTE</h3>
                <p>${data.client}</p>
                <p>${data.email}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Descripción de Campaña</th>
                    <th style="text-align: center">Meses</th>
                    <th style="text-align: center">Impresiones</th>
                    <th style="text-align: right">Precio Unit.</th>
                    <th style="text-align: right">Monto</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <strong>${data.campaign}</strong><br>
                        <small style="color:#888">Periodo: ${data.period}</small>
                    </td>
                    <td style="text-align: center">${data.qty}</td>
                    <td style="text-align: center">${data.impressions.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.unitPrice.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.subtotal.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span>Subtotal</span>
                <span>RD$ ${data.subtotal.toLocaleString()}</span>
            </div>
            <div class="total-row">
                <span>ITBIS (18%)</span>
                <span>RD$ ${data.taxes.toLocaleString()}</span>
            </div>
            <div class="total-row final">
                <span>TOTAL</span>
                <span>RD$ ${data.total.toLocaleString()}</span>
            </div>
        </div>

        <div class="footer">
            <p>Gracias por confiar en el ecosistema publicitario de TAD.</p>
            <p>Este documento es una factura digital generada automáticamente. Para pagos vía transferencia use el Banco Popular: 8XXXXXX</p>
        </div>
    </div>
    <script>
        // print automatic if query param present
        if (window.location.search.includes('print=true')) {
            window.print();
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * Calculates the current payroll for all drivers based on active ads.
   * Logic: RD$500 per active campaign on the driver's device.
   */
  async calculateCurrentPayroll() {
    this.logger.log('Calculating current payroll for all drivers');

    const drivers = await this.prisma.driver.findMany({
      include: {
        device: {
          include: {
            campaigns: {
              where: {
                campaign: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        }
      }
    });

    const payroll = drivers.map(driver => {
      const activeAdsCount = driver.device ? driver.device.campaigns.length : 0;
      const amountDue = activeAdsCount * 500;

      return {
        driverId: driver.id,
        driverName: driver.fullName,
        activeAds: activeAdsCount,
        amountDue: amountDue,
        currency: 'DOP'
      };
    });

    return payroll;
  }

  /**
   * Marks a payroll period as paid for a specific driver.
   */
  async markAsPaid(driverId: string, month: number, year: number) {
    this.logger.log(`Marking payroll as PAID for driver ${driverId} for period ${month}/${year}`);

    // Re-calculate to ensure accuracy at the moment of payment
    const payrollData = await this.calculateCurrentPayroll();
    const driverEntry = payrollData.find(p => p.driverId === driverId);

    if (!driverEntry) {
      throw new Error('Driver not found in current payroll calculation');
    }

    return this.prisma.payrollPayment.create({
      data: {
        driverId,
        amount: driverEntry.amountDue,
        periodMonth: month,
        periodYear: year,
        status: 'PAID',
        paidAt: new Date()
      }
    });
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
