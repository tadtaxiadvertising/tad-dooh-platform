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
var DeviceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const business_rules_1 = require("../../common/constants/business-rules");
const campaign_service_1 = require("../campaign/campaign.service");
const finance_service_1 = require("../finance/finance.service");
const jwt = require("jsonwebtoken");
const MAX_SLOTS_PER_DEVICE = 15;
let DeviceService = DeviceService_1 = class DeviceService {
    constructor(prisma, campaignService, financeService) {
        this.prisma = prisma;
        this.campaignService = campaignService;
        this.financeService = financeService;
        this.logger = new common_1.Logger(DeviceService_1.name);
        this.JWT_SECRET = process.env.JWT_SECRET || 'tad-default-secret-2026';
    }
    async getDeviceSlots(deviceId) {
        try {
            const device = await this.prisma.device.findUnique({ where: { deviceId } });
            if (!device)
                throw new Error('Device not found');
            const payload = await this.campaignService.getActiveSyncVideos(deviceId, device.city || 'Santiago');
            const occupied = payload.media_assets?.length || 0;
            return {
                device_id: deviceId,
                max_slots: MAX_SLOTS_PER_DEVICE,
                assigned_slots: occupied,
                available_slots: Math.max(0, MAX_SLOTS_PER_DEVICE - occupied),
                usage_percentage: Math.round((occupied / MAX_SLOTS_PER_DEVICE) * 100)
            };
        }
        catch (error) {
            this.logger.warn(`⚠️ getDeviceSlots(${deviceId}): ${error?.message}`);
            return {
                device_id: deviceId,
                max_slots: MAX_SLOTS_PER_DEVICE,
                assigned_slots: 0,
                available_slots: MAX_SLOTS_PER_DEVICE,
                usage_percentage: 0
            };
        }
    }
    async registerDevice(dto) {
        const existingDevice = await this.prisma.device.findUnique({
            where: { deviceId: dto.device_id },
        });
        if (existingDevice) {
            this.logger.log(`Device already exists, updating lastSeen: ${dto.device_id}`);
            return this.prisma.device.update({
                where: { deviceId: dto.device_id },
                data: {
                    appVersion: dto.app_version,
                    lastSeen: new Date(),
                    driverId: dto.driver_id ?? undefined,
                },
            });
        }
        this.logger.log(`Registering new device (PENDING approval): ${dto.device_id}`);
        return this.prisma.device.create({
            data: {
                deviceId: dto.device_id,
                appVersion: dto.app_version,
                status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL,
                lastSeen: new Date(),
                driverId: dto.driver_id,
            },
        });
    }
    async getPendingDevices() {
        return this.prisma.device.findMany({
            where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL },
            orderBy: { lastSeen: 'desc' },
            select: { id: true, deviceId: true, appVersion: true, lastSeen: true },
        });
    }
    async approveDevice(deviceId) {
        this.logger.log(`✅ Admin approved device: ${deviceId}`);
        return this.prisma.device.update({
            where: { deviceId },
            data: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
        });
    }
    async rejectDevice(deviceId) {
        this.logger.warn(`🗑️ Admin rejected device: ${deviceId}`);
        return this.prisma.device.delete({ where: { deviceId } });
    }
    async getFleetStatusSummary() {
        const now = new Date();
        const thirtyMinMs = 30 * 60 * 1000;
        const [devices, campaignAssignments] = await Promise.all([
            this.prisma.device.findMany({
                where: { status: { not: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL } },
                select: {
                    id: true,
                    deviceId: true,
                    taxiNumber: true,
                    status: true,
                    lastSeen: true,
                    batteryLevel: true,
                    playerStatus: true,
                    city: true,
                    driver: {
                        select: { id: true, fullName: true, subscriptionPaid: true }
                    }
                }
            }),
            this.prisma.deviceCampaign.groupBy({
                by: ['device_id'],
                _count: { campaign_id: true }
            }).catch(() => [])
        ]);
        const slotMap = new Map();
        for (const row of (campaignAssignments || [])) {
            slotMap.set(row.device_id, row._count?.campaign_id || 0);
        }
        return devices.map((d) => {
            const isOnline = !!(d.lastSeen && (now.getTime() - d.lastSeen.getTime() <= thirtyMinMs));
            const assignedSlots = slotMap.get(d.id) || 0;
            return {
                id: d.id,
                device_id: d.deviceId,
                deviceId: d.deviceId,
                taxi_number: d.taxiNumber,
                status: isOnline ? 'online' : (d.status === business_rules_1.BUSINESS_RULES.STATUS.DEVICE.SUSPENDED ? 'inactive' : 'offline'),
                is_online: isOnline,
                battery_level: d.batteryLevel,
                occupied_slots: assignedSlots,
                available_slots: Math.max(0, MAX_SLOTS_PER_DEVICE - assignedSlots),
                max_slots: MAX_SLOTS_PER_DEVICE,
                player_status: d.playerStatus,
                last_seen: d.lastSeen,
                city: d.city || 'Santiago',
                driver: d.driver ? {
                    id: d.driver.id,
                    fullName: d.driver.fullName,
                    subscriptionPaid: d.driver.subscriptionPaid
                } : null,
                driver_id: d.driver?.id || null,
                driver_name: d.driver?.fullName || 'No asignado',
                subscription_status: d.driver?.subscriptionPaid ? 'PAID' : 'PENDING'
            };
        });
    }
    async deviceHeartbeat(dto) {
        let device = await this.prisma.device.findUnique({
            where: { deviceId: dto.device_id },
            include: { driver: true },
        });
        if (!device) {
            this.logger.warn(`Heartbeat from unknown device: ${dto.device_id}. Registering as PENDING — awaiting admin approval.`);
            await this.prisma.device.create({
                data: {
                    deviceId: dto.device_id,
                    status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL,
                    lastSeen: new Date(),
                    batteryLevel: dto.battery_level,
                    storageFree: dto.storage_free,
                    playerStatus: dto.player_status,
                },
            });
            return { success: true, blocked: true, reason: 'awaiting_approval' };
        }
        else if (device.status === business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL) {
            this.logger.log(`⏳ Heartbeat from PENDING device: ${dto.device_id}. Awaiting admin approval.`);
            await this.prisma.device.update({
                where: { deviceId: dto.device_id },
                data: { lastSeen: new Date() },
            });
            return { success: true, blocked: true, reason: 'awaiting_approval' };
        }
        else {
            await this.prisma.device.update({
                where: { deviceId: dto.device_id },
                data: {
                    lastSeen: new Date(),
                    batteryLevel: dto.battery_level,
                    storageFree: dto.storage_free,
                    playerStatus: dto.player_status,
                    lastLat: dto.lat ?? undefined,
                    lastLng: dto.lng ?? undefined,
                },
            });
        }
        let blocked = false;
        let reason;
        if (device.driver) {
            const { driver } = device;
            if (driver.subscriptionPaid && (!driver.subscriptionEnd || driver.subscriptionEnd >= new Date())) {
            }
            else {
                this.logger.warn(`⚠️ Device ${dto.device_id}: suscripción de ${driver.fullName} vencida o no pagada. Permitido por política TAD.`);
                this.financeService.notifyMorosidad(dto.device_id).catch(e => {
                    this.logger.error(`Failed to trigger morosidad notification for ${dto.device_id}: ${e.message}`);
                });
            }
        }
        this.prisma.deviceHeartbeat.create({
            data: {
                deviceId: dto.device_id,
                batteryLevel: dto.battery_level,
                storageFree: dto.storage_free,
                timestamp: new Date(),
            },
        }).catch(e => {
            this.logger.error(`Failed to record heartbeat for ${dto.device_id}: ${e.message}`);
        });
        this.logger.log(`💓 Heartbeat processed for device ${dto.device_id}. Battery: ${dto.battery_level}%, Player: ${dto.player_status}`);
        return { success: true, blocked, reason };
    }
    async checkSubscriptionStatus(deviceId) {
        const device = await this.prisma.device.findUnique({
            where: { deviceId },
            include: { driver: true }
        });
        if (!device || !device.driver) {
            this.logger.log(`⚠️ Device ${deviceId}: Sin conductor vinculado (grace period).`);
            return { blocked: false, reason: undefined };
        }
        const { driver } = device;
        if (driver.subscriptionPaid && (!driver.subscriptionEnd || driver.subscriptionEnd >= new Date())) {
            return { blocked: false, reason: undefined };
        }
        this.logger.warn(`⚠️ Device ${deviceId}: suscripción de ${driver.fullName} vencida o no pagada. Permitido por política TAD.`);
        try {
            await this.financeService.notifyMorosidad(deviceId);
        }
        catch (e) {
            this.logger.error(`Failed to trigger morosidad notification for ${deviceId}: ${e.message}`);
        }
        return { blocked: false, reason: undefined };
    }
    async recordPlayback(dto) {
        this.logger.log(`Playback confirmed on device: ${dto.device_id} for video: ${dto.video_id}`);
        await this.prisma.device.updateMany({
            where: { deviceId: dto.device_id },
            data: {
                lastPlayback: new Date(dto.timestamp),
                lastSeen: new Date(),
            },
        });
        return this.prisma.playbackEvent.create({
            data: {
                deviceId: dto.device_id,
                videoId: dto.video_id,
                eventType: 'play_confirm',
                timestamp: new Date(dto.timestamp),
                lat: dto.lat,
                lng: dto.lng,
                isSimulated: dto.isSimulated || false,
                verified: false
            },
        });
    }
    async syncDeviceCampaigns(dto) {
        const { deviceId, lat, lng, batteryLevel, lastHash } = dto;
        const deviceCheck = await this.prisma.device.findUnique({ where: { deviceId } });
        if (!deviceCheck) {
            return { blocked: true, reason: 'awaiting_approval', media_assets: [] };
        }
        if (deviceCheck.status === business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL) {
            this.logger.log(`⏳ Sync blocked for PENDING device: ${deviceId}`);
            return { blocked: true, reason: 'awaiting_approval', media_assets: [] };
        }
        const device = await this.prisma.device.update({
            where: { deviceId },
            data: {
                lastLat: lat,
                lastLng: lng,
                batteryLevel: batteryLevel,
                lastSync: new Date(),
                isOnline: true,
            },
        });
        if (batteryLevel !== undefined && batteryLevel < 15) {
            this.logger.warn(`🚨 [CRITICAL_BATTERY] Device ${deviceId} at ${batteryLevel}%`);
            await this.prisma.notification.create({
                data: {
                    title: 'Batería Crítica detectada',
                    message: `La tablet ${device.taxiNumber || deviceId} reporta un nivel crítico (${batteryLevel}%).`,
                    type: 'CRITICAL',
                    category: 'DEVICE',
                    entityId: deviceId,
                }
            });
        }
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (deviceCheck.lastSeen && (new Date().getTime() - deviceCheck.lastSeen.getTime() > threeDaysMs)) {
            await this.prisma.notification.create({
                data: {
                    title: 'Dispositivo Recuperado (+3D Offline)',
                    message: `La tablet ${device.taxiNumber || deviceId} ha vuelto a conectar tras más de 3 días de inactividad crítica.`,
                    type: 'SUCCESS',
                    category: 'DEVICE',
                    entityId: deviceId,
                }
            });
        }
        const { blocked, reason } = await this.checkSubscriptionStatus(deviceId);
        if (blocked)
            return { blocked, reason };
        const pendingCommands = await this.prisma.deviceCommand.findMany({
            where: {
                device: { deviceId },
                status: 'PENDING',
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            select: {
                id: true,
                commandType: true,
                commandParams: true,
            }
        });
        if (pendingCommands.length > 0) {
            this.logger.log(`📤 Sending ${pendingCommands.length} pending commands to Device ${deviceId}`);
            await this.prisma.deviceCommand.updateMany({
                where: { id: { in: pendingCommands.map(c => c.id) } },
                data: { status: 'PROCESSING' }
            });
        }
        const deviceCity = device.city || 'Santiago';
        const payload = await this.campaignService.getActiveSyncVideos(deviceId, deviceCity);
        if (lastHash && lastHash === payload.sync_hash) {
            this.logger.log(`🔄 Device ${deviceId}: Delta Sync matches (${lastHash}). No update needed.`);
            return {
                update: false,
                blocked: false,
                sync_hash: payload.sync_hash
            };
        }
        if (!payload.media_assets || payload.media_assets.length === 0) {
            return {
                update: true,
                blocked: false,
                media_assets: [],
                sync_hash: 'empty'
            };
        }
        this.logger.log(`📥 Device ${deviceId}: New sync payload available (${payload.sync_hash})`);
        const licenseToken = jwt.sign({
            deviceId,
            taxi: device.taxiNumber,
            type: 'OFFLINE_LICENSE',
            iat: Math.floor(Date.now() / 1000)
        }, this.JWT_SECRET, { expiresIn: '48h' });
        this.logger.log(`✅ Device ${deviceId}: Sync success. Sent ${payload.media_assets?.length || 0} assets.`);
        return {
            update: true,
            blocked: false,
            licenseToken,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            sync_hash: payload.sync_hash,
            campaign_version: payload.version,
            media_assets: payload.media_assets,
            videos: payload.media_assets,
            commands: pendingCommands.map(c => ({
                id: c.id,
                type: c.commandType,
                params: c.commandParams ? JSON.parse(c.commandParams) : {}
            }))
        };
    }
    async acknowledgeCommand(commandId, result) {
        this.logger.log(`📥 Command ${commandId} acknowledged with result: ${JSON.stringify(result)}`);
        return this.prisma.deviceCommand.update({
            where: { id: commandId },
            data: {
                status: 'EXECUTED',
                executedAt: new Date(),
                result: JSON.stringify(result)
            }
        });
    }
    async processBulkSync(dto) {
        this.logger.log(`🔄 [BULK_SYNC] Processing batch from device: ${dto.device_id}`);
        const device = await this.prisma.device.findUnique({
            where: { deviceId: dto.device_id }
        });
        if (!device) {
            this.logger.warn(`BulkSync from unknown device: ${dto.device_id}`);
            return { success: false, reason: 'unknown_device' };
        }
        if (device.status === business_rules_1.BUSINESS_RULES.STATUS.DEVICE.INITIAL) {
            return { success: false, reason: 'awaiting_approval' };
        }
        await this.prisma.device.update({
            where: { deviceId: dto.device_id },
            data: {
                lastSeen: new Date(),
                batteryLevel: dto.battery_level ?? device.batteryLevel,
                storageFree: dto.storage_free ?? device.storageFree,
                isOnline: true,
            }
        });
        if (dto.playbacks && dto.playbacks.length > 0) {
            this.logger.log(`   -> Inserting ${dto.playbacks.length} playback events`);
            const playbackData = dto.playbacks.map(p => ({
                deviceId: dto.device_id,
                videoId: p.video_id,
                eventType: 'play_confirm',
                timestamp: new Date(p.timestamp),
                lat: p.lat,
                lng: p.lng,
                isSimulated: p.isSimulated || dto.isSimulated || false,
                verified: false
            }));
            await this.prisma.playbackEvent.createMany({
                data: playbackData,
                skipDuplicates: true
            });
            await this.prisma.device.update({
                where: { deviceId: dto.device_id },
                data: { lastPlayback: new Date() }
            });
        }
        if (dto.locations && dto.locations.length > 0 && device.driverId) {
            this.logger.log(`   -> Inserting ${dto.locations.length} location events`);
            const locationData = dto.locations.map(l => ({
                deviceId: dto.device_id,
                driverId: device.driverId,
                latitude: l.lat,
                longitude: l.lng,
                timestamp: new Date(l.timestamp),
                isSimulated: l.isSimulated || dto.isSimulated || false
            }));
            await this.prisma.driverLocation.createMany({
                data: locationData,
                skipDuplicates: true
            });
            const latestLoc = dto.locations[dto.locations.length - 1];
            if (latestLoc) {
                await this.prisma.device.update({
                    where: { deviceId: dto.device_id },
                    data: { lastLat: latestLoc.lat, lastLng: latestLoc.lng }
                });
            }
        }
        await this.prisma.deviceHeartbeat.create({
            data: {
                deviceId: dto.device_id,
                batteryLevel: dto.battery_level,
                storageFree: dto.storage_free,
                timestamp: new Date(),
            },
        });
        return { success: true, processedPlaybacks: dto.playbacks?.length || 0, processedLocations: dto.locations?.length || 0 };
    }
};
exports.DeviceService = DeviceService;
exports.DeviceService = DeviceService = DeviceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        campaign_service_1.CampaignService,
        finance_service_1.FinanceService])
], DeviceService);
//# sourceMappingURL=device.service.js.map