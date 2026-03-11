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
        lat: dto.lat,
        lng: dto.lng,
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
      lat: dto.lat,
      lng: dto.lng,
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
    // Group events by deviceId and count them using the real PlaybackEvent model
    const topDevices = await this.prisma.playbackEvent.groupBy({
      by: ['deviceId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    return topDevices.map(d => ({
      device_id: d.deviceId,
      plays: d._count.id,
    }));
  }

  async getHourlyAnalytics() {
    // Get stats for the last 24 hours from PlaybackEvent
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await this.prisma.playbackEvent.findMany({
      where: {
        timestamp: { gte: last24h },
      },
      select: {
        timestamp: true,
        eventType: true,
      },
    });

    // Group by hour
    const hourlyMap = new Map<string, number>();
    // Pre-fill last 24 slots
    for (let i = 0; i < 24; i++) {
      const h = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
      hourlyMap.set(h.toString().padStart(2, '0'), 0);
    }

    events.forEach(e => {
      const hour = new Date(e.timestamp).getHours().toString().padStart(2, '0');
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, plays]) => ({ hour, plays }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  async getRecentPlays() {
    return this.prisma.playbackEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: {
        deviceId: true,
        videoId: true,
        timestamp: true,
      },
    });
  }

  // ============================================
  // QR SCAN TRACKING
  // ============================================
  async registerQrScan(campaignId: string, deviceId: string): Promise<string> {
    const DEFAULT_URL = 'https://tad.do';

    if (!campaignId || !deviceId) return DEFAULT_URL;

    try {
      // Buscamos la campaña para obtener su URL de destino
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { targetUrl: true },
      });

      // Registro del evento QR_SCAN (fire-and-forget pattern)
      await this.prisma.analyticsEvent.create({
        data: {
          eventType: 'QR_SCAN',
          campaignId,
          deviceId,
          eventData: JSON.stringify({ source: 'qr_redirect' }),
          occurredAt: new Date(),
        },
      });

      this.logger.log(`📱 QR Scan registrado — Campaign: ${campaignId}, Device: ${deviceId}`);

      return campaign?.targetUrl || DEFAULT_URL;
    } catch (error) {
      this.logger.error(`Error registrando QR scan: ${error.message}`);
      return DEFAULT_URL;
    }
  }

  // ============================================
  // EXTERNAL MOBILE GPS GATEWAY
  // ============================================
  async updateDeviceLocationFromMobile(data: { deviceId: string; lat: number; lng: number }) {
    this.logger.log(`🛰️ Mobile GPS Update for Device: ${data.deviceId} (${data.lat}, ${data.lng})`);
    
    return this.prisma.device.update({
      where: { deviceId: data.deviceId },
      data: {
        lastLat: data.lat,
        lastLng: data.lng,
        lastSync: new Date(),
        isOnline: true // Marcamos como online porque el chofer está activo
      },
    });
  }
}
