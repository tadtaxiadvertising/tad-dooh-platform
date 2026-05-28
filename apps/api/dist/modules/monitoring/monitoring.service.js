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
var MonitoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const whatsapp_service_1 = require("../notifications/whatsapp.service");
const throttler_util_1 = require("../../utils/throttler.util");
const business_rules_1 = require("../../common/constants/business-rules");
const PILOT_DEVICE_IDS = [
    'STI0001', 'STI0002', 'STI0003', 'STI0004', 'STI0005',
    'STI0006', 'STI0007', 'STI0008', 'STI0009', 'STI0010',
];
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_PHONE || '18098001234';
const OFFLINE_THRESHOLD_MINUTES = 15;
const PUSH_NOTIFICATION_HOURS = 12;
let MonitoringService = MonitoringService_1 = class MonitoringService {
    constructor(prisma, whatsapp, notifications) {
        this.prisma = prisma;
        this.whatsapp = whatsapp;
        this.notifications = notifications;
        this.logger = new common_1.Logger(MonitoringService_1.name);
    }
    async onModuleInit() {
        this.logger.log('🔄 [RECOVERY] Running startup connectivity scan in background...');
        this.checkOfflineDevices().catch(err => this.logger.error(`❌ Startup connectivity scan failed: ${err.message}`));
    }
    async processGpsBatch(batch) {
        const { deviceId, driverId } = batch;
        const points = batch.points || batch.locations || [];
        this.logger.log(`📥 Recibiendo lote GPS de dispositivo ${deviceId} (${points.length} puntos)`);
        try {
            const device = await this.prisma.device.findUnique({
                where: { deviceId },
                include: { driver: true }
            });
            const resolvedDriverId = driverId || device?.driverId;
            if (!resolvedDriverId) {
                this.logger.warn(`⚠️ Batch recibido para ${deviceId} sin chofer vinculado. Descartando.`);
                return { status: 'ignored', reason: 'no_driver_linked' };
            }
            if (points.length > 0) {
                await this.prisma.driverLocation.createMany({
                    data: points.map(p => ({
                        deviceId,
                        driverId: resolvedDriverId,
                        latitude: p.latitude ?? p.lat,
                        longitude: p.longitude ?? p.lng,
                        speed: p.speed || 0,
                        timestamp: new Date(p.timestamp),
                    })),
                });
                const latestPoint = points.reduce((prev, curr) => new Date(prev.timestamp) > new Date(curr.timestamp) ? prev : curr);
                await this.prisma.device.update({
                    where: { deviceId },
                    data: {
                        lastLat: latestPoint.latitude ?? latestPoint.lat,
                        lastLng: latestPoint.longitude ?? latestPoint.lng,
                        isOnline: true,
                        lastSeen: new Date(),
                        lastSyncAt: new Date(),
                        lastSyncSuccess: true,
                        status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                        connectivityStatus: 'ONLINE',
                    },
                });
            }
            return {
                status: 'success',
                processedPoints: points.length,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            this.logger.error(`❌ Error procesando lote GPS para ${deviceId}: ${error.message}`);
            throw error;
        }
    }
    async getFleetStatus() {
        return await this.prisma.device.findMany({
            where: { deviceId: { contains: 'STI' } },
            select: {
                deviceId: true,
                taxiNumber: true,
                lastLat: true,
                lastLng: true,
                isOnline: true,
                lastSeen: true,
                status: true,
            },
            orderBy: { deviceId: 'asc' },
        });
    }
    async getPilotFleetStatus() {
        const devices = await this.prisma.device.findMany({
            where: { deviceId: { in: PILOT_DEVICE_IDS } },
            select: {
                deviceId: true,
                taxiNumber: true,
                lastLat: true,
                lastLng: true,
                isOnline: true,
                lastSeen: true,
                status: true,
                driver: {
                    select: {
                        fullName: true,
                        phone: true,
                        subscriptionPaid: true,
                    },
                },
            },
            orderBy: { deviceId: 'asc' },
        });
        const onlineCount = devices.filter(d => d.isOnline).length;
        return {
            summary: {
                total: PILOT_DEVICE_IDS.length,
                online: onlineCount,
                offline: PILOT_DEVICE_IDS.length - onlineCount,
                healthPercentage: Math.round((onlineCount / PILOT_DEVICE_IDS.length) * 100),
            },
            devices,
        };
    }
    async getActiveCampaignsStatus() {
        return await this.prisma.campaign.findMany({
            where: {
                active: true,
                status: { in: ['ACTIVE', 'PUBLISHED'] },
            },
            take: 5,
            select: {
                id: true,
                name: true,
                advertiser: true,
                targetImpressions: true,
                metrics: {
                    take: 1,
                    orderBy: { date: 'desc' },
                },
            },
        });
    }
    async checkOfflineDevices() {
        this.logger.log('🔍 [CRON] Verificando dispositivos offline y conectividad...');
        const now = new Date();
        const offlineThreshold = new Date(now.getTime() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);
        const criticalThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const pushThreshold = new Date(now.getTime() - PUSH_NOTIFICATION_HOURS * 60 * 60 * 1000);
        try {
            await this.prisma.device.updateMany({
                where: {
                    lastSeen: { lt: offlineThreshold },
                    isOnline: true,
                },
                data: { isOnline: false, status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.SUSPENDED },
            });
            const criticalCount = await this.prisma.device.updateMany({
                where: {
                    OR: [
                        { lastSeen: { lt: criticalThreshold } },
                        { lastSeen: null },
                    ],
                    connectivityStatus: { not: 'connectivity_issue' },
                },
                data: { connectivityStatus: 'connectivity_issue' },
            });
            if (criticalCount.count > 0) {
                this.logger.warn(`🚨 [FLEET] ${criticalCount.count} dispositivos marcados con connectivity_issue (+48h offline).`);
            }
            const offlineDrivers = await this.prisma.device.findMany({
                where: {
                    lastSeen: { lt: pushThreshold },
                    driverId: { not: null },
                },
                select: { driverId: true, deviceId: true }
            });
            await (0, throttler_util_1.throttledMap)(offlineDrivers, async (d) => {
                if (d.driverId) {
                    await this.notifications.sendPush(d.driverId, `⚠️ TAD: Tu equipo ${d.deviceId} lleva +12h sin conexión. Verifica el encendido de la tablet para no afectar tu nómina.`).catch(e => this.logger.error(`Error enviando push a ${d.driverId}: ${e.message}`));
                }
            }, 5);
            const offlinePilotDevices = await this.prisma.device.findMany({
                where: {
                    deviceId: { in: PILOT_DEVICE_IDS },
                    lastSeen: { lt: offlineThreshold },
                    status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.SUSPENDED
                },
                select: { deviceId: true, taxiNumber: true, lastSeen: true },
            });
            if (offlinePilotDevices.length > 0) {
                const deviceList = offlinePilotDevices
                    .map(d => `• ${d.deviceId} (${d.taxiNumber || 'S/N'}) — última: ${d.lastSeen ? d.lastSeen.toLocaleTimeString() : 'nunca'}`)
                    .join('\n');
                const alertMessage = `🚨 *ALERTA TAD PILOTO SANTIAGO*\n\n` +
                    `${offlinePilotDevices.length} pantalla(s) sin señal:\n\n${deviceList}\n\n` +
                    `⏰ Umbral: ${OFFLINE_THRESHOLD_MINUTES} min.`;
                await this.whatsapp.sendMessage(ADMIN_PHONE, alertMessage);
            }
        }
        catch (err) {
            this.logger.error(`❌ [CRON] Error en checkOfflineDevices: ${err.message}`);
        }
    }
};
exports.MonitoringService = MonitoringService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringService.prototype, "checkOfflineDevices", null);
exports.MonitoringService = MonitoringService = MonitoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsAppService,
        notifications_service_1.NotificationsService])
], MonitoringService);
//# sourceMappingURL=monitoring.service.js.map