import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
  ForbiddenException,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AnalyticsService } from "./analytics.service";
import { WhatsAppService } from "../notifications/whatsapp.service";
import { InvoiceService } from "../finance/invoice.service";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { Req } from "@nestjs/common";

@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post("campaign/:id/share-whatsapp")
  @Roles(UserRole.ADMIN)
  async shareReportByWhatsApp(
    @Param("id") id: string,
    @Body()
    body: {
      phone: string;
      advertiserName: string;
      campaignName: string;
      reportUrl: string;
    },
  ) {
    return this.whatsappService.sendImpactReport(
      body.phone,
      body.advertiserName,
      body.campaignName,
      body.reportUrl,
    );
  }

  // ============================================
  // QR SCAN TRACKING — Redirect Proxy
  // ============================================
  @Public() // El celular del pasajero no requiere JWT
  @Get("qr-scan")
  async trackQrScan(
    @Query("campaignId") campaignId: string,
    @Query("deviceId") deviceId: string,
    @Res() res: Response,
  ) {
    // 1. Registrar el evento en segundo plano (no bloquea el redirect)
    const targetUrl = await this.analyticsService.registerQrScan(
      campaignId,
      deviceId,
    );

    // 2. Redirigir al destino final de la marca
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, targetUrl);
  }

  @Public() // Tablets send events without JWT
  @Post("event")
  @HttpCode(HttpStatus.OK)
  async ingestEvent(
    @Body() dto: Parameters<AnalyticsService["ingestEvent"]>[0],
  ) {
    await this.analyticsService.ingestEvent(dto);
    return { success: true };
  }

  @Public() // Tablets batch-upload analytics without JWT
  @Post("batch")
  @HttpCode(HttpStatus.OK)
  async ingestBatchEvents(
    @Body()
    body:
      | Parameters<AnalyticsService["ingestBatchEvents"]>[0]
      | { events?: Parameters<AnalyticsService["ingestBatchEvents"]>[0] },
  ) {
    const events = Array.isArray(body) ? body : body.events || [];
    await this.analyticsService.ingestBatchEvents(events);
    return { success: true };
  }

  @Get("campaign/:id")
  async getCampaignAnalytics(
    @Param("id") campaignId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { role, entityId } = req.user;
    // If advertiser, we should check if they own the campaign, but for now we trust the ID if provided via frontend or handle it in service
    // For simplicity, we can just check ownership here if it's an advertiser
    if (role === UserRole.ADVERTISER) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign || campaign.advertiserId !== entityId) {
        throw new ForbiddenException(
          "No tienes permiso para ver las analíticas de esta campaña",
        );
      }
    }
    return this.analyticsService.getCampaignAnalytics(campaignId);
  }

  @Get("device/:id")
  @Roles(UserRole.ADMIN)
  async getDeviceAnalytics(@Param("id") deviceId: string) {
    return this.analyticsService.getDeviceAnalytics(deviceId);
  }

  @Get("summary")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getAnalyticsSummary(@Req() req: AuthenticatedRequest) {
    const { role, entityId } = req.user;
    const advertiserId = role === UserRole.ADVERTISER ? entityId : undefined;
    return this.analyticsService.getAnalyticsSummary(advertiserId);
  }

  @Get("total-impressions")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getTotalImpressions(@Req() req: AuthenticatedRequest) {
    const { role, entityId } = req.user;
    const advertiserId = role === UserRole.ADVERTISER ? entityId : undefined;
    return this.analyticsService.getTotalImpressions(advertiserId);
  }

  @Get("anti-fraud")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getAntiFraudMetrics(@Req() req: AuthenticatedRequest) {
    const { role, entityId } = req.user;
    const advertiserId = role === UserRole.ADVERTISER ? entityId : undefined;
    return this.analyticsService.getAntiFraudMetrics(advertiserId);
  }

  @Get("top-taxis")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getTopTaxis(@Req() req: AuthenticatedRequest) {
    const { role, entityId } = req.user;
    const advertiserId = role === UserRole.ADVERTISER ? entityId : undefined;
    return this.analyticsService.getTopTaxis(advertiserId);
  }

  @Get("hourly")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getHourlyAnalytics(@Req() req: AuthenticatedRequest) {
    const { role, entityId } = req.user;
    const advertiserId = role === UserRole.ADVERTISER ? entityId : undefined;
    return this.analyticsService.getHourlyAnalytics(advertiserId);
  }

  @Get("recent-plays")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getRecentPlays(@Req() req: AuthenticatedRequest) {
    const { role, entityId } = req.user;
    const advertiserId = role === UserRole.ADVERTISER ? entityId : undefined;
    return this.analyticsService.getRecentPlays(advertiserId);
  }

  @Get("heatmap")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getHeatmap(
    @Query("advertiserId") advertiserId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const finalAdvertiserId =
      req.user?.role === UserRole.ADVERTISER ? req.user.entityId : advertiserId;
    return this.analyticsService.getPlaybackHeatmap(finalAdvertiserId);
  }

  @Get("campaign/:id/weekly")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getWeeklyCampaignAnalytics(
    @Param("id") campaignId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (req.user?.role === UserRole.ADVERTISER) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign || campaign.advertiserId !== req.user.entityId) {
        throw new ForbiddenException(
          "No tienes permiso para ver las analíticas de esta campaña",
        );
      }
    }
    return this.analyticsService.getWeeklyCampaignMetrics(campaignId);
  }

  @Get("campaign/:id/weekly/pdf")
  @Roles(UserRole.ADMIN)
  async downloadWeeklyPdf(@Param("id") id: string, @Res() res: Response) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).send("Campaña no encontrada");

    const data = await this.analyticsService.getWeeklyCampaignMetrics(id);
    const pdf = await this.invoiceService.generateWeeklyPerformancePDF(
      campaign,
      data,
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Reporte_Semanal_${campaign.name}.pdf`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  // Device JWT is separate from Supabase portal JWT; require possession
  // of an authorized DEVICE_AUTH token for this specific hardware device.
  @Public()
  @UseGuards(DeviceTokenGuard)
  @Post("external-gps")
  @HttpCode(HttpStatus.OK)
  async trackExternalGps(
    @Body()
    data: {
      deviceId: string;
      lat: number;
      lng: number;
      speed?: number;
      driverId?: string;
    },
  ) {
    await this.analyticsService.updateDeviceLocationFromMobile(data);
    return { success: true };
  }
}
