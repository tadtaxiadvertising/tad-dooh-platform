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

    // 1. Get all drivers and their associated devices
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: { status: 'ACTIVE', active: true }
    });

    const drivers = await this.prisma.driver.findMany({
      include: {
        device: {
          include: {
            campaigns: true // explicitly assigned campaigns
          }
        }
      }
    });

    const payroll = drivers.map(driver => {
      let activeAdsCount = 0;

      if (driver.device) {
        const deviceCity = driver.device.city || 'Santo Domingo';
        
        const eligibleCampaigns = activeCampaigns.filter(camp => {
          const matchesCity = camp.targetCity === 'Global' || camp.targetCity === deviceCity;
          if (!matchesCity) return false;

          const isTargetAll = camp.targetAll === true || camp.isGlobal === true;
          const isExplicitlyAssigned = driver.device!.campaigns.some(dc => dc.campaign_id === camp.id);
          
          return isTargetAll || isExplicitlyAssigned;
        });

        activeAdsCount = eligibleCampaigns.length;
      }

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
   * AUTOMATIC BILLING TRIGGER: Generates payroll records for all drivers for a specific month.
   */
  async triggerMonthlyBilling(month: number, year: number) {
    this.logger.log(`🚀 TRIGGER: Bulk billing generation for ${month}/${year}`);

    // Check if payroll already processed for this period to avoid duplicates
    const existing = await this.prisma.payrollPayment.findFirst({
      where: { month, year }
    });

    if (existing) {
      this.logger.warn(`⚠️ Payroll for ${month}/${year} already exists. Aborting bulk trigger.`);
      return { success: false, message: 'La nómina para este periodo ya fue generada.', count: 0 };
    }

    const payrollData = await this.calculateMonthlyPayroll(month, year);
    const recordsToCreate = payrollData
      .filter(p => p.totalAmount > 0)
      .map(p => ({
        driverId: p.driverId,
        month,
        year,
        amount: p.totalAmount,
        status: 'PENDING',
      }));

    if (recordsToCreate.length === 0) {
      return { success: true, message: 'No se encontraron montos a liquidar para este periodo.', count: 0 };
    }

    const result = await this.prisma.payrollPayment.createMany({
      data: recordsToCreate,
      skipDuplicates: true,
    });

    this.logger.log(`✅ Bulk billing completed: ${result.count} drivers credited.`);
    return { success: true, count: result.count };
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

        const mediaItems = await this.prisma.media.findMany({
          where: { id: { in: mediaIds } }
        });

        // Pricing model: RD$1,500 per 30-second block per media asset
        let monthlyRevenue = 0;
        mediaItems.forEach(media => {
          const duration = (media as any).durationSeconds || 30;
          const blocks = Math.ceil(duration / 30);
          monthlyRevenue += blocks * 1500;
        });

        const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
        const totalRevenue = monthlyRevenue * diffMonths;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalImpressions: impressions,
          assignedTaxis: campaign._count.devices,
          estimatedRevenue: totalRevenue,
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

    // RD$1,500 per 30-second block per media asset
    let monthlyBase = 0;
    campaign.media.forEach(m => {
      const dur = m.durationSeconds || 30;
      const blocks = Math.ceil(dur / 30);
      monthlyBase += blocks * 1500;
    });

    const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
    
    const subtotal = monthlyBase * diffMonths;
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
      unitPrice: monthlyBase,
      subtotal,
      taxes,
      total
    };

    return this.generateInvoiceTemplate(invoiceData);
  }

  /**
   * Generates a CSV export for payroll
   */
  async exportPayrollCsv(month: number, year: number) {
    const data = await this.calculateMonthlyPayroll(month, year);
    let csv = 'ID Conductor,Nombre Conductor,Taxi,Ads Activos,Monto Liquidar\n';
    data.forEach(d => {
      csv += `${d.driverId},${d.driverName},${d.taxiNumber || 'N/A'},${d.activeAds},RD$ ${d.totalAmount}\n`;
    });
    return csv;
  }

  /**
   * Generates a CSV export for a single campaign's billing & performance
   */
  async exportCampaignCsv(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { media: true, _count: { select: { devices: true } } }
    });

    if (!campaign) return 'Campaña no encontrada';

    const impressions = await this.prisma.playbackEvent.count({
      where: { videoId: { in: campaign.media.map(m => m.id) }, eventType: 'play_confirm' }
    });

    let monthlyBase = 0;
    campaign.media.forEach(m => {
      const dur = m.durationSeconds || 30;
      const blocks = Math.ceil(dur / 30);
      monthlyBase += blocks * 1500;
    });

    const diffTime = Math.abs(campaign.endDate.getTime() - campaign.startDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
    const total = monthlyBase * diffMonths;

    let csv = 'Detalle de Facturación - TAD DOOH\n';
    csv += `Campaña,${campaign.name}\n`;
    csv += `Cliente,${campaign.advertiser}\n`;
    csv += `Periodo,${campaign.startDate.toLocaleDateString()} - ${campaign.endDate.toLocaleDateString()}\n`;
    csv += `Meses,${diffMonths}\n`;
    csv += `Impactos Totales,${impressions}\n`;
    csv += `Monto Total,RD$ ${total}\n\n`;
    
    csv += 'ID Media,Nombre Media,Duración (s),Bloques 30s,Costo Mensual\n';
    campaign.media.forEach(m => {
      const dur = m.durationSeconds || 30;
      const blocks = Math.ceil(dur / 30);
      csv += `${m.id},${m.originalFilename || m.filename || 'N/A'},${dur},${blocks},RD$ ${blocks * 1500}\n`;
    });

    return csv;
  }

  async exportCampaignsCsv() {
    const data = await this.getCampaignBillingReport();
    let csv = 'ID Campaña,Nombre Campaña,Estado,Taxis Asignados,Impactos Reales,Ingreso Proyectado (RD$)\n';
    data.forEach(c => {
      csv += `${c.campaignId},${c.campaignName},${c.status},${c.assignedTaxis},${c.totalImpressions},${c.estimatedRevenue}\n`;
    });
    return csv;
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
