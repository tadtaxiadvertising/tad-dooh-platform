import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlaybackEventDto } from './dto/playback-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingestEvent(dto: any) {
    this.logger.log(`Ingesting analytics event for device: ${dto.deviceId}`);
    
    // Ensure device exists
    let device = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (!device) {
      device = await this.prisma.device.create({
        data: {
          deviceId: dto.deviceId,
          status: 'ACTIVE',
          lastSeen: new Date(),
        },
      });
    }

    return this.prisma.analyticsEvent.create({
      data: {
        deviceId: dto.deviceId,
        campaignId: dto.campaignId,
        eventType: dto.eventType,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        occurredAt: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        processed: false
      },
    });
  }

  async ingestBatchEvents(dtos: any[]) {
    this.logger.log(`Ingesting ${dtos.length} analytics events in batch.`);
    const processedEvents = dtos.map(dto => ({
      deviceId: dto.deviceId,
      campaignId: dto.campaignId,
      eventType: dto.eventType,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      occurredAt: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      processed: false
    }));

    await this.prisma.analyticsEvent.createMany({
      data: processedEvents,
    });
    
    return { count: processedEvents.length };
  }

  async getCampaignAnalytics(campaignId: string) {
    const totalEvents = await this.prisma.analyticsEvent.count({
      where: { campaignId }
    });

    return { campaignId, totalEvents };
  }

  async getDeviceAnalytics(deviceId: string) {
    const totalEvents = await this.prisma.analyticsEvent.count({
      where: { deviceId }
    });
    
    return { deviceId, totalEvents };
  }

  async getAnalyticsSummary() {
    const totalEvents = await this.prisma.analyticsEvent.count();
    return { totalEvents };
  }

  async getTopTaxis() {
    // Group events by deviceId and count them
    const topDevices = await this.prisma.analyticsEvent.groupBy({
      by: ['deviceId'],
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          deviceId: 'desc',
        },
      },
      take: 5,
    });

    return topDevices.map(d => ({
      device_id: d.deviceId,
      plays: d._count._all,
    }));
  }

  async getHourlyAnalytics() {
    return [
      { hour: '00', plays: 120 },
      { hour: '04', plays: 80 },
      { hour: '08', plays: 450 },
      { hour: '12', plays: 890 },
      { hour: '16', plays: 1100 },
      { hour: '20', plays: 750 },
      { hour: '23', plays: 300 },
    ];
  }
}
