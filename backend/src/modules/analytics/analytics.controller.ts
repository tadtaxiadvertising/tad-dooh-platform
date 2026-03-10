import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { PlaybackEventDto } from './dto/playback-event.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
  async ingestBatchEvents(@Body() dto: any[]) {
    await this.analyticsService.ingestBatchEvents(dto);
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
}
