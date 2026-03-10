import { Controller, Get, Query, Response } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('report/campaigns')
  async getCampaignBilling() {
    return this.financeService.getCampaignBillingReport();
  }

  @Get('report/payroll')
  async getDriverPayroll(@Query('month') month?: string) {
    const targetDate = month ? new Date(month) : new Date();
    return this.financeService.getDriverPayrollReport(targetDate);
  }

  @Get('simulate-payment')
  async simulateMassPayment(@Query('month') month?: string) {
    const targetDate = month ? new Date(month) : new Date();
    return this.financeService.getMassPaymentSimulation(targetDate);
  }

  @Get('export/payroll.csv')
  async exportPayrollCsv(@Response() res, @Query('month') month?: string) {
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
  async exportCampaignsCsv(@Response() res) {
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
}
