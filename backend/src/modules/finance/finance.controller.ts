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
}
