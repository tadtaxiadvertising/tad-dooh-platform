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
  BadRequestException,
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

  // Missing advertiser ownership context must never become an unscoped
  // cross-tenant query. Admin access remains intentionally unrestricted.
  private advertiserScope(req: AuthenticatedRequest): string | undefined {
    if (req.user.role !== UserRole.ADVERTISER) return undefined;
    const entityId = req.user.entityId;
    if (typeof entityId !== "string" || entityId.trim().length === 0) {
      throw new ForbiddenException(
        "Cuenta de anunciante sin identificador válido",
      );
    }
    return entityId;
  }

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

    // A permanent 301 can be cached and bypass future scan measurement.
    // The QR URL is a tracking hop, not a permanently relocated resource.
    res.set({
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    });
    return res.redirect(HttpStatus.FOUND, targetUrl);
  }

  // Public ingest has no DTO class at runtime. Reject structurally invalid
  // payloads before any DB write: a successful ACK can clear an offline queue.
  private assertIngestEventShape(value: unknown, allowLegacyType: boolean) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException("Invalid analytics event");
    }
    const event = value as Record<string, unknown>;
    // Match the service's existing type || eventType precedence exactly.
    const kind = allowLegacyType
      ? event.type || event.eventType
      : event.eventType;
    if (
      typeof event.deviceId !== "string" ||
      !event.deviceId.trim() ||
      typeof kind !== "string" ||
      !kind.trim()
    ) {
      throw new BadRequestException("Invalid analytics event");
    }
  }

  @Public() // Tablets send events without JWT
  @Post("event")
  @HttpCode(HttpStatus.OK)
  async ingestEvent(
    @Body() dto: Parameters<AnalyticsService["ingestEvent"]>[0],
  ) {
    this.assertIngestEventShape(dto, false);
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
    // Preserve raw-array and { events: [...] } forms. Never interpret a
    // missing/malformed events field as an empty, successfully synced batch.
    const events = Array.isArray(body) ? body : body?.events;
    if (!Array.isArray(events)) {
      throw new BadRequestException("Analytics batch must be an array");
    }
    for (const event of events) {
      this.assertIngestEventShape(event, true);
    }
    await this.analyticsService.ingestBatchEvents(events);
    return { success: true };
  }

  @Get("campaign/:id")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getCampaignAnalytics(
    @Param("id") campaignId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { role, entityId } = req.user;
    // The global RolesGuard limits this route to ADMIN / ADVERTISER.
    // A logged-in advertiser may only read metrics for their own campaign.
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
    const advertiserId = this.advertiserScope(req);
    return this.analyticsService.getAnalyticsSummary(advertiserId);
  }

  @Get("total-impressions")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getTotalImpressions(@Req() req: AuthenticatedRequest) {
    const advertiserId = this.advertiserScope(req);
    return this.analyticsService.getTotalImpressions(advertiserId);
  }

  @Get("anti-fraud")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getAntiFraudMetrics(@Req() req: AuthenticatedRequest) {
    const advertiserId = this.advertiserScope(req);
    return this.analyticsService.getAntiFraudMetrics(advertiserId);
  }

  @Get("top-taxis")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getTopTaxis(@Req() req: AuthenticatedRequest) {
    const advertiserId = this.advertiserScope(req);
    return this.analyticsService.getTopTaxis(advertiserId);
  }

  @Get("hourly")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getHourlyAnalytics(@Req() req: AuthenticatedRequest) {
    const advertiserId = this.advertiserScope(req);
    return this.analyticsService.getHourlyAnalytics(advertiserId);
  }

  @Get("recent-plays")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getRecentPlays(@Req() req: AuthenticatedRequest) {
    const advertiserId = this.advertiserScope(req);
    return this.analyticsService.getRecentPlays(advertiserId);
  }

  @Get("heatmap")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getHeatmap(
    @Query("advertiserId") advertiserId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const finalAdvertiserId =
      req.user.role === UserRole.ADVERTISER
        ? this.advertiserScope(req)
        : advertiserId;
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
