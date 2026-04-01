import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  Res, 
  HttpStatus, 
  UseGuards 
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { InvoiceService } from './invoice.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly invoiceService: InvoiceService,
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * PDF: Certificado de Exhibición (Proof of Play) para Anunciantes.
   */
  @Get('report/campaign/:id/pdf')
  async downloadCampaignPdf(@Param('id') id: string, @Res() res: Response) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { media:true }
    });
    if (!campaign) return res.status(404).send('Campaña no encontrada');

    const impressions = await this.prisma.playbackEvent.count({
      where: { videoId: { in: campaign.media.map(m => m.id) }, eventType: 'play_confirm' }
    });

    const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(campaign, {
      totalImpressions: impressions,
      assignedTaxis: campaign.media.length * 5 // Mock/Simulated for PDF model
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=POP_${campaign.name}.pdf`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  /**
   * PDF: Reporte de Inventario Técnico de Flota.
   */
  @Get('report/fleet/pdf')
  async downloadFleetPdf(@Res() res: Response) {
    const devices = await this.prisma.device.findMany();
    const pdf = await this.invoiceService.generateFleetStatusPDF(devices);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=TAD_Inventario_Flota.pdf',
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  /**
   * PDF: Recibo de Transacción.
   */
  @Get('transaction/:id/pdf')
  async downloadTransactionPdf(@Param('id') id: string, @Res() res: Response) {
    const tx = await (this.prisma as any).financialTransaction.findUnique({ where: { id } });
    if (!tx) return res.status(404).send('Transacción no encontrada');

    const pdf = await this.invoiceService.generateTransactionReceiptPDF(tx);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Recibo_${tx.id.substring(0,8)}.pdf`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  /**
   * Calculates the payroll for all drivers for a specific month/year.
   */
  @Get('payroll')
  async getPayroll(
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    return this.financeService.calculateMonthlyPayroll(m, y);
  }

  /**
   * Processes a payment for a specific driver.
   */
  @Post('payroll/pay')
  async processPayment(
    @Body() data: { driverId: string; month: number; year: number; reference: string }
  ) {
    return this.financeService.processPayment(
      data.driverId, 
      data.month || new Date().getMonth() + 1, 
      data.year || new Date().getFullYear(), 
      data.reference
    );
  }

  @Post('payroll/whatsapp-confirm')
  async sendWhatsAppPaymentConfirm(
    @Body() body: { phone: string; driverName: string; amount: number; month: string }
  ) {
    return this.whatsappService.sendDriverPaymentConfirm(
      body.phone,
      body.driverName,
      body.amount,
      body.month
    );
  }

  /**
   * Triggers the bulk generation of monthly payroll for ALL drivers.
   */
  @Post('payroll/trigger')
  async triggerMonthlyBilling(
    @Body() data: { month?: number; year?: number }
  ) {
    const m = data.month || new Date().getMonth() + 1;
    const y = data.year || new Date().getFullYear();
    return this.financeService.triggerMonthlyBilling(m, y);
  }

  /**
   * Generates a billing report for advertisers based on impressions.
   */
  @Get('report/campaigns')
  async getCampaignBilling() {
    return this.financeService.getCampaignBillingReport();
  }

  /**
   * Generates a professional HTML invoice for a campaign.
   */
  @Get('invoice/:campaignId')
  async getInvoice(
    @Param('campaignId') campaignId: string,
    @Res() res: Response
  ) {
    const html = await this.financeService.generateInvoiceHtml(campaignId);
    if (!html) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Campaign not found' });
    }
    res.set('Content-Type', 'text/html');
    res.status(HttpStatus.OK).send(html);
  }

  @Get('export/payroll.csv')
  async exportPayroll(
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const csv = await this.financeService.exportPayrollCsv(m, y);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=payroll-${m}-${y}.csv`);
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('export/campaigns.csv')
  async exportCampaigns(@Res() res: Response) {
    const csv = await this.financeService.exportCampaignsCsv();
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=campaigns-billing.csv');
    res.status(HttpStatus.OK).send(csv);
  }

  @Get('export/campaign/:id.csv')
  async exportSingleCampaign(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const csv = await this.financeService.exportCampaignCsv(id);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', `attachment; filename=campaign-${id}.csv`);
    res.status(HttpStatus.OK).send(csv);
  }
  /**
   * FINANCIAL INTELLIGENCE: Registers a new financial transaction (Income/Expense).
   */
  @Post('transactions')
  async recordTransaction(
    @Body() data: { 
      type: string; 
      category: string; 
      amount: number; 
      entityId?: string; 
      reference?: string; 
      note?: string; 
      status?: string;
    }
  ) {
    return this.financeService.recordTransaction(data);
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns MRR, Burn Rate and net projections.
   */
  @Get('summary')
  async getSummary() {
    return this.financeService.getFinancialSummary();
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns the general ledger (last 50 transactions).
   */
  @Get('ledger')
  async getLedger() {
    return this.financeService.getLedger();
  }
}
