import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { BiService } from './bi.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { BiKpiResponse, TaxiDrillDownResponse } from './interfaces/bi-kpi.interface';

@Controller('api/bi')
@UseGuards(SupabaseAuthGuard)
export class BiController {
  constructor(private readonly biService: BiService) {}

  @Get('kpis')
  async getMasterKpis(): Promise<BiKpiResponse> {
    return this.biService.getMasterKpis();
  }

  @Get('fleet-health')
  async getFleetHealth() {
    return this.biService.getFleetHealth();
  }

  @Get('fleet-health/:deviceId/drill-down')
  async getTaxiDrillDown(@Param('deviceId') deviceId: string): Promise<TaxiDrillDownResponse> {
    return this.biService.getTaxiDrillDown(deviceId);
  }

  @Post('reconciliation/generate')
  async generateReconciliation(@Body() dto: { period: string }) {
    if (!dto.period || !dto.period.match(/^\d{4}-\d{2}$/)) {
      throw new HttpException('Formato de período inválido (YYYY-MM)', HttpStatus.BAD_REQUEST);
    }
    return this.biService.generateReconciliationReport(dto.period);
  }

  @Get('reconciliation/:period')
  async getReconciliation(@Param('period') period: string) {
    // In a real Phase 2 implementation, this would query the ReconciliationReport model
    // For now, we reuse the generator logic or simplified queries
    return this.biService.generateReconciliationReport(period);
  }
}
