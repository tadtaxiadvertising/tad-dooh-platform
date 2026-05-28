"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const umami_1 = require("../../utils/umami");
const business_rules_1 = require("../../common/constants/business-rules");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new common_1.Logger(AnalyticsService_1.name);
        this.cache = {};
        this.deviceExistsCache = new Set();
        this.CACHE_TTL = 30000;
    }
    clearCache() {
        this.logger.log('🧹 Limpiando caché de analíticas...');
        this.cache = {};
        this.deviceExistsCache.clear();
    }
    async ingestEvent(dto) {
        if (!this.deviceExistsCache.has(dto.deviceId)) {
            let device = await this.prisma.device.findUnique({
                where: { deviceId: dto.deviceId },
            });
            if (!device) {
                device = await this.prisma.device.create({
                    data: {
                        deviceId: dto.deviceId,
                        status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                        lastSeen: new Date(),
                    },
                });
            }
            this.deviceExistsCache.add(dto.deviceId);
        }
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
    async ingestBatchEvents(dtos) {
        if (!dtos || dtos.length === 0) {
            return { count: 0 };
        }
        this.logger.log(`Ingesting ${dtos.length} analytics events in batch.`);
        const processedEvents = dtos.map(dto => ({
            deviceId: dto.deviceId,
            campaignId: dto.campaignId,
            eventType: dto.type || dto.eventType,
            timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
            occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : (dto.timestamp ? new Date(dto.timestamp) : new Date()),
            lat: dto.lat,
            lng: dto.lng,
            processed: false
        }));
        await this.prisma.analyticsEvent.createMany({
            data: processedEvents,
        });
        return { count: processedEvents.length };
    }
    async getCampaignAnalytics(campaignId) {
        const totalEvents = await this.prisma.analyticsEvent.count({
            where: { campaignId }
        });
        return { campaignId, totalEvents };
    }
    async getDeviceAnalytics(deviceId) {
        const totalEvents = await this.prisma.analyticsEvent.count({
            where: { deviceId }
        });
        return { deviceId, totalEvents };
    }
    async getAnalyticsSummary(advertiserId) {
        const now = Date.now();
        const cacheKey = advertiserId ? `summary_${advertiserId}` : 'summary';
        if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
            return this.cache[cacheKey].data;
        }
        const videoIds = advertiserId ? await this.getAdvertiserVideoIds(advertiserId) : null;
        const [totalImpressions, uniqueNodesCount, totalScans, recentImpressions] = await Promise.all([
            this.prisma.playbackEvent.count({
                where: {
                    eventType: 'play_confirm',
                    ...(videoIds ? { videoId: { in: videoIds } } : {})
                }
            }),
            this.prisma.playbackEvent.groupBy({
                by: ['deviceId'],
                where: {
                    eventType: 'play_confirm',
                    ...(videoIds ? { videoId: { in: videoIds } } : {})
                },
                _count: { deviceId: true }
            }),
            this.prisma.analyticsEvent.count({
                where: {
                    eventType: { in: ['QR_SCAN', 'qr_scan', 'scan'] },
                    ...(advertiserId ? { campaign: { advertiserId } } : {})
                }
            }),
            this.prisma.playbackEvent.count({
                where: {
                    timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    eventType: 'play_confirm',
                    ...(videoIds ? { videoId: { in: videoIds } } : {})
                }
            })
        ]);
        const data = {
            totalImpressions,
            activeNodes: uniqueNodesCount.length,
            totalScans,
            ctr: totalImpressions > 0 ? (totalScans / totalImpressions) * 100 : 0,
            hourlyAverage: Math.round(recentImpressions / 24)
        };
        this.cache[cacheKey] = { data, expiry: now + this.CACHE_TTL };
        return data;
    }
    async getAdvertiserVideoIds(advertiserId) {
        const [videos, assets] = await Promise.all([
            this.prisma.video.findMany({
                where: { campaign: { advertiserId } },
                select: { id: true }
            }),
            this.prisma.mediaAsset.findMany({
                where: { campaign: { advertiserId } },
                select: { id: true }
            })
        ]);
        return [...videos.map(v => v.id), ...assets.map(a => a.id)];
    }
    async getTotalImpressions(advertiserId) {
        const now = Date.now();
        const cacheKey = advertiserId ? `totalImpressions_${advertiserId}` : 'totalImpressions';
        if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
            return this.cache[cacheKey].data;
        }
        const videoIds = advertiserId ? await this.getAdvertiserVideoIds(advertiserId) : null;
        const count = await this.prisma.playbackEvent.count({
            where: {
                eventType: 'play_confirm',
                ...(videoIds ? { videoId: { in: videoIds } } : {})
            }
        });
        this.cache[cacheKey] = { data: count, expiry: now + this.CACHE_TTL };
        return count;
    }
    async getAntiFraudMetrics(advertiserId) {
        const now = Date.now();
        const cacheKey = advertiserId ? `antiFraud_${advertiserId}` : 'antiFraud';
        if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
            return this.cache[cacheKey].data;
        }
        const videoIds = advertiserId ? await this.getAdvertiserVideoIds(advertiserId) : null;
        const [rawImpressions, gpsValidations] = await Promise.all([
            this.prisma.playbackEvent.count({
                where: {
                    eventType: 'play_confirm',
                    ...(videoIds ? { videoId: { in: videoIds } } : {})
                }
            }),
            this.prisma.playbackEvent.count({
                where: {
                    eventType: 'play_confirm',
                    lat: { not: null },
                    lng: { not: null },
                    ...(videoIds ? { videoId: { in: videoIds } } : {})
                }
            })
        ]);
        const validPercentage = rawImpressions > 0
            ? Math.round((gpsValidations / rawImpressions) * 100)
            : 0;
        const data = {
            rawImpressions,
            gpsValidations,
            validPercentage,
            status: validPercentage >= 90 ? 'EXCELENTE' : (validPercentage >= 75 ? 'ACEPTABLE' : 'ALTO RIESGO')
        };
        this.cache[cacheKey] = { data, expiry: now + this.CACHE_TTL };
        return data;
    }
    async getTopTaxis(advertiserId) {
        const now = Date.now();
        const cacheKey = advertiserId ? `topTaxis_${advertiserId}` : 'topTaxis';
        if (this.cache[cacheKey] && this.cache[cacheKey].expiry > now) {
            return this.cache[cacheKey].data;
        }
        const videoIds = advertiserId ? await this.getAdvertiserVideoIds(advertiserId) : null;
        const topDevices = await this.prisma.playbackEvent.groupBy({
            by: ['deviceId'],
            where: {
                eventType: 'play_confirm',
                ...(videoIds ? { videoId: { in: videoIds } } : {})
            },
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
        this.cache[cacheKey] = { data, expiry: now + this.CACHE_TTL };
        return data;
    }
    async getHourlyAnalytics(advertiserId) {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const videoIds = advertiserId ? await this.getAdvertiserVideoIds(advertiserId) : [];
        let results = [];
        if (advertiserId && videoIds.length > 0) {
            results = await this.prisma.$queryRaw `
        SELECT 
          EXTRACT(HOUR FROM "timestamp") as "hour",
          COUNT(id)::int as "plays"
        FROM "playback_events"
        WHERE "timestamp" >= ${last24h} AND "video_id" IN (${client_1.Prisma.join(videoIds)})
        GROUP BY 1
      `;
        }
        else if (advertiserId && videoIds.length === 0) {
            results = [];
        }
        else {
            results = await this.prisma.$queryRaw `
        SELECT 
          EXTRACT(HOUR FROM "timestamp") as "hour",
          COUNT(id)::int as "plays"
        FROM "playback_events"
        WHERE "timestamp" >= ${last24h}
        GROUP BY 1
      `;
        }
        const hourlyMap = new Map();
        for (let i = 0; i < 24; i++) {
            const h = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
            hourlyMap.set(h.toString().padStart(2, '0'), 0);
        }
        results.forEach((row) => {
            const h = Number(row.hour).toString().padStart(2, '0');
            hourlyMap.set(h, row.plays);
        });
        return Array.from(hourlyMap.entries())
            .map(([hour, plays]) => ({ hour, plays }))
            .sort((a, b) => a.hour.localeCompare(b.hour));
    }
    async getRecentPlays(advertiserId) {
        const videoIds = advertiserId ? await this.getAdvertiserVideoIds(advertiserId) : null;
        const events = await this.prisma.playbackEvent.findMany({
            where: {
                ...(videoIds ? { videoId: { in: videoIds } } : {})
            },
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
    async getPlaybackHeatmap(advertiserId) {
        this.logger.log(`Generating playback heatmap data${advertiserId ? ` for advertiser: ${advertiserId}` : ''}`);
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const where = {
            timestamp: { gte: fifteenDaysAgo },
            lat: { not: null },
            lng: { not: null }
        };
        if (advertiserId) {
            const [videos, assets] = await Promise.all([
                this.prisma.video.findMany({
                    where: { campaign: { advertiserId } },
                    select: { id: true }
                }),
                this.prisma.mediaAsset.findMany({
                    where: { campaign: { advertiserId } },
                    select: { id: true }
                })
            ]);
            const videoIds = [...videos.map(v => v.id), ...assets.map(a => a.id)];
            where.videoId = { in: videoIds };
        }
        const locations = await this.prisma.playbackEvent.findMany({
            where,
            select: {
                lat: true,
                lng: true,
            },
            take: 10000
        });
        return locations.map(loc => ({
            lat: loc.lat,
            lng: loc.lng,
            weight: 1.0
        }));
    }
    async registerQrScan(campaignId, deviceId) {
        const DEFAULT_URL = 'https://tad.do';
        if (!campaignId || !deviceId)
            return DEFAULT_URL;
        try {
            const campaign = await this.prisma.campaign.findUnique({
                where: { id: campaignId },
                select: { targetUrl: true },
            });
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
        }
        catch (error) {
            this.logger.error(`Error registrando QR scan: ${error.message}`);
            return DEFAULT_URL;
        }
    }
    async updateDeviceLocationFromMobile(data) {
        this.logger.log(`🛰️ Mobile GPS Update for Device: ${data.deviceId} (${data.lat}, ${data.lng})`);
        const device = await this.prisma.device.findUnique({
            where: { deviceId: data.deviceId },
            select: { driverId: true }
        });
        const now = new Date();
        if (device?.driverId) {
            await this.prisma.driverLocation.create({
                data: {
                    deviceId: data.deviceId,
                    driverId: device.driverId,
                    latitude: data.lat,
                    longitude: data.lng,
                    speed: data.speed || 0,
                    timestamp: now
                }
            });
        }
        return this.prisma.device.update({
            where: { deviceId: data.deviceId },
            data: {
                lastLat: data.lat,
                lastLng: data.lng,
                lastSeen: now,
                lastSync: now,
                isOnline: true
            },
        });
    }
    async getWeeklyCampaignMetrics(campaignId) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const [videos, assets] = await Promise.all([
            this.prisma.video.findMany({ where: { campaignId }, select: { id: true } }),
            this.prisma.mediaAsset.findMany({ where: { campaignId }, select: { id: true } })
        ]);
        const videoIds = [...videos.map(v => v.id), ...assets.map(a => a.id)];
        const playEvents = await this.prisma.playbackEvent.findMany({
            where: {
                videoId: { in: videoIds },
                timestamp: { gte: sevenDaysAgo },
                eventType: 'play_confirm'
            },
            select: { timestamp: true }
        });
        const scanEvents = await this.prisma.analyticsEvent.findMany({
            where: {
                campaignId,
                occurredAt: { gte: sevenDaysAgo },
                eventType: 'QR_SCAN'
            },
            select: { occurredAt: true }
        });
        const dailyData = {};
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dailyData[d.toLocaleDateString('es-DO')] = { impressions: 0, scans: 0 };
        }
        playEvents.forEach(e => {
            const day = new Date(e.timestamp).toLocaleDateString('es-DO');
            if (dailyData[day])
                dailyData[day].impressions++;
        });
        scanEvents.forEach(e => {
            const day = new Date(e.occurredAt).toLocaleDateString('es-DO');
            if (dailyData[day])
                dailyData[day].scans++;
        });
        return Object.entries(dailyData)
            .map(([day, stats]) => ({
            day,
            impressions: stats.impressions,
            scans: stats.scans,
            ctr: stats.impressions > 0 ? (stats.scans / stats.impressions) * 100 : 0
        }))
            .reverse();
    }
    async getExternalWebStats(websiteId) {
        const umami = (0, umami_1.createUmamiClient)();
        if (!umami || !websiteId)
            return null;
        const now = Date.now();
        const startAt = now - 30 * 24 * 60 * 60 * 1000;
        return umami.getWebsiteStats(websiteId, startAt, now);
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map