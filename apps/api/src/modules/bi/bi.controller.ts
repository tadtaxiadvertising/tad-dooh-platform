import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { BiService } from "./bi.service";
import { SupabaseAuthGuard } from "../auth/guards/supabase-auth.guard";
import {
  BiKpiResponse,
  TaxiDrillDownResponse,
} from "./interfaces/bi-kpi.interface";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/decorators/roles.decorator";

@Controller("bi")
@UseGuards(SupabaseAuthGuard)
@Roles(UserRole.ADMIN)
export class BiController {
  constructor(private readonly biService: BiService) {}

  @Get("kpis")
  async getMasterKpis(): Promise<BiKpiResponse> {
    return this.biService.getMasterKpis();
  }

  @Get("fleet-health")
  async getFleetHealth() {
    return this.biService.getFleetHealth();
  }

  @Get("fleet-health/:deviceId/drill-down")
  async getTaxiDrillDown(
    @Param("deviceId") deviceId: string,
  ): Promise<TaxiDrillDownResponse> {
    return this.biService.getTaxiDrillDown(deviceId);
  }

  @Post("reconciliation/generate")
  async generateReconciliation(@Body() dto: { period: string }) {
    if (!dto.period || !dto.period.match(/^\d{4}-\d{2}$/)) {
      throw new HttpException(
        "Formato de período inválido (YYYY-MM)",
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.biService.generateReconciliationReport(dto.period);
  }

  @Get("reconciliation/:period")
  async getReconciliation(
    @Param("period") period: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const p = page && !isNaN(Number(page)) ? Number(page) : 1;
    const ps = pageSize && !isNaN(Number(pageSize)) ? Number(pageSize) : 100;
    return this.biService.getReconciliationReport(period, p, ps);
  }

  @Get("hotspots")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getHotspots() {
    return this.biService.getHotspots();
  }
}
