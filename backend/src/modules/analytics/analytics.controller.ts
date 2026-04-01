import { Controller, Post, Get, Param, Body, Query, Res, HttpCode, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { InvoiceService } from '../finance/invoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly whatsappService: WhatsAppService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post('campaign/:id/share-whatsapp')
  async shareReportByWhatsApp(
    @Param('id') id: string,
    @Body() body: { phone: string; advertiserName: string; campaignName: string; reportUrl: string }
  ) {
    return this.whatsappService.sendImpactReport(
      body.phone,
      body.advertiserName,
      body.campaignName,
      body.reportUrl
    );
  }


  // ============================================
  // QR SCAN TRACKING — Redirect Proxy
  // ============================================
  @Public() // El celular del pasajero no requiere JWT
  @Get('qr-scan')
  async trackQrScan(
    @Query('campaignId') campaignId: string,
    @Query('deviceId') deviceId: string,
    @Res() res: Response
  ) {
    // 1. Registrar el evento en segundo plano (no bloquea el redirect)
    const targetUrl = await this.analyticsService.registerQrScan(campaignId, deviceId);

    // 2. Redirigir al destino final de la marca
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, targetUrl);
  }

  @Public() // Tablets send events without JWT
  @Post('event')
  @HttpCode(HttpStatus.OK)
  async ingestEvent(@Body() dto: any) {
    await this.analyticsService.ingestEvent(dto);
    return { success: true };
  }

  @Public() // Tablets batch-upload analytics without JWT
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async ingestBatchEvents(@Body() body: any) {
    const events = Array.isArray(body) ? body : (body.events || []);
    await this.analyticsService.ingestBatchEvents(events);
    return { success: true };
  }

  @Get('campaign/:id')
  async getCampaignAnalytics(@Param('id') campaignId: string) {
    return this.analyticsService.getCampaignAnalytics(campaignId);
  }

  @Get('device/:id')
  async getDeviceAnalytics(@Param('id') deviceId: string) {
    return this.analyticsService.getDeviceAnalytics(deviceId);
  }

  @Get('summary')
  async getAnalyticsSummary() {
    return this.analyticsService.getAnalyticsSummary();
  }

  @Get('top-taxis')
  async getTopTaxis() {
    return this.analyticsService.getTopTaxis();
  }

  @Get('hourly')
  async getHourlyAnalytics() {
    return this.analyticsService.getHourlyAnalytics();
  }

  @Get('recent-plays')
  async getRecentPlays() {
    return this.analyticsService.getRecentPlays();
  }

  @Get('heatmap')
  async getHeatmap() {
    return this.analyticsService.getPlaybackHeatmap();
  }

  @Get('campaign/:id/weekly')
  async getWeeklyCampaignAnalytics(@Param('id') campaignId: string) {
    return this.analyticsService.getWeeklyCampaignMetrics(campaignId);
  }

  @Get('campaign/:id/weekly/pdf')
  async downloadWeeklyPdf(@Param('id') id: string, @Res() res: Response) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).send('Campaña no encontrada');

    const data = await this.analyticsService.getWeeklyCampaignMetrics(id);
    const pdf = await this.invoiceService.generateWeeklyPerformancePDF(campaign, data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Reporte_Semanal_${campaign.name}.pdf`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Public() // El celular del chofer no tiene el JWT del admin dashboard
  @Post('external-gps')
  @HttpCode(HttpStatus.OK)
  async trackExternalGps(@Body() data: { deviceId: string; lat: number; lng: number; speed?: number; driverId?: string }) {
    await this.analyticsService.updateDeviceLocationFromMobile(data);
    return { success: true };
  }
}
