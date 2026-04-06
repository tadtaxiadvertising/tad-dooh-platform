import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import { throttledMap } from '../../utils/throttler.util';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { EmailService } from '../notifications/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly PAY_PER_AD = 500; // RD$500 per active ad

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly whatsappService: WhatsAppService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Proceso de Notificación Automática por Morosidad (Regla 402)
   */
  async notifyMorosidad(deviceId: string) {
    this.logger.warn(`🚨 [FINANCE_ALERT] Triggering Morosidad Protocol for Device: ${deviceId}`);

    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { driver: true }
    });

    if (!device) return;

    // 1. Generar la Factura SOS (PDF)
    const pdfBuffer = await this.invoiceService.generateDebtInvoicePDF({
      deviceId: device.deviceId,
      chofer: device.driver?.fullName || 'Socio TAD',
      placa: device.taxiNumber
    });

    // 2. Real Notifications (WhatsApp only as Driver lacks email field in current schema)
    const driverPhone = device.driver?.phone;
    const driverName = device.driver?.fullName || 'Socio TAD';

    if (driverPhone) {
      await this.whatsappService.sendDelinquencyAlert(driverPhone, driverName, device.deviceId);
      this.logger.log(`📱 [WHATSAPP_SENT] Alerta de Morosidad enviada a: ${driverPhone}`);
    }

    // 3. Registrar el intento de cobro en el Ledger
    await (this.prisma as any).financialTransaction.create({
      data: {
        type: 'INCOMING',
        category: 'SUSCRIPCION',
        status: 'PENDING',
        amount: 6000,
        entityId: device.driver?.id,
        reference: `REGLA-402-${deviceId.substring(0,8)}`,
        note: `Factura de morosidad generada automáticamente por Kill-Switch.`
      }
    });

    return { success: true, notified: !!driverPhone };
  }

  /**
   * SCANNER CRON: Checks daily for drivers with unpaid subscriptions past due
   * and triggers the delinquency protocol.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async checkHighDelinquency() {
    this.logger.log('🛡️ [CRON_DELINQUENCY] Iniciando escaneo diario de morosidad...');

    const delinquentDrivers = await this.prisma.driver.findMany({
      where: {
        status: 'ACTIVE',
        subscriptionPaid: false,
        subscriptionEnd: { lt: new Date() } // Past due
      },
      include: { devices: true }
    });

    if (delinquentDrivers.length === 0) {
      this.logger.log('✅ No hay morosos críticos detectados hoy.');
      return;
    }

    this.logger.warn(`🛑 Detectados ${delinquentDrivers.length} choferes en mora crítica.`);

    for (const driver of delinquentDrivers) {
      for (const device of driver.devices) {
        await this.notifyMorosidad(device.deviceId);
      }
    }
  }

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
        devices: {
          include: {
            campaigns: true // explicitly assigned campaigns
          }
        },
        referrals: true, // Get drivers referred by this partner
        referredAdvertisers: true // Get advertisers referred by this partner
      } as any
    });

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const payroll = await Promise.all(drivers.map(async (d) => {
      const driver = d as any;
      let activeAdsCount = 0;

      // 2. Calculate GPS Usage Bonus
      // Condition: At least 100 entries in DriverLocation during the month
      const gpsPointsCount = await this.prisma.driverLocation.count({
        where: {
          driverId: driver.id,
          timestamp: { gte: periodStart, lte: periodEnd }
        }
      });
      const gpsBonus = gpsPointsCount >= 100 ? 500 : 0;

      // Iterate over all devices for this driver ONLY if subscription is paid
      const isSubPaid = driver.subscriptionPaid && (!driver.subscriptionEnd || new Date(driver.subscriptionEnd) >= new Date());
      const eligibleCampaignSet = new Set<string>();

      if (isSubPaid) {
        const devices = driver.devices || [];
        devices.forEach((device: any) => {
          const deviceCity = device.city || 'Santo Domingo';
          
          activeCampaigns.forEach(camp => {
            const matchesCity = camp.targetCity === 'Global' || camp.targetCity === deviceCity;
            if (!matchesCity) return;

            const isTargetAll = camp.targetAll === true || camp.isGlobal === true;
            const isExplicitlyAssigned = device.campaigns.some((dc: any) => dc.campaign_id === camp.id);
            
            if (isTargetAll || isExplicitlyAssigned) {
              eligibleCampaignSet.add(camp.id);
            }
          });
        });
      }

      activeAdsCount = eligibleCampaignSet.size;
      const baseCommission = 0; // Removed fixed monthly commission as per new business rule
      
      // Calculate referral commissions (500 per referral they brought in)
      const referrals = driver.referrals ? driver.referrals.length : 0;
      const driverReferralBonus = referrals * 500;

      // Calculate advertiser referral commissions (500 per advertiser they brought in)
      const advertiserReferrals = driver.referredAdvertisers ? driver.referredAdvertisers.length : 0;
      const advertiserReferralBonus = advertiserReferrals * 500;

      const adTransmissionIncome = activeAdsCount * this.PAY_PER_AD;
      const totalAmount = adTransmissionIncome + driverReferralBonus + advertiserReferralBonus + gpsBonus;

      // Enhanced: Get the actual taxi number from the assigned devices or driver record
      const actualTaxiNumber = driver.devices?.[0]?.taxiNumber || driver.taxiNumber || 'S/N';

      return {
        driverId: driver.id,
        driverName: driver.fullName || 'TAD DRIVER',
        driverPhone: driver.phone || '',
        taxiNumber: actualTaxiNumber,
        activeAds: activeAdsCount,
        adIncome: adTransmissionIncome,
        baseCommission,
        gpsPoints: gpsPointsCount,
        gpsBonus: gpsBonus,
        referralBonus: driverReferralBonus,
        advertiserReferralBonus,
        totalAmount: totalAmount,
        currency: 'DOP'
      };
    }));

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

    // REGLA SRE: Process with concurrency limits to avoid RAM spikes on 512MB VPS
    let count = 0;
    await throttledMap(recordsToCreate, async (record) => {
      await this.prisma.payrollPayment.create({
        data: record
      });
      count++;
    }, 3);

    this.logger.log(`✅ Bulk billing completed: ${count} drivers credited.`);
    return { success: true, count };
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

    // REGLA SRE: Process with concurrency limits to avoid RAM spikes on 512MB VPS
    const reports = await throttledMap(campaigns, async (campaign) => {
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
    }, 3); // Limit to 3 simultaneous campaign audits (more intensive)

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
    let csv = 'ID Socio/TAD DRIVER,Nombre TAD DRIVER,Taxi,GPS Points,Bono Disponibilidad,Referidos,Ads Activos,Ingresos Ads,Monto Liquidar\n';
    data.forEach(d => {
      csv += `${d.driverId},${d.driverName},${d.taxiNumber || 'N/A'},${d.gpsPoints},RD$ ${d.gpsBonus},RD$ ${d.referralBonus},${d.activeAds},RD$ ${d.adIncome},RD$ ${d.totalAmount}\n`;
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

  private readonly ITBIS_RATE = 0.18;
  private readonly RECURRING_SUB_BASE = 6000.0;
  private readonly REFERRAL_RETENTION_RATE = 0.10; // 10% referred retention baseline

  /**
   * FINANCIAL INTELLIGENCE: Registers a new transaction with automatic tax & referral logic.
   */
  async recordTransaction(data: {
    type: string;
    category: string;
    amount: number;
    entityId?: string;
    reference?: string;
    note?: string;
    status?: string;
  }) {
    this.logger.log(`Recording ${data.type} transaction for category: ${data.category}`);

    let taxAmount = 0;
    let netAmount = data.amount;

    // Apply ITBIS 18% automatically for relevant categories
    if (data.category === 'SUSCRIPCION' || data.category === 'PUBLICIDAD') {
      taxAmount = (data.amount / (1 + this.ITBIS_RATE)) * this.ITBIS_RATE;
      netAmount = data.amount - taxAmount;
    }

    // Advanced Business Rule: If it's a subscription payment, check for referral retention
    if (data.category === 'SUSCRIPCION' && data.entityId) {
      const driver = await (this.prisma.driver as any).findUnique({
        where: { id: data.entityId },
        select: { referredBy: true }
      });

      if (driver?.referredBy) {
        this.logger.log(`Referral detected for driver ${data.entityId}. Applying retention logic.`);
        const referralBonus = netAmount * this.REFERRAL_RETENTION_RATE;
        netAmount -= referralBonus; // Retain bonus for the referrer
        
        // Bonus transaction for the referrer could be recorded here as OUTGOING or a PENDING balance
      }
    }

    return (this.prisma as any).financialTransaction.create({
      data: {
        type: data.type,
        category: data.category,
        amount: data.amount,
        taxAmount,
        netAmount,
        entityId: data.entityId,
        reference: data.reference,
        note: data.note,
        status: data.status || 'COMPLETED'
      }
    });
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns the MRR and Burn Rate projections.
   */
  async getFinancialSummary() {
    this.logger.log('Generating financial summary and projections');

    // MRR Calculation: Number of active drivers * Subscription Base
    const activeSubscribedDrivers = await this.prisma.driver.count({
      where: { status: 'ACTIVE', subscriptionPaid: true }
    });

    const mrr = activeSubscribedDrivers * this.RECURRING_SUB_BASE;

    // Burn Rate Calculation: Fixed costs from transactions (VPS, Maps, etc.)
    const monthStart = new Date();
    monthStart.setDate(1);
    
    const monthlyExpenses = await (this.prisma as any).financialTransaction.aggregate({
      where: {
        type: 'OUTGOING',
        createdAt: { gte: monthStart }
      },
      _sum: { amount: true }
    });

    const burnRate = monthlyExpenses._sum.amount || 0;

    return {
      mrr,
      burnRate,
      activeSubscribers: activeSubscribedDrivers,
      netProjection: mrr - burnRate,
      currency: 'DOP',
      timestamp: new Date()
    };
  }

  /**
   * FINANCIAL INTELLIGENCE: getInvestorMetrics
   * Unit Economics & Escalabilidad
   */
  async getInvestorMetrics() {
    this.logger.log('Generating investor metrics (Unit Economics)');

    // 1. CAC (Customer Acquisition Cost) = Total OPEX_MARKETING / Total Advertisers
    const totalMarketing = await (this.prisma as any).financialTransaction.aggregate({
      where: { category: 'OPEX_MARKETING' },
      _sum: { amount: true }
    });
    const totalAdvertisers = await this.prisma.advertiser.count();
    const marketingSpend = totalMarketing._sum.amount || 0;
    const cac = totalAdvertisers > 0 ? marketingSpend / totalAdvertisers : 0;

    // 2. EBITDA Operativo = Revenue (AD + SUB) - OPEX (PAYOUT + COMM + MKT) (Sin CAPEX, TAX_ITBIS)
    const revenues = await (this.prisma as any).financialTransaction.aggregate({
      where: { category: { in: ['REVENUE_AD', 'REVENUE_SUBSCRIPTION'] } },
      _sum: { amount: true }
    });
    const opex = await (this.prisma as any).financialTransaction.aggregate({
      where: { category: { in: ['OPEX_DRIVER_PAYOUT', 'OPEX_COMMISSION', 'OPEX_MARKETING'] } },
      _sum: { amount: true }
    });
    const totalRev = revenues._sum.amount || 0;
    const totalOpex = opex._sum.amount || 0;
    const ebitda = totalRev - totalOpex;

    // 3. Promedio Mensual por Taxi (Para LTV y Payback)
    const activeTaxis = await this.prisma.device.count({ where: { status: 'ACTIVE' } });
    
    // Ingresos promedio mensual (simplificado)
    const monthsActive = 12; // Suponemos 12 meses o calculamos base en oldest transaction
    const monthlyRevPerTaxi = activeTaxis > 0 ? (totalRev / monthsActive) / activeTaxis : 0;
    const monthlyOpexPerTaxi = activeTaxis > 0 ? (totalOpex / monthsActive) / activeTaxis : 0;
    
    // LTV: Ingreso proyectado por taxi a 24 meses
    const ltv = monthlyRevPerTaxi * 24;

    // Payback Period (Meses para recuperar RD$ 6,000 inicial)
    const netMonthlyPerTaxi = monthlyRevPerTaxi - monthlyOpexPerTaxi;
    const paybackPeriod = netMonthlyPerTaxi > 0 ? 6000 / netMonthlyPerTaxi : 999; // 999 if never

    return {
      cac: cac.toFixed(2),
      ltv: ltv.toFixed(2),
      paybackPeriod: paybackPeriod.toFixed(1),
      ebitda: ebitda.toFixed(2),
      activeTaxis,
      monthlyRevPerTaxi: monthlyRevPerTaxi.toFixed(2),
      monthlyOpexPerTaxi: monthlyOpexPerTaxi.toFixed(2),
      hardwareCostPerUnit: 6000,
      currency: 'DOP',
      generatedAt: new Date()
    };
  }

  /**
   * Returns the ledger (historical transactions)
   */
  async getLedger() {
    return (this.prisma as any).financialTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  private generateInvoiceTemplate(data: any) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${data.invoiceNumber} - TAD DOOH</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root { --tad-yellow: #FFD400; --bg: #0a0a0a; --card: #141414; }
        body { font-family: 'Outfit', sans-serif; background: var(--bg); color: #fff; margin: 0; padding: 40px; line-height: 1.6; }
        .invoice-box { max-width: 900px; margin: auto; padding: 50px; background: var(--card); border: 1px solid #222; border-radius: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); position: relative; overflow: hidden; }
        .invoice-box::before { content: ''; position: absolute; top: 0; right: 0; width: 300px; h-8; background: var(--tad-yellow); clip-path: polygon(100% 0, 0 0, 100% 100%); opacity: 0.1; }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; position: relative; z-index: 10; }
        .logo-section h1 { font-size: 48px; font-weight: 900; margin: 0; letter-spacing: -2px; color: var(--tad-yellow); line-height: 1; }
        .logo-section h1 span { color: #fff; }
        .logo-section p { margin: 10px 0 0 0; color: #666; font-weight: 700; letter-spacing: 2px; font-size: 10px; text-transform: uppercase; }

        .meta-section { text-align: right; }
        .meta-section h2 { font-size: 24px; font-weight: 900; margin: 0; color: #fff; }
        .meta-section p { margin: 5px 0; color: #888; font-size: 14px; font-weight: 700; }
        .status-badge { display: inline-block; padding: 8px 16px; background: #FFD4001a; color: var(--tad-yellow); border: 1px solid #FFD40033; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 15px; }

        .client-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 60px; }
        .client-block h3 { font-size: 12px; color: #444; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px solid #222; padding-bottom: 5px; }
        .client-block p { margin: 0; font-size: 18px; font-weight: 700; color: #eee; }
        .client-block .small { font-size: 14px; color: #777; font-weight: 400; margin-top: 5px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-bottom: 60px; }
        th { text-align: left; padding: 15px 20px; color: #444; text-transform: uppercase; font-size: 11px; font-weight: 800; border-bottom: 1px solid #222; }
        td { padding: 25px 20px; background: #1a1a1a; font-size: 16px; border-top: 1px solid #222; border-bottom: 1px solid #222; }
        td:first-child { border-left: 1px solid #222; border-radius: 16px 0 0 16px; font-weight: 700; }
        td:last-child { border-right: 1px solid #222; border-radius: 0 16px 16px 0; text-align: right; font-weight: 900; color: var(--tad-yellow); }
        .description-sub { font-size: 12px; color: #555; display: block; margin-top: 5px; }

        .bottom-section { display: flex; justify-content: space-between; align-items: flex-end; }
        .payment-info { color: #555; font-size: 12px; max-width: 400px; }
        .payment-info h4 { color: #888; margin-bottom: 10px; font-size: 14px; }

        .totals { width: 350px; background: #1a1a1a; padding: 30px; border-radius: 24px; border: 1px solid #222; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #888; }
        .total-row.grand { margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; font-size: 32px; font-weight: 900; color: var(--tad-yellow); }

        .footer { margin-top: 80px; text-align: center; color: #333; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; }

        @media print {
            body { padding: 0; background: #fff; color: #000; }
            .invoice-box { box-shadow: none; border: none; padding: 20px; background: #fff; }
            td, .totals { background: #f9f9f9; color: #000; border-color: #eee; }
            .total-row.grand, .logo-section h1 { color: #000 !important; }
            th { color: #888; }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="logo-section">
                <h1>TAD<span>DOOH</span></h1>
                <p>Digital Out Of Home Advertising</p>
            </div>
            <div class="meta-section">
                <h2>Comprobante Fiscal</h2>
                <p>ID: ${data.invoiceNumber}</p>
                <p>Emitido: ${data.date}</p>
                <div class="status-badge">Auditoría Aprobada</div>
            </div>
        </div>

        <div class="client-grid">
            <div class="client-block">
                <h3>Prestador</h3>
                <p>TAD Advertising SRL</p>
                <p class="small">RNC: 132-45678-9<br>Calle Central #45, Santo Domingo, RD</p>
            </div>
            <div class="client-block" style="text-align: right">
                <h3>Receptor</h3>
                <p>${data.client}</p>
                <p class="small">${data.email || 'contacto@cliente.com'}<br>Periodo: ${data.period}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Concepto de Pauta</th>
                    <th style="text-align: center">Ciclos</th>
                    <th style="text-align: right">Impactos</th>
                    <th style="text-align: right">Total (DOP)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        ${data.campaign}
                        <span class="description-sub">Servicio de exhibición publicitaria en flota TAD taxis</span>
                    </td>
                    <td style="text-align: center">${data.qty} Mes(es)</td>
                    <td style="text-align: right">${data.impressions.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.total.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div class="bottom-section">
            <div class="payment-info">
                <h4>Detalles de Transferencia</h4>
                <p>Banco Popular Dominicano<br>Cuenta Corriente: 802-XXXXXXX<br>Beneficiario: TAD Advertising SRL</p>
                <p style="margin-top: 20px">* Este documento es un reporte de auditoría fiscal generado automáticamente por el sistema de inteligencia financiera de TAD.</p>
            </div>
            <div class="totals">
                <div class="total-row">
                    <span>Monto Base</span>
                    <span>RD$ ${data.subtotal.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span>ITBIS (18%)</span>
                    <span>RD$ ${data.taxes.toLocaleString()}</span>
                </div>
                <div class="total-row grand">
                    <span>RD$ ${data.total.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            TAD Platform v5.2 - Intelligence & Performance Reporting
        </div>
    </div>
</body>
</html>
    `;
  }
}
