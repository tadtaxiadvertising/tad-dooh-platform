import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { assertNoDeviceHardwareUuidAlias } from "../device/device-identity-collision.guard";
import { Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { createUmamiClient } from "../../utils/umami";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

// Passenger QR destinations come from campaign data. Redirect only to
// ordinary web URLs; never pass arbitrary schemes or credentials to Express.
// This does not authorize the campaign or verify ownership of the domain.
const QR_FALLBACK_URL = "https://tad.do";

export function safeQrDestinationUrl(value: string | null | undefined): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2048 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return QR_FALLBACK_URL;
  }

  try {
    const target = new URL(value);
    if (
      (target.protocol !== "http:" && target.protocol !== "https:") ||
      !target.hostname ||
      target.username ||
      target.password
    ) {
      return QR_FALLBACK_URL;
    }
    return target.toString();
  } catch {
    return QR_FALLBACK_URL;
  }
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  // Minimal in-memory cache for high-frequency dashboard data
  private cache: {
    summary?: { data: AnalyticsSummary; expiry: number };
    topTaxis?: { data: TopTaxi[]; expiry: number };
    hourly?: { data: HourlyData[]; expiry: number };
    totalImpressions?: { data: number; expiry: number };
    antiFraud?: { data: AntiFraudData; expiry: number };
    [key: `summary_${string}`]:
      { data: AnalyticsSummary; expiry: number } | undefined;
    [key: `totalImpressions_${string}`]:
      { data: number; expiry: number } | undefined;
    [key: `antiFraud_${string}`]:
      { data: AntiFraudData; expiry: number } | undefined;
    [key: `topTaxis_${string}`]:
      { data: TopTaxi[]; expiry: number } | undefined;
  } = {};

  // Public device identifiers are untrusted. Bound both entry count and
  // cached identifier length so a long-lived API process cannot accumulate
  // unlimited distinct IDs in memory. Eviction only restores a DB lookup.
  private deviceExistsCache = new Set<string>();
  private readonly MAX_CACHED_DEVICE_IDS = 10_000;
  private readonly MAX_CACHED_DEVICE_ID_LENGTH = 128;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Clears all in-memory analytics caches to ensure fresh data
   */
  clearCache() {
    this.logger.log("🧹 Limpiando caché de analíticas...");
    this.cache = {};
    this.deviceExistsCache.clear();
  }

  private rememberKnownDevice(deviceId: string) {
    if (deviceId.length > this.MAX_CACHED_DEVICE_ID_LENGTH) return;

    // Set insertion order forms a small LRU: refresh active devices and
    // evict only stale *cache entries*, never database/device records.
    this.deviceExistsCache.delete(deviceId);
    this.deviceExistsCache.add(deviceId);
    if (this.deviceExistsCache.size > this.MAX_CACHED_DEVICE_IDS) {
      const oldest = this.deviceExistsCache.values().next().value;
      if (oldest !== undefined) this.deviceExistsCache.delete(oldest);
    }
  }

  async ingestEvent(dto: IngestEventDto) {
    // 🔥 Optimization: Skip DB check if we already know this device exists in this session
    if (!this.deviceExistsCache.has(dto.deviceId)) {
      let device = await this.prisma.device.findUnique({
        where: { deviceId: dto.deviceId },
      });

      if (!device) {
        await assertNoDeviceHardwareUuidAlias(this.prisma, dto.deviceId);
        try {
          device = await this.prisma.device.create({
            data: {
              deviceId: dto.deviceId,
              // Events are unauthenticated telemetry, not administrator approval.
              // Preserve the event, but keep unknown hardware pending enrollment.
              status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
              lastSeen: new Date(),
            },
          });
        } catch (error) {
          // Concurrent first events can race on the unique deviceId.
          // Reconcile only P2002 and only if the device now exists.
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== "P2002"
          ) {
            throw error;
          }
          device = await this.prisma.device.findUnique({
            where: { deviceId: dto.deviceId },
          });
          if (!device) throw error;
          this.logger.warn("ANALYTICS_DEVICE_ENROLLMENT_RACE_RECONCILED");
        }
      }
      this.rememberKnownDevice(dto.deviceId);
    } else {
      // Keep frequently reporting tablets in cache at fleet scale.
      this.rememberKnownDevice(dto.deviceId);
    }

    // Alertas Críticas (Conexión Alertas -> Notificaciones)
    if (
      ["low_battery", "sync_failed", "storage_fail"].includes(dto.eventType)
    ) {
      await this.notifications.createAlert({
        title: `Alerta Técnica: ${dto.eventType.toUpperCase()}`,
        message: `El dispositivo ${dto.deviceId} reportó un evento crítico.`,
        type: "CRITICAL",
        category: "DEVICE",
        entityId: dto.deviceId,
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
        processed: false,
      },
    });
  }

  async ingestBatchEvents(dtos: IngestEventDto[]) {
    if (!dtos || dtos.length === 0) {
      return { count: 0 };
    }

    this.logger.log(`Ingesting ${dtos.length} analytics events in batch.`);
    const processedEvents = dtos.map((dto) => ({
      deviceId: dto.deviceId,
      campaignId: dto.campaignId,
      eventType: dto.type || dto.eventType, // Support both formats
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      occurredAt: dto.occurredAt
        ? new Date(dto.occurredAt)
        : dto.timestamp
          ? new Date(dto.timestamp)
          : new Date(),
      lat: dto.lat,
      lng: dto.lng,
      processed: false,
    }));

    await this.prisma.analyticsEvent.createMany({
      data: processedEvents,
    });

    return { count: processedEvents.length };
  }

  async getCampaignAnalytics(campaignId: string) {
    const totalEvents = await this.prisma.analyticsEvent.count({
      where: { campaignId },
    });

    return { campaignId, totalEvents };
  }

  async getDeviceAnalytics(deviceId: string) {
    const totalEvents = await this.prisma.analyticsEvent.count({
      where: { deviceId },
    });

    return { deviceId, totalEvents };
  }

  async getAnalyticsSummary(advertiserId?: string) {
    const now = Date.now();
    // Use a different cache key if advertiserId is provided
    const cacheKey: "summary" | `summary_${string}` = advertiserId
      ? `summary_${advertiserId}`
      : "summary";
    if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
      return this.cache[cacheKey].data;
    }

    const videoIds = advertiserId
      ? await this.getAdvertiserVideoIds(advertiserId)
      : null;

    const [impressionBuckets, uniqueNodesCount, totalScans, recentImpressions] =
      await Promise.all([
        // One DB snapshot separates verified PoP from raw device events,
        // without changing the legacy totalImpressions/CTR contract.
        this.prisma.playbackEvent.groupBy({
          by: ["verified"],
          where: {
            eventType: "play_confirm",
            ...(videoIds ? { videoId: { in: videoIds } } : {}),
          },
          _count: { _all: true },
        }),
        this.prisma.playbackEvent.groupBy({
          by: ["deviceId"],
          where: {
            eventType: "play_confirm",
            ...(videoIds ? { videoId: { in: videoIds } } : {}),
          },
          _count: { deviceId: true },
        }),
        this.prisma.analyticsEvent.count({
          where: {
            eventType: { in: ["QR_SCAN", "qr_scan", "scan"] },
            ...(advertiserId ? { campaign: { advertiserId } } : {}),
          },
        }),
        this.prisma.playbackEvent.count({
          where: {
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            eventType: "play_confirm",
            ...(videoIds ? { videoId: { in: videoIds } } : {}),
          },
        }),
      ]);

    // verified is non-null in PlaybackEvent; groupBy ensures these totals
    // come from the same SQL snapshot (unlike concurrent count queries).
    const verifiedImpressions =
      impressionBuckets.find((bucket) => bucket.verified)?._count._all ?? 0;
    const unverifiedImpressions =
      impressionBuckets.find((bucket) => !bucket.verified)?._count._all ?? 0;
    const totalImpressions = verifiedImpressions + unverifiedImpressions;

    const data = {
      totalImpressions, // Legacy raw count: preserve backwards compatibility.
      verifiedImpressions,
      unverifiedImpressions,
      impressionMetricBasis: "raw" as const,
      activeNodes: uniqueNodesCount.length,
      totalScans,
      ctr: totalImpressions > 0 ? (totalScans / totalImpressions) * 100 : 0,
      hourlyAverage: Math.round(recentImpressions / 24),
    };

    this.cache[cacheKey] = { data, expiry: now + this.CACHE_TTL };
    return data;
  }

  private async getAdvertiserVideoIds(advertiserId: string): Promise<string[]> {
    const [videos, assets] = await Promise.all([
      this.prisma.video.findMany({
        where: { campaign: { advertiserId } },
        select: { id: true },
      }),
      this.prisma.mediaAsset.findMany({
        where: { campaign: { advertiserId } },
        select: { id: true },
      }),
    ]);
    return [...videos.map((v) => v.id), ...assets.map((a) => a.id)];
  }

  async getTotalImpressions(advertiserId?: string) {
    const now = Date.now();
    const cacheKey: "totalImpressions" | `totalImpressions_${string}` =
      advertiserId ? `totalImpressions_${advertiserId}` : "totalImpressions";
    if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
      return this.cache[cacheKey].data;
    }

    const videoIds = advertiserId
      ? await this.getAdvertiserVideoIds(advertiserId)
      : null;

    const count = await this.prisma.playbackEvent.count({
      where: {
        eventType: "play_confirm",
        ...(videoIds ? { videoId: { in: videoIds } } : {}),
      },
    });

    this.cache[cacheKey] = {
      data: count,
      expiry: now + this.CACHE_TTL,
    };
    return count;
  }

  async getAntiFraudMetrics(advertiserId?: string) {
    const now = Date.now();
    const cacheKey: "antiFraud" | `antiFraud_${string}` = advertiserId
      ? `antiFraud_${advertiserId}`
      : "antiFraud";
    if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
      return this.cache[cacheKey].data;
    }

    const videoIds = advertiserId
      ? await this.getAdvertiserVideoIds(advertiserId)
      : null;

    const [rawImpressions, gpsValidations] = await Promise.all([
      this.prisma.playbackEvent.count({
        where: {
          eventType: "play_confirm",
          ...(videoIds ? { videoId: { in: videoIds } } : {}),
        },
      }),
      this.prisma.playbackEvent.count({
        where: {
          eventType: "play_confirm",
          lat: { not: null },
          lng: { not: null },
          ...(videoIds ? { videoId: { in: videoIds } } : {}),
        },
      }),
    ]);

    const validPercentage =
      rawImpressions > 0
        ? Math.round((gpsValidations / rawImpressions) * 100)
        : 0;

    const data = {
      rawImpressions,
      gpsValidations,
      validPercentage,
      status:
        validPercentage >= 90
          ? "EXCELENTE"
          : validPercentage >= 75
            ? "ACEPTABLE"
            : "ALTO RIESGO",
    };

    this.cache[cacheKey] = { data, expiry: now + this.CACHE_TTL };
    return data;
  }

  async getTopTaxis(advertiserId?: string) {
    const now = Date.now();
    const cacheKey: "topTaxis" | `topTaxis_${string}` = advertiserId
      ? `topTaxis_${advertiserId}`
      : "topTaxis";
    if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
      return this.cache[cacheKey].data;
    }

    const videoIds = advertiserId
      ? await this.getAdvertiserVideoIds(advertiserId)
      : null;

    const topDevices = await this.prisma.playbackEvent.groupBy({
      by: ["deviceId"],
      where: {
        eventType: "play_confirm",
        ...(videoIds ? { videoId: { in: videoIds } } : {}),
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const data = topDevices.map((d) => ({
      device_id: d.deviceId,
      plays: d._count.id,
    }));

    this.cache[cacheKey] = { data, expiry: now + this.CACHE_TTL };
    return data;
  }

  async getHourlyAnalytics(advertiserId?: string) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const videoIds = advertiserId
      ? await this.getAdvertiserVideoIds(advertiserId)
      : [];

    // Using Raw SQL for grouped aggregation on PostgreSQL
    // If videoIds is provided, we filter by it
    let results: Array<{ hour: number; plays: number }> = [];

    if (advertiserId && videoIds.length > 0) {
      results = await this.prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "timestamp") as "hour",
          COUNT(id)::int as "plays"
        FROM "playback_events"
        WHERE "timestamp" >= ${last24h} AND "video_id" IN (${Prisma.join(videoIds)})
        GROUP BY 1
      `;
    } else if (advertiserId && videoIds.length === 0) {
      // If advertiser has no videos, they have no plays
      results = [];
    } else {
      results = await this.prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "timestamp") as "hour",
          COUNT(id)::int as "plays"
        FROM "playback_events"
        WHERE "timestamp" >= ${last24h}
        GROUP BY 1
      `;
    }

    // Pre-fill last 24 slots with base 0
    const hourlyMap = new Map<string, number>();
    for (let i = 0; i < 24; i++) {
      const h = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
      hourlyMap.set(h.toString().padStart(2, "0"), 0);
    }

    // Overlay values from Database Group By
    results.forEach((row) => {
      const h = Number(row.hour).toString().padStart(2, "0");
      hourlyMap.set(h, row.plays);
    });

    return Array.from(hourlyMap.entries())
      .map(([hour, plays]) => ({ hour, plays }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  async getRecentPlays(advertiserId?: string) {
    const videoIds = advertiserId
      ? await this.getAdvertiserVideoIds(advertiserId)
      : null;

    const events = await this.prisma.playbackEvent.findMany({
      where: {
        ...(videoIds ? { videoId: { in: videoIds } } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: 20,
      include: {
        device: {
          select: { taxiNumber: true },
        },
      },
    });

    return events.map((e) => ({
      deviceId: e.deviceId,
      videoId: e.videoId,
      timestamp: e.timestamp,
      taxiNumber: e.device?.taxiNumber,
    }));
  }

  /**
   * Heatmap of where ads are being played
   */
  async getPlaybackHeatmap(advertiserId?: string) {
    this.logger.log(
      `Generating playback heatmap data${advertiserId ? ` for advertiser: ${advertiserId}` : ""}`,
    );

    // Get last 15 days of confirmed playback events with geography
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const where: {
      timestamp: { gte: Date };
      lat: { not: null };
      lng: { not: null };
      videoId?: { in: string[] };
    } = {
      timestamp: { gte: fifteenDaysAgo },
      lat: { not: null },
      lng: { not: null },
    };

    if (advertiserId) {
      // 1. Get all campaign video/asset IDs for this advertiser
      const [videos, assets] = await Promise.all([
        this.prisma.video.findMany({
          where: { campaign: { advertiserId } },
          select: { id: true },
        }),
        this.prisma.mediaAsset.findMany({
          where: { campaign: { advertiserId } },
          select: { id: true },
        }),
      ]);

      const videoIds = [...videos.map((v) => v.id), ...assets.map((a) => a.id)];
      where.videoId = { in: videoIds };
    }

    // A16: heatmap agregado por celda geográfica en SQL (bucket ~0.002° ≈ 200m)
    // en lugar de cargar 10.000 playbacks en RAM. Solo playbacks VERIFICADOS.
    // Multiplicamos por 1e6 para redondear con precisión entera (evita drift de centroide).
    const bucketRaw = await this.prisma.$queryRaw<
      { lat: number; lng: number; cnt: number }[]
    >`
      SELECT
        (ROUND(lat * 500) / 500)  AS lat,
        (ROUND(lng * 500) / 500)  AS lng,
        COUNT(*)::int             AS cnt
      FROM playback_events
      WHERE
        event_type = 'play_confirm'
        AND verified = true
        AND timestamp >= ${where.timestamp.gte}
        AND lat IS NOT NULL
        AND lng IS NOT NULL
        ${where.videoId ? Prisma.sql`AND video_id IN (${Prisma.join(where.videoId.in)})` : Prisma.empty}
      GROUP BY 1, 2
      ORDER BY cnt DESC
      LIMIT 2000
    `;

    return bucketRaw.map((b) => ({
      lat: b.lat,
      lng: b.lng,
      weight: b.cnt,
    }));
  }

  // ============================================
  // QR SCAN TRACKING
  // ============================================
  async registerQrScan(campaignId: string, deviceId: string): Promise<string> {
    if (!campaignId || !deviceId) return QR_FALLBACK_URL;

    // Resolve and validate the destination first. An analytics write failure
    // must never replace an already-validated advertiser offer with the TAD
    // fallback, but an unavailable campaign lookup must still fail closed.
    let destination: string;
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { targetUrl: true },
      });
      if (!campaign) return QR_FALLBACK_URL;
      destination = safeQrDestinationUrl(campaign.targetUrl);
    } catch {
      // Never log untrusted query identifiers or raw DB error details.
      this.logger.warn("QR campaign lookup failed; using safe fallback");
      return QR_FALLBACK_URL;
    }

    // Best-effort measurement, awaited for durability while the DB is healthy.
    // Scans must not be reported as persisted if the database rejects the event.
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          eventType: "QR_SCAN",
          campaignId,
          deviceId,
          eventData: JSON.stringify({ source: "qr_redirect" }),
          occurredAt: new Date(),
        },
      });
      this.logger.log("QR scan event persisted");
    } catch {
      this.logger.warn("QR scan persistence failed; preserving destination");
    }

    return destination;
  }

  // ============================================
  // EXTERNAL MOBILE GPS GATEWAY
  // ============================================
  async updateDeviceLocationFromMobile(data: {
    deviceId: string;
    lat: number;
    lng: number;
    speed?: number;
  }) {
    this.logger.log(
      `🛰️ Mobile GPS Update for Device: ${data.deviceId} (${data.lat}, ${data.lng})`,
    );

    // 1. Get device to check if it has a driver
    const device = await this.prisma.device.findUnique({
      where: { deviceId: data.deviceId },
      select: { driverId: true },
    });

    const now = new Date();

    // 2. If it has a driver, save the GPS trail
    if (device?.driverId) {
      await this.prisma.driverLocation.create({
        data: {
          deviceId: data.deviceId,
          driverId: device.driverId,
          latitude: data.lat,
          longitude: data.lng,
          speed: data.speed || 0,
          timestamp: now,
        },
      });
    }

    // 3. Update the device's current location and online status
    return this.prisma.device.update({
      where: { deviceId: data.deviceId },
      data: {
        lastLat: data.lat,
        lastLng: data.lng,
        lastSeen: now, // Updates lastSeen for Fleet tracking to register it online
        lastSync: now,
        isOnline: true, // We mark it online since the driver app is active
      },
    });
  }
  /**
   * Obtiene métricas semanales detalladas (día por día) para una campaña.
   */
  async getWeeklyCampaignMetrics(campaignId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Obtener IDs de videos ligados a la campaña (buscamos en ambas tablas v1 y v2)
    const [videos, assets] = await Promise.all([
      this.prisma.video.findMany({
        where: { campaignId },
        select: { id: true },
      }),
      this.prisma.mediaAsset.findMany({
        where: { campaignId },
        select: { id: true },
      }),
    ]);
    const videoIds = [...videos.map((v) => v.id), ...assets.map((a) => a.id)];

    // 1. Obtener Impresiones (play_confirm) filtradas por esos videos
    const playEvents = await this.prisma.playbackEvent.findMany({
      where: {
        videoId: { in: videoIds },
        timestamp: { gte: sevenDaysAgo },
        eventType: "play_confirm",
      },
      select: { timestamp: true },
    });

    // 2. Obtener Escaneos QR (QR_SCAN) - Esto sí tiene campaignId en el modelo AnalyticsEvent
    const scanEvents = await this.prisma.analyticsEvent.findMany({
      where: {
        campaignId,
        occurredAt: { gte: sevenDaysAgo },
        eventType: "QR_SCAN",
      },
      select: { occurredAt: true },
    });

    const dailyData: Record<string, { impressions: number; scans: number }> =
      {};
    // Inicializar últimos 7 días con 0
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyData[d.toLocaleDateString("es-DO")] = { impressions: 0, scans: 0 };
    }

    playEvents.forEach((e) => {
      const day = new Date(e.timestamp).toLocaleDateString("es-DO");
      if (dailyData[day]) dailyData[day].impressions++;
    });

    scanEvents.forEach((e) => {
      const day = new Date(e.occurredAt).toLocaleDateString("es-DO");
      if (dailyData[day]) dailyData[day].scans++;
    });

    return Object.entries(dailyData)
      .map(([day, stats]) => ({
        day,
        impressions: stats.impressions,
        scans: stats.scans,
        ctr:
          stats.impressions > 0 ? (stats.scans / stats.impressions) * 100 : 0,
      }))
      .reverse(); // De más antiguo a más reciente
  }

  async getExternalWebStats(websiteId: string) {
    const umami = createUmamiClient();
    if (!umami || !websiteId) return null;

    const now = Date.now();
    const startAt = now - 30 * 24 * 60 * 60 * 1000; // Last 30 days

    return umami.getWebsiteStats(websiteId, startAt, now);
  }
}

export interface AnalyticsSummary {
  totalImpressions: number;
  verifiedImpressions: number;
  unverifiedImpressions: number;
  impressionMetricBasis: "raw";
  activeNodes: number;
  totalScans: number;
  ctr: number;
  hourlyAverage: number;
}

export interface TopTaxi {
  device_id: string;
  plays: number;
}

export interface HourlyData {
  hour: string;
  plays: number;
}

export interface AntiFraudData {
  rawImpressions: number;
  gpsValidations: number;
  validPercentage: number;
  status: string;
}

export interface IngestEventDto {
  deviceId: string;
  campaignId?: string;
  eventType: string;
  type?: string;
  timestamp?: string | Date;
  occurredAt?: string | Date;
  lat?: number;
  lng?: number;
}
