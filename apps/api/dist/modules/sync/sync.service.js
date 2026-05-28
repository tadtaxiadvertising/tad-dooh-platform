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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const business_rules_1 = require("../../common/constants/business-rules");
const mediaAssetSafeSelect = {
    id: true,
    campaignId: true,
    type: true,
    filename: true,
    url: true,
    fileSize: true,
    checksum: true,
    duration: true,
    version: true,
    createdAt: true,
    qrUrl: true,
};
let SyncService = SyncService_1 = class SyncService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new common_1.Logger(SyncService_1.name);
        this.JWT_SECRET = process.env.JWT_SECRET || 'tad-default-secret-2026';
    }
    async getDeviceManifest(deviceId) {
        const device = await this.prisma.device.findUnique({
            where: { deviceId },
            include: { driver: true }
        });
        if (!device) {
            await this.notifications.createAlert({
                title: 'Intento de Sincronización Fallido',
                message: `Un dispositivo desconocido (${deviceId}) intentó sincronizar contenido.`,
                type: 'WARNING',
                category: 'DEVICE',
                entityId: deviceId
            });
            throw new common_1.HttpException('DEVICE_NOT_FOUND_IN_CLUSTER', common_1.HttpStatus.NOT_FOUND);
        }
        if (device.status !== business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE) {
            await this.notifications.createAlert({
                title: 'Dispositivo Inactivo',
                message: `El dispositivo ${device.taxiNumber || deviceId} está intentando sincronizar pero su estado es ${device.status}.`,
                type: 'CRITICAL',
                category: 'DEVICE',
                entityId: deviceId
            });
            throw new common_1.HttpException('DEVICE_DEACTIVATED', common_1.HttpStatus.FORBIDDEN);
        }
        const driver = device.driver;
        const isDriverActive = driver && driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE;
        const isDriverPaid = (driver && driver.subscriptionPaid);
        let hasValidSubscription = isDriverPaid;
        if (!hasValidSubscription) {
            const sub = await this.prisma.subscription.findFirst({
                where: { deviceId }
            });
            hasValidSubscription = sub && sub.status === 'ACTIVE' && (!sub.validUntil || new Date() <= sub.validUntil);
        }
        const now = new Date();
        this.logger.log(`🕒 Sync [V5] Clock: ${now.toISOString()} | Device: ${deviceId}`);
        let campaignFilter = { isGlobal: true };
        if (hasValidSubscription) {
            campaignFilter = {
                OR: [
                    { targetAll: true },
                    ...(device.city ? [{ targetCity: device.city }] : []),
                    ...(device.city ? [{
                            targetCities: { contains: `"${device.city}"` }
                        }] : []),
                    ...(device.fleet ? [{
                            targetFleets: { contains: `"${device.fleet}"` }
                        }] : []),
                    { devices: { some: { device_id: device.id } } },
                    { targets: { some: { deviceId } } },
                    ...(isDriverActive ? [
                        { targetDrivers: { some: { id: driver.id } } }
                    ] : []),
                ]
            };
        }
        const city = device.city || 'Santiago';
        const results = await this.prisma.$queryRaw `
      SELECT campaign_id FROM mv_active_campaigns
      WHERE active = true 
        AND start_date <= NOW() 
        AND end_date >= NOW()
        AND (
          target_all = true OR 
          target_city = ${city} OR
          target_cities::text LIKE ${`%${city}%`} OR
          assigned_device_uuids::jsonb @> ${JSON.stringify([device.id])}::jsonb OR
          assigned_hw_ids::jsonb @> ${JSON.stringify([deviceId])}::jsonb OR
          (assigned_driver_ids::jsonb @> ${JSON.stringify([driver?.id])}::jsonb AND ${!!isDriverActive})
        )
    `;
        const campaignIds = results.map(r => r.campaign_id);
        const activeCampaigns = await this.prisma.campaign.findMany({
            where: {
                id: { in: campaignIds }
            },
            include: {
                media: true,
                mediaAssets: { select: mediaAssetSafeSelect },
                videos: true
            }
        });
        this.logger.log(`📊 Campaigns found (V5): ${activeCampaigns.length}`);
        activeCampaigns.forEach(c => {
            const assetsCount = (c.media?.length || 0) + (c.mediaAssets?.length || 0) + (c.videos?.length || 0);
            this.logger.log(`   📂 Campaign "${c.name}" [${c.id}] | assets=${assetsCount} | dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`);
        });
        activeCampaigns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const playlistMap = new Map();
        activeCampaigns.forEach(c => {
            const mediaList = [
                ...(c.media || []),
                ...(c.mediaAssets || []),
                ...(c.videos || [])
            ];
            mediaList.forEach((m) => {
                const key = m.hashMd5 || m.hash || m.checksum || m.url;
                if (!playlistMap.has(key)) {
                    playlistMap.set(key, {
                        id: m.id,
                        campaignId: c.id,
                        filename: m.filename || m.name || m.title || 'video.mp4',
                        url: m.cdnUrl || m.url || '',
                        checksum: m.hashMd5 || m.hash || m.checksum || 'no-checksum',
                        hashMd5: m.hashMd5 || m.hash || m.checksum || null,
                        duration: m.duration || m.durationSeconds || 30,
                        version: new Date(c.updatedAt || new Date()).getTime(),
                        priority: c.priority || 5
                    });
                }
            });
        });
        const playlist = Array.from(playlistMap.values());
        const manifestContent = activeCampaigns.map(c => `${c.id}-${c.updatedAt.getTime()}`).sort().join('|');
        const etag = crypto.createHash('md5').update(manifestContent).digest('hex');
        const licenseToken = jwt.sign({
            deviceId,
            taxi: device.taxiNumber,
            type: 'OFFLINE_LICENSE',
            iat: Math.floor(Date.now() / 1000)
        }, this.JWT_SECRET, { expiresIn: '24h' });
        return {
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            etag,
            licenseToken,
            device: {
                id: device.id,
                deviceId: device.deviceId,
                taxi: device.taxiNumber
            },
            count: playlist.length,
            playlist
        };
    }
    async refreshManifestView() {
        try {
            await this.prisma.$executeRaw `SELECT refresh_active_campaigns();`;
            this.logger.log('✅ Active Campaigns Materialized View Refreshed');
        }
        catch (e) {
            this.logger.error('❌ Failed to refresh Materialized View', e.stack);
        }
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], SyncService);
//# sourceMappingURL=sync.service.js.map