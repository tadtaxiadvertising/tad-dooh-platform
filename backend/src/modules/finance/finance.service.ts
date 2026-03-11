import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly PAY_PER_AD = 500; // RD$500 per active ad

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates the monthly payroll for all drivers.
   * Logic: RD$500 per each ACTIVE campaign assigned to any device of the driver.
   */
  async calculateMonthlyPayroll(month: number, year: number) {
    this.logger.log(`Calculating payroll for ${month}/${year}`);

    // 1. Get all drivers with their devices and active campaigns
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
      // Sum active ads across devices (currently 1 device per driver, but extensible)
      const activeAdsCount = driver.device ? driver.device.campaigns.length : 0;
      const totalAmount = activeAdsCount * this.PAY_PER_AD;

      return {
        driverId: driver.id,
        driverName: driver.fullName,
        taxiNumber: driver.taxiNumber,
        activeAds: activeAdsCount,
        totalAmount: totalAmount,
        currency: 'DOP'
      };
    });

    return payroll;
  }

  /**
   * Processes a payment for a driver and records it in the database.
   */
  async processPayment(driverId: string, month: number, year: number, reference: string) {
    this.logger.log(`Processing payment for driver ${driverId} - ${month}/${year}`);

    // Re-calculate to get current amount due
    const payrollData = await this.calculateMonthlyPayroll(month, year);
    const driverEntry = payrollData.find(p => p.driverId === driverId);

    if (!driverEntry) {
      throw new Error('Driver not found for payroll calculation');
    }

    return this.prisma.payrollPayment.create({
      data: {
        driverId,
        month,
        year,
        amount: driverEntry.totalAmount,
        referenceNum: reference,
        status: 'PAID',
        paidAt: new Date()
      }
    });
  }

  /**
   * Proof of Performance: Campaign billing report (Impressions based)
   */
  async getCampaignBillingReport() {
    this.logger.log('Generating campaign billing report');

    const campaigns = await this.prisma.campaign.findMany({
      include: {
        media: { select: { id: true } },
        _count: { select: { devices: true } }
      }
    });

    const reports = await Promise.all(
      campaigns.map(async (campaign) => {
        const mediaIds = campaign.media.map(m => m.id);
        const impressions = await this.prisma.playbackEvent.count({
          where: { videoId: { in: mediaIds }, eventType: 'play_confirm' }
        });

        // Pricing model: RD$100 CPM
        const CPM = 100;
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
   * Generates invoice HTML for a campaign
   */
  async generateInvoiceHtml(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { advertiserRef: true, media: true }
    });

    if (!campaign) return null;

    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map(m => m.id) },
        eventType: 'play_confirm'
      }
    });

    // RD$1,500/month flat fee + impressions stats
    const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
    
    const subtotal = diffMonths * 1500;
    const taxes = subtotal * 0.18;
    const total = subtotal + taxes;

    const invoiceData = {
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

    return this.generateInvoiceTemplate(invoiceData);
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
                    <th>Descripción</th>
                    <th style="text-align: center">Meses</th>
                    <th style="text-align: center">Impresiones</th>
                    <th style="text-align: right">Unit.</th>
                    <th style="text-align: right">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>${data.campaign}</strong></td>
                    <td style="text-align: center">${data.qty}</td>
                    <td style="text-align: center">${data.impressions.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.unitPrice.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.subtotal.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>
        <div class="total-section">
            <div class="total-row"><span>Subtotal</span><span>RD$ ${data.subtotal.toLocaleString()}</span></div>
            <div class="total-row"><span>ITBIS (18%)</span><span>RD$ ${data.taxes.toLocaleString()}</span></div>
            <div class="total-row final"><span>TOTAL</span><span>RD$ ${data.total.toLocaleString()}</span></div>
        </div>
        <div class="footer"><p>Gracias por confiar en TAD.</p></div>
    </div>
</body>
</html>`;
  }
}
