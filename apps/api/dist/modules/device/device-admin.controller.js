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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeviceAdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceAdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const device_service_1 = require("./device.service");
const business_rules_1 = require("../../common/constants/business-rules");
const KIOSK_COMMAND_TYPES = [
    'FORCE_SYNC',
    'SCREEN_ON',
    'SCREEN_OFF',
    'SET_BRIGHTNESS',
    'SET_VOLUME',
    'MUTE',
    'UNMUTE',
    'LOCK_KIOSK',
    'UNLOCK_KIOSK',
    'REBOOT',
    'RESTART_APP',
    'ENABLE_MOTION',
    'DISABLE_MOTION',
];
let DeviceAdminController = DeviceAdminController_1 = class DeviceAdminController {
    constructor(prisma, deviceService) {
        this.prisma = prisma;
        this.deviceService = deviceService;
        this.logger = new common_1.Logger(DeviceAdminController_1.name);
    }
    getPendingDevices() {
        return this.deviceService.getPendingDevices();
    }
    approveDevice(deviceId) {
        return this.deviceService.approveDevice(deviceId);
    }
    rejectDevice(deviceId) {
        return this.deviceService.rejectDevice(deviceId);
    }
    async getDeviceCampaigns(paramId) {
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ id: paramId }, { deviceId: paramId }] },
            select: { id: true }
        });
        if (!device)
            return [];
        const assignments = await this.prisma.deviceCampaign.findMany({
            where: { device_id: device.id },
            include: {
                campaign: true,
            },
        });
        return assignments.map(a => ({
            ...a.campaign,
            assigned_at: a.assigned_at
        }));
    }
    async removeCampaignFromDevice(paramDeviceId, campaignId) {
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ id: paramDeviceId }, { deviceId: paramDeviceId }] },
            select: { id: true, deviceId: true }
        });
        if (!device) {
            return { success: false, message: 'Dispositivo no encontrado' };
        }
        try {
            await this.prisma.deviceCampaign.deleteMany({
                where: {
                    device_id: device.id,
                    campaign_id: campaignId,
                },
            });
        }
        catch (e) { }
        try {
            await this.prisma.playlistItem.deleteMany({
                where: {
                    campaignId: campaignId,
                    deviceId: device.deviceId
                }
            });
        }
        catch (e) { }
        return { success: true, message: 'Campaña removida del dispositivo exitosamente' };
    }
    async createDevice(data) {
        if (!data.deviceId)
            throw new common_1.BadRequestException('ID de dispositivo (hardware) es obligatorio');
        const existing = await this.prisma.device.findUnique({ where: { deviceId: data.deviceId } });
        if (existing)
            throw new common_1.BadRequestException(`El ID ${data.deviceId} ya está registrado`);
        return this.prisma.device.create({
            data: {
                deviceId: data.deviceId,
                taxiNumber: data.taxiNumber,
                city: data.city || 'Santo Domingo',
                status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
            }
        });
    }
    async updateDevice(id, data) {
        return this.prisma.device.update({
            where: { id },
            data: {
                taxiNumber: data.taxiNumber,
                city: data.city,
                status: data.status,
                ...(data.driverId !== undefined && { driverId: data.driverId }),
            },
            include: { driver: true }
        });
    }
    async deleteDevice(deviceId) {
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ id: deviceId }, { deviceId: deviceId }] }
        });
        if (!device)
            return { success: false, message: 'Dispositivo no encontrado' };
        const uuid = device.id;
        const hwId = device.deviceId;
        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.analyticsEvent.deleteMany({ where: { deviceId: hwId } });
                await tx.campaignMetric.deleteMany({ where: { deviceId: uuid } });
                await tx.playbackEvent.deleteMany({ where: { deviceId: hwId } });
                await tx.deviceHeartbeat.deleteMany({ where: { deviceId: hwId } });
                await tx.playlistItem.deleteMany({ where: { deviceId: hwId } });
                await tx.driverLocation.deleteMany({ where: { deviceId: hwId } });
                await tx.deviceCommand.deleteMany({ where: { deviceId: uuid } });
                await tx.deviceCampaign.deleteMany({ where: { device_id: uuid } });
                await tx.subscription.deleteMany({ where: { deviceId: hwId } });
                await tx.notification.deleteMany({
                    where: {
                        OR: [
                            { entityId: uuid },
                            { entityId: hwId }
                        ]
                    }
                });
                await tx.device.delete({ where: { id: uuid } });
                this.logger.log(`🗑️ Device ${hwId} (${uuid}) completely purged from system.`);
                return { success: true, message: `Dispositivo ${hwId} eliminado correctamente` };
            });
        }
        catch (error) {
            this.logger.error(`❌ Failed to delete device ${hwId}: ${error.message}`);
            throw new Error(`Error al eliminar nodo: ${error.message}`);
        }
    }
    async getDeviceProfile(deviceId) {
        try {
            const device = await this.prisma.device.findFirst({
                where: { OR: [{ id: deviceId }, { deviceId: deviceId }] },
                include: {
                    driver: true,
                    campaigns: { include: { campaign: { select: { id: true, name: true, advertiser: true, active: true } } } },
                }
            });
            if (!device) {
                this.logger.warn(`🔍 Perfil solicitado para dispositivo inexistente: ${deviceId}`);
                return { error: 'Dispositivo no encontrado' };
            }
            return {
                id: device.id,
                device_id: device.deviceId,
                taxi_number: device.taxiNumber,
                city: device.city,
                status: device.status,
                battery_level: device.batteryLevel,
                storage_free: device.storageFree,
                app_version: device.appVersion,
                last_seen: device.lastSeen,
                player_status: device.playerStatus,
                driver: device.driver ? {
                    id: device.driver.id,
                    fullName: device.driver.fullName,
                    phone: device.driver.phone,
                    cedula: device.driver.cedula,
                    licensePlate: device.driver.licensePlate,
                    taxiPlate: device.driver.taxiPlate,
                    subscriptionPaid: device.driver.subscriptionPaid,
                    status: device.driver.status,
                } : null,
                campaigns: device.campaigns
                    .filter(c => c.campaign)
                    .map(c => ({
                    id: c.campaign.id,
                    name: c.campaign.name,
                    advertiser: c.campaign.advertiser,
                    active: c.campaign.active,
                    assigned_at: c.assigned_at,
                })),
            };
        }
        catch (error) {
            this.logger.error(`❌ Error fatal cargando perfil de ${deviceId}: ${error.message}`);
            return {
                error: 'Excepción interna al procesar el perfil',
                message: error.message
            };
        }
    }
    async updateDeviceProfile(deviceId, data) {
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ id: deviceId }, { deviceId: deviceId }] },
            include: { driver: true }
        });
        if (!device)
            throw new common_1.BadRequestException('Dispositivo no encontrado');
        const updateData = {};
        if (data.taxi_number !== undefined)
            updateData.taxiNumber = data.taxi_number;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (device.driver) {
            updateData.driver = {
                update: {
                    fullName: data.driver_name !== undefined ? data.driver_name : device.driver.fullName,
                    phone: data.driver_phone !== undefined ? data.driver_phone : device.driver.phone,
                    subscriptionPaid: data.subscription_paid !== undefined ? data.subscription_paid : device.driver.subscriptionPaid
                }
            };
        }
        else if (data.driver_name) {
            updateData.driver = {
                create: {
                    fullName: data.driver_name,
                    phone: data.driver_phone || 'N/A',
                    subscriptionPaid: data.subscription_paid || false,
                    licensePlate: data.taxi_number || 'N/A',
                    taxiNumber: data.taxi_number || 'N/A',
                }
            };
        }
        const updated = await this.prisma.device.update({
            where: { id: device.id },
            data: updateData
        });
        return { success: true, message: 'Perfil actualizado', device: updated };
    }
    async sendDeviceCommand(deviceId, body) {
        if (!KIOSK_COMMAND_TYPES.includes(body.commandType)) {
            throw new common_1.BadRequestException(`Invalid command type: ${body.commandType}. Valid types: ${KIOSK_COMMAND_TYPES.join(', ')}`);
        }
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ id: deviceId }, { deviceId: deviceId }] },
        });
        if (!device)
            throw new common_1.BadRequestException('Dispositivo no encontrado');
        const command = await this.prisma.deviceCommand.create({
            data: {
                deviceId: device.id,
                commandType: body.commandType,
                commandParams: body.params ? JSON.stringify(body.params) : null,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + business_rules_1.BUSINESS_RULES.COMMAND_TTL_DAYS * 24 * 3600 * 1000),
            },
        });
        this.logger.log(`📤 Command ${body.commandType} queued for device ${device.deviceId}`);
        return { success: true, command };
    }
    async broadcastCommand(body) {
        if (!KIOSK_COMMAND_TYPES.includes(body.commandType)) {
            throw new common_1.BadRequestException(`Invalid command type: ${body.commandType}`);
        }
        const where = { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE };
        if (body.city)
            where.city = body.city;
        if (body.fleet)
            where.fleet = body.fleet;
        const devices = await this.prisma.device.findMany({
            where,
            select: { id: true, deviceId: true },
        });
        if (devices.length === 0) {
            return { success: false, message: 'No devices found for this filter' };
        }
        const commands = await this.prisma.deviceCommand.createMany({
            data: devices.map(d => ({
                deviceId: d.id,
                commandType: body.commandType,
                commandParams: body.params ? JSON.stringify(body.params) : null,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + business_rules_1.BUSINESS_RULES.COMMAND_TTL_DAYS * 24 * 3600 * 1000),
            })),
        });
        this.logger.log(`📤 Broadcast ${body.commandType} to ${devices.length} devices`);
        return { success: true, count: commands.count, commandType: body.commandType };
    }
};
exports.DeviceAdminController = DeviceAdminController;
__decorate([
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DeviceAdminController.prototype, "getPendingDevices", null);
__decorate([
    (0, common_1.Post)(':deviceId/approve'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeviceAdminController.prototype, "approveDevice", null);
__decorate([
    (0, common_1.Delete)(':deviceId/reject'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DeviceAdminController.prototype, "rejectDevice", null);
__decorate([
    (0, common_1.Get)(':deviceId/campaigns'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "getDeviceCampaigns", null);
__decorate([
    (0, common_1.Delete)(':deviceId/campaigns/:campaignId'),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Param)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "removeCampaignFromDevice", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "createDevice", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "updateDevice", null);
__decorate([
    (0, common_1.Delete)(':deviceId'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "deleteDevice", null);
__decorate([
    (0, common_1.Get)(':deviceId/profile'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "getDeviceProfile", null);
__decorate([
    (0, common_1.Put)(':deviceId/profile'),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "updateDeviceProfile", null);
__decorate([
    (0, common_1.Post)(':deviceId/command'),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "sendDeviceCommand", null);
__decorate([
    (0, common_1.Post)('broadcast'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeviceAdminController.prototype, "broadcastCommand", null);
exports.DeviceAdminController = DeviceAdminController = DeviceAdminController_1 = __decorate([
    (0, common_1.Controller)('devices'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        device_service_1.DeviceService])
], DeviceAdminController);
//# sourceMappingURL=device-admin.controller.js.map