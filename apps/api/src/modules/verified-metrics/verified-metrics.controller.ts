import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  ForbiddenException,
  Req,
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
  UseInterceptors,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { VerifiedMetricsService } from "./verified-metrics.service";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Controller("verified-metrics")
export class VerifiedMetricsController {
  private readonly logger = new Logger(VerifiedMetricsController.name);

  constructor(
    private readonly verifiedMetricsService: VerifiedMetricsService,
  ) {}

  /**
   * GET /api/verified-metrics/campaign/:campaignId — Reporte verificado de campaña
   * Query: dateFrom, dateTo (ISO strings)
   */
  @Get("campaign/:campaignId")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getCampaignVerifiedStats(
    @Param("campaignId") campaignId: string,
    @Req() req: AuthenticatedRequest,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException(
        "dateFrom y dateTo deben ser fechas válidas ISO",
      );
    }

    let access:
      | { role: UserRole.ADMIN }
      | { role: UserRole.ADVERTISER; advertiserId: string };
    if (req.user?.role === UserRole.ADMIN) {
      access = { role: UserRole.ADMIN };
    } else if (
      req.user?.role === UserRole.ADVERTISER &&
      req.user.entityId?.trim()
    ) {
      access = {
        role: UserRole.ADVERTISER,
        advertiserId: req.user.entityId.trim(),
      };
    } else {
      throw new ForbiddenException("CAMPAIGN_METRICS_ACCESS_DENIED");
    }

    const report = await this.verifiedMetricsService.getCampaignVerifiedStats(
      campaignId,
      from,
      to,
      access,
    );
    return { success: true, report };
  }

  /**
   * GET /api/verified-metrics/driver/:driverId — Stats de reproducción verificada por conductor
   * Query: dateFrom, dateTo (ISO strings)
   */
  @Get("driver/:driverId")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @UseGuards(TenantGuard)
  async getDriverVerifiedStats(
    @Param("driverId") driverId: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException(
        "dateFrom y dateTo deben ser fechas válidas ISO",
      );
    }

    const stats = await this.verifiedMetricsService.getDriverVerifiedStats(
      driverId,
      from,
      to,
    );
    return { success: true, stats };
  }

  /**
   * GET /api/verified-metrics/global — Resumen global de verificación
   * Query: dateFrom, dateTo (ISO strings)
   */
  @Get("global")
  @Roles(UserRole.ADMIN)
  async getGlobalSummary(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException(
        "dateFrom y dateTo deben ser fechas válidas ISO",
      );
    }

    const summary =
      await this.verifiedMetricsService.getGlobalVerificationSummary(from, to);
    return { success: true, summary };
  }

  /**
   * POST /api/verified-metrics/verify — Marcar eventos como verificados
   * Body: { eventIds: string[], verifiedBy: string }
   * Solo ADMIN
   */
  @Post("verify")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async verifyEvents(@Body() body: { eventIds: string[]; verifiedBy: string }) {
    if (
      !body.eventIds ||
      !Array.isArray(body.eventIds) ||
      body.eventIds.length === 0
    ) {
      throw new BadRequestException("eventIds array es requerido");
    }
    if (!body.verifiedBy) {
      throw new BadRequestException("verifiedBy es requerido");
    }

    const result = await this.verifiedMetricsService.verifyPlaybackEvents(
      body.eventIds,
      body.verifiedBy,
    );
    return { success: true, ...result };
  }

  /**
   * GET /api/verified-metrics/anomalies — Detectar dispositivos silenciosos
   * Query: dateFrom, dateTo (ISO strings)
   */
  @Get("anomalies")
  @Roles(UserRole.ADMIN)
  async detectAnomalies(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException(
        "dateFrom y dateTo deben ser fechas válidas ISO",
      );
    }

    const anomalies = await this.verifiedMetricsService.detectAnomalies(
      from,
      to,
    );
    return { success: true, anomalies };
  }
}
