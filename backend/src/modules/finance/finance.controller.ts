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
import { Public } from '../auth/decorators/public.decorator';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('report/campaigns')
  async getCampaignBilling() {
    return this.financeService.getCampaignBillingReport();
  }

  @Get('report/payroll')
  async getDriverPayroll(@Res() res: Response, @Query('month') month?: string) {
    const targetDate = month ? new Date(month) : new Date();
    const result = await this.financeService.getDriverPayrollReport(targetDate);
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('simulate-payment')
  async simulateMassPayment(@Res() res: Response, @Query('month') month?: string) {
    const targetDate = month ? new Date(month) : new Date();
    const result = await this.financeService.getMassPaymentSimulation(targetDate);
    return res.status(HttpStatus.OK).json(result);
  }

  @Get('export/payroll.csv')
  async exportPayrollCsv(@Res() res, @Query('month') month?: string) {
    const targetDate = month ? new Date(month) : new Date();
    const data = await this.financeService.getDriverPayrollReport(targetDate);
    
    // Flatten data for CSV
    const csvData = data.drivers.map(d => ({
      CHOFER: d.fullName,
      CEDULA: d.cedula,
      PLACA: d.taxiPlate,
      ADS_UNICOS: d.uniqueAdsPlayed,
      PLAYS_MES: d.totalPlaysThisMonth,
      PAGO_RD: d.amountToPay,
      STATUS: d.status
    }));

    const csvStr = this.financeService.generateCSV(csvData);
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=nomina-choferes-${targetDate.getMonth() + 1}-${targetDate.getFullYear()}.csv`,
    });
    
    return res.send(csvStr);
  }

  @Get('export/campaigns.csv')
  async exportCampaignsCsv(@Res() res) {
    const data = await this.financeService.getCampaignBillingReport();
    
    const csvData = data.map(c => ({
      CAMPAÑA: c.campaignName,
      IMPRESIONES: c.totalImpressions,
      TAXI_ASIGNADOS: c.assignedTaxis,
      ESTIMADO_REV: c.estimatedRevenue,
      ESTADO: c.status
    }));

    const csvStr = this.financeService.generateCSV(csvData);
    
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=reporte-campañas-${new Date().getTime()}.csv`,
    });
    
    return res.send(csvStr);
  }

  @Get('invoice/:campaignId')
  async getInvoice(
    @Param('campaignId') campaignId: string, // Aquí fallaba el build
    @Res() res: Response
  ) {
    const html = await this.financeService.generateInvoiceHtml(campaignId);
    res.setHeader('Content-Type', 'text/html');
    return res.status(HttpStatus.OK).send(html);
  }

  @Get('payroll')
  async getPayroll() {
    return this.financeService.calculateCurrentPayroll();
  }

  @Post('payroll/pay')
  async processPayment(@Body() data: { driverId: string; month: number; year: number }) {
    return this.financeService.markAsPaid(data.driverId, data.month, data.year);
  }
}
