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
import { Response } from 'express';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  /**
   * Calculates the payroll for all drivers for a specific month/year.
   * Default to current month if not provided.
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
    res.setHeader('Content-Type', 'text/html');
    return res.status(HttpStatus.OK).send(html);
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
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payroll-${m}-${y}.csv`);
    return res.status(HttpStatus.OK).send(csv);
  }

  @Get('export/campaigns.csv')
  async exportCampaigns(@Res() res: Response) {
    const csv = await this.financeService.exportCampaignsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=campaigns-billing.csv');
    return res.status(HttpStatus.OK).send(csv);
  }

  @Get('export/campaign/:id.csv')
  async exportSingleCampaign(
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const csv = await this.financeService.exportCampaignCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign-${id}.csv`);
    return res.status(HttpStatus.OK).send(csv);
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
