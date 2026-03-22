import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  
  // Minimal in-memory cache for high-frequency dashboard data
  private cache: {
    summary?: { data: any; expiry: number };
    topTaxis?: { data: any; expiry: number };
    hourly?: { data: any; expiry: number };
  } = {};

  private readonly CACHE_TTL = 30000; // 30 seconds
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

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

    // Alertas Críticas (Conexión Alertas -> Notificaciones)
    if (['low_battery', 'sync_failed', 'storage_fail'].includes(dto.eventType)) {
       await this.notifications.createAlert({
         title: `Alerta Técnica: ${dto.eventType.toUpperCase()}`,
         message: `El dispositivo ${dto.deviceId} reportó un evento crítico.`,
         type: 'CRITICAL',
         category: 'DEVICE',
         entityId: dto.deviceId
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
    if (!dtos || dtos.length === 0) {
      return { count: 0 };
    }

    this.logger.log(`Ingesting ${dtos.length} analytics events in batch.`);
    const processedEvents = dtos.map(dto => ({
      deviceId: dto.deviceId,
      campaignId: dto.campaignId,
      eventType: dto.type || dto.eventType, // Support both formats
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : (dto.timestamp ? new Date(dto.timestamp) : new Date()),
      lat: dto.lat,
      lng: dto.lng,
      processed: false
    }));

    await this.prisma.analyticsEvent.createMany({
      data: processedEvents as any,
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
    const now = Date.now();
    if (this.cache.summary && this.cache.summary.expiry > now) {
      return this.cache.summary.data;
    }

    const totalImpressions = await this.prisma.playbackEvent.count({
      where: { eventType: 'play_confirm' }
    });
    
    const uniqueNodes = await this.prisma.playbackEvent.groupBy({
      by: ['deviceId'],
      _count: { deviceId: true }
    });

    const totalScans = await this.prisma.analyticsEvent.count({
      where: { eventType: 'QR_SCAN' }
    });

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentImpressions = await this.prisma.playbackEvent.count({
      where: { timestamp: { gte: last24h }, eventType: 'play_confirm' }
    });

    const data = { 
      totalImpressions, 
      activeNodes: uniqueNodes.length,
      totalScans,
      ctr: totalImpressions > 0 ? (totalScans / totalImpressions) * 100 : 0,
      hourlyAverage: Math.round(recentImpressions / 24)
    };

    this.cache.summary = { data, expiry: now + this.CACHE_TTL };
    return data;
  }

  async getTopTaxis() {
    const now = Date.now();
    if (this.cache.topTaxis && this.cache.topTaxis.expiry > now) {
      return this.cache.topTaxis.data;
    }

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

    const data = topDevices.map(d => ({
      device_id: d.deviceId,
      plays: d._count.id,
    }));

    this.cache.topTaxis = { data, expiry: now + this.CACHE_TTL };
    return data;
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
    const events = await this.prisma.playbackEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        device: {
          select: { taxiNumber: true }
        }
      }
    });
    
    return events.map(e => ({
      deviceId: e.deviceId,
      videoId: e.videoId,
      timestamp: e.timestamp,
      taxiNumber: e.device?.taxiNumber
    }));
  }

  /**
   * Heatmap of where ads are being played
   */
  async getPlaybackHeatmap() {
    this.logger.log('Generating playback heatmap data');
    
    // Get last 15 days of confirmed playback events with geography
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const locations = await this.prisma.playbackEvent.findMany({
      where: {
        timestamp: { gte: fifteenDaysAgo },
        lat: { not: null },
        lng: { not: null }
      },
      select: {
        lat: true,
        lng: true,
      },
      take: 2000 // Sample size limit
    });

    return locations.map(loc => ({
      lat: loc.lat,
      lng: loc.lng,
      weight: 1.0 // Intensity
    }));
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
  /**
   * Obtiene métricas semanales detalladas (día por día) para una campaña.
   */
  async getWeeklyCampaignMetrics(campaignId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await this.prisma.playbackEvent.findMany({
      where: {
        campaignId,
        timestamp: { gte: sevenDaysAgo },
        eventType: 'play_confirm'
      },
      select: { timestamp: true }
    });

    const dailyData: Record<string, number> = {};
    // Inicializar últimos 7 días con 0
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyData[d.toLocaleDateString('es-DO')] = 0;
    }

    events.forEach(e => {
      const day = new Date(e.timestamp).toLocaleDateString('es-DO');
      if (dailyData[day] !== undefined) {
        dailyData[day]++;
      }
    });

    return Object.entries(dailyData)
      .map(([day, impressions]) => ({ day, impressions }))
      .reverse(); // De más antiguo a más reciente
  }
}
