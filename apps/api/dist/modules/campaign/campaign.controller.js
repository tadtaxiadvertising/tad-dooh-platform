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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignController = void 0;
const common_1 = require("@nestjs/common");
const campaign_service_1 = require("./campaign.service");
const create_campaign_dto_1 = require("./dto/create-campaign.dto");
const add_media_asset_dto_1 = require("./dto/add-media-asset.dto");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_decorator_2 = require("../auth/decorators/roles.decorator");
const media_service_1 = require("../media/media.service");
const prisma_service_1 = require("../prisma/prisma.service");
const video_generator_service_1 = require("./video-generator.service");
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
    weight: true,
};
const mediaSafeSelect = {
    id: true,
    name: true,
    filename: true,
    originalFilename: true,
    mime_type: true,
    mimeType: true,
    durationSeconds: true,
    width: true,
    height: true,
    storageKey: true,
    url: true,
    cdnUrl: true,
    hash: true,
    hashMd5: true,
    hashSha256: true,
    campaign_id: true,
    status: true,
    createdAt: true,
    qrUrl: true,
};
let CampaignController = class CampaignController {
    constructor(campaignService, prisma, mediaService, videoGenerator) {
        this.campaignService = campaignService;
        this.prisma = prisma;
        this.mediaService = mediaService;
        this.videoGenerator = videoGenerator;
    }
    async getAdvertiserHub() {
        const advertisers = await this.prisma.advertiser.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                companyName: true,
                category: true,
                whatsapp: true,
                instagram: true,
                websiteUrl: true,
                pedidosYaUrl: true,
                uberEatsUrl: true,
            },
            orderBy: { companyName: 'asc' }
        });
        return advertisers;
    }
    async getAdvertiserProfile(id) {
        const advertiser = await this.prisma.advertiser.findUnique({
            where: { id },
            select: {
                id: true,
                companyName: true,
                contactName: true,
                whatsapp: true,
                instagram: true,
                facebook: true,
                websiteUrl: true,
                pedidosYaUrl: true,
                uberEatsUrl: true,
                productsData: true,
            }
        });
        if (!advertiser)
            throw new common_1.NotFoundException('Anunciante no encontrado');
        const activeCampaign = await this.prisma.campaign.findFirst({
            where: {
                OR: [
                    { advertiserId: advertiser.id },
                    { advertiser: advertiser.companyName }
                ],
                active: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
            },
            orderBy: { updatedAt: 'desc' }
        });
        const profile = {
            ...advertiser,
            whatsapp: activeCampaign?.whatsapp || advertiser.whatsapp,
            instagram: activeCampaign?.instagram || advertiser.instagram,
            facebook: activeCampaign?.facebook || advertiser.facebook,
            websiteUrl: activeCampaign?.websiteUrl || advertiser.websiteUrl,
            pedidosYaUrl: activeCampaign?.pedidosYaUrl || advertiser.pedidosYaUrl,
            uberEatsUrl: activeCampaign?.uberEatsUrl || advertiser.uberEatsUrl,
        };
        return profile;
    }
    async updateCampaign(id, dto, req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        const campaign = await this.campaignService.getCampaignById(id);
        if (!campaign)
            throw new common_1.NotFoundException('Campaña no encontrada');
        if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
            throw new common_1.ForbiddenException('No tienes permisos para editar esta campaña');
        }
        return this.campaignService.updateCampaign(id, dto);
    }
    async createCampaign(dto, req) {
        return this.campaignService.createCampaign(dto, req.user);
    }
    async registerMedia(dto, req) {
        return this.campaignService.registerDirectMedia(dto, req.user);
    }
    async simulateBudget(body) {
        return this.campaignService.simulateImpact(body.budgetRD, body.city);
    }
    async generateVideo(id, props, req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        const campaign = await this.campaignService.getCampaignById(id);
        if (!campaign)
            throw new common_1.NotFoundException('Campaña no encontrada');
        if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
            throw new common_1.ForbiddenException('No tienes permisos para generar video en esta campaña');
        }
        return this.videoGenerator.generateAdVideo(id, props);
    }
    async addMediaAsset(id, dto, req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        const campaign = await this.campaignService.getCampaignById(id);
        if (!campaign)
            throw new common_1.NotFoundException('Campaña no encontrada');
        if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
            throw new common_1.ForbiddenException('No tienes permisos para agregar archivos a esta campaña');
        }
        return await this.campaignService.addMediaAsset(id, dto);
    }
    async getAllCampaigns(req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        if (role === 'ADVERTISER' && entityId) {
            return this.prisma.campaign.findMany({
                where: { advertiserId: entityId },
                include: { mediaAssets: { select: mediaAssetSafeSelect }, media: { select: mediaSafeSelect } },
                orderBy: { createdAt: 'desc' },
            });
        }
        return this.campaignService.getAllCampaigns();
    }
    async assignToDevices(id, deviceIds) {
        return this.campaignService.assignCampaignToDevices(id, deviceIds);
    }
    async getCampaignDistribution(id) {
        try {
            const campaign = await this.prisma.campaign.findUnique({
                where: { id },
                select: { name: true }
            });
            if (!campaign)
                throw new common_1.NotFoundException('Campaña no encontrada');
            const distributions = await this.prisma.deviceCampaign.findMany({
                where: { campaign_id: id }
            });
            if (distributions.length === 0) {
                const v1Dist = await this.prisma.playlistItem.findMany({
                    where: { campaignId: id }
                });
                const deviceIds = v1Dist.map(v => v.deviceId);
                const devices = await this.prisma.device.findMany({
                    where: { deviceId: { in: deviceIds } }
                });
                const assignedTaxis = devices.map(d => ({
                    id: d.id,
                    deviceId: d.deviceId,
                    taxiNumber: d.taxiNumber || d.deviceId,
                    driverName: 'No asignado',
                    status: d.status,
                    last_heartbeat: d.lastHeartbeat,
                    is_online: d.lastHeartbeat
                        ? (new Date().getTime() - new Date(d.lastHeartbeat).getTime() < 300000)
                        : false
                }));
                return {
                    campaign_name: campaign.name,
                    total_screens: assignedTaxis.length,
                    monthly_revenue: assignedTaxis.length * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
                    taxis: assignedTaxis
                };
            }
            const deviceUuids = distributions.map(d => d.device_id || d.deviceId);
            const devices = await this.prisma.device.findMany({
                where: { id: { in: deviceUuids.filter(Boolean) } }
            });
            const assignedTaxis = devices.map(d => ({
                id: d.id,
                deviceId: d.deviceId,
                taxiNumber: d.taxiNumber || d.deviceId,
                driverName: 'No asignado',
                status: d.status,
                last_heartbeat: d.lastHeartbeat,
                is_online: d.lastHeartbeat
                    ? (new Date().getTime() - new Date(d.lastHeartbeat).getTime() < 300000)
                    : false
            }));
            return {
                campaign_name: campaign.name,
                total_screens: assignedTaxis.length,
                monthly_revenue: assignedTaxis.length * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
                taxis: assignedTaxis
            };
        }
        catch (e) {
            console.error('DISTRIBUTION_ERROR:', e.message);
            throw e;
        }
    }
    async getCampaignDevices(campaignId) {
        console.log(`[CAMPAIGN_DEBUG] Fetching devices for campaign: ${campaignId}`);
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { targetAll: true, isGlobal: true, targetCity: true, name: true }
        });
        if (!campaign) {
            console.warn(`[CAMPAIGN_DEBUG] Campaign ${campaignId} NOT FOUND`);
            return [];
        }
        console.log(`[CAMPAIGN_DEBUG] Campaign: ${campaign.name}, targetAll: ${campaign.targetAll}, isGlobal: ${campaign.isGlobal}`);
        if (campaign.targetAll || campaign.isGlobal) {
            const allDevices = await this.prisma.device.findMany({
                where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
                orderBy: { lastSeen: 'desc' }
            });
            return allDevices.map(d => ({
                ...d,
                assigned_at: null,
                assignment_type: 'GLOBAL'
            }));
        }
        const assignments = await this.prisma.deviceCampaign.findMany({
            where: { campaign_id: campaignId },
            include: {
                device: true,
            },
        });
        console.log(`[CAMPAIGN_DEBUG] Explicit assignments found: ${assignments.length}`);
        const targetedDriverDevices = await this.prisma.device.findMany({
            where: {
                driver: {
                    campaigns: { some: { id: campaignId } }
                }
            }
        });
        console.log(`[CAMPAIGN_DEBUG] Driver targeted devices found: ${targetedDriverDevices.length}`);
        const deviceMap = new Map();
        for (const a of assignments) {
            if (a.device) {
                deviceMap.set(a.device.id, {
                    ...a.device,
                    assigned_at: a.assigned_at,
                    assignment_type: 'DIRECT'
                });
            }
        }
        for (const d of targetedDriverDevices) {
            if (!deviceMap.has(d.id)) {
                deviceMap.set(d.id, {
                    ...d,
                    assigned_at: null,
                    assignment_type: 'DRIVER'
                });
            }
        }
        const result = Array.from(deviceMap.values());
        console.log(`[CAMPAIGN_DEBUG] Final merged device list: ${result.length}`);
        return result;
    }
    async getTabletPlaylist(deviceId) {
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ deviceId }, { id: deviceId }] },
            include: { driver: true }
        });
        if (!device) {
            return { campaigns: [], message: 'Dispositivo no encontrado' };
        }
        const driverId = device.driver?.id;
        const campaigns = await this.prisma.campaign.findMany({
            where: {
                status: 'ACTIVE',
                active: true,
                OR: [
                    { targetAll: true },
                    ...(driverId ? [{ targetDrivers: { some: { id: driverId } } }] : []),
                ]
            },
            select: {
                id: true,
                name: true,
                advertiser: true,
                media: {
                    select: {
                        id: true,
                        url: true,
                        name: true,
                        mimeType: true,
                        hashMd5: true,
                    }
                },
                mediaAssets: {
                    select: {
                        id: true,
                        url: true,
                        filename: true,
                    }
                },
                targetAll: true,
            }
        });
        return {
            deviceId: device.deviceId,
            driverName: device.driver?.fullName || 'Sin chofer',
            totalCampaigns: campaigns.length,
            campaigns,
        };
    }
    async assignDrivers(id, body) {
        return this.prisma.campaign.update({
            where: { id },
            data: {
                targetAll: body.targetAll,
                targetDrivers: {
                    set: body.driverIds.map(dId => ({ id: dId })),
                },
            },
            include: { targetDrivers: { select: { id: true, fullName: true } } }
        });
    }
    async linkMediaToCampaign(campaignId, mediaId) {
        if (!mediaId)
            throw new common_1.NotFoundException('mediaId is required');
        return this.campaignService.linkMediaToCampaign(campaignId, mediaId);
    }
    async unlinkMediaFromCampaign(campaignId, mediaId) {
        if (!mediaId)
            throw new common_1.NotFoundException('mediaId is required');
        let success = false;
        try {
            const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
            if (media && media.campaign_id === campaignId) {
                await this.prisma.media.update({
                    where: { id: mediaId },
                    data: { campaign_id: null },
                });
                success = true;
            }
        }
        catch (e) { }
        if (!success) {
            try {
                const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
                if (asset && asset.campaignId === campaignId) {
                    await this.prisma.mediaAsset.delete({ where: { id: mediaId } });
                    success = true;
                }
            }
            catch (e) { }
        }
        if (!success) {
            try {
                await this.prisma.mediaAsset.deleteMany({
                    where: { checksum: mediaId, campaignId: campaignId }
                });
                success = true;
            }
            catch (e) { }
        }
        if (success) {
            const campaign = await this.prisma.campaign.update({
                where: { id: campaignId },
                data: { updatedAt: new Date() }
            });
            let devicesToSync = [];
            if (campaign.targetAll || campaign.isGlobal) {
                devicesToSync = (await this.prisma.device.findMany({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE }, select: { id: true } }));
            }
            else {
                const assignments = await this.prisma.deviceCampaign.findMany({ where: { campaign_id: campaignId } });
                devicesToSync = assignments.map(a => ({ id: a.device_id }));
            }
            if (devicesToSync.length > 0) {
                await this.prisma.deviceCommand.createMany({
                    data: devicesToSync.map(d => ({
                        deviceId: d.id,
                        commandType: 'FORCE_SYNC',
                        commandParams: JSON.stringify({ reason: 'media_unlinked' }),
                    }))
                });
            }
            common_1.Logger.log(`[CONTENT_DIST] Unlinked/deleted media ${mediaId} from campaign ${campaignId}`);
        }
        return { success: true };
    }
    async deleteCampaign(id, req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        const campaign = await this.prisma.campaign.findUnique({ where: { id } });
        if (!campaign)
            throw new common_1.NotFoundException('Campaña no encontrada');
        if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
            throw new common_1.ForbiddenException('No tienes permisos para eliminar esta campaña');
        }
        await this.prisma.mediaAsset.deleteMany({ where: { campaignId: id } });
        await this.prisma.video.deleteMany({ where: { campaignId: id } });
        await this.prisma.deviceCampaign.deleteMany({ where: { campaign_id: id } });
        await this.prisma.playlistItem.deleteMany({ where: { campaignId: id } });
        await this.prisma.playlist.deleteMany({ where: { campaignId: id } });
        await this.prisma.campaignMetric.deleteMany({ where: { campaignId: id } });
        await this.prisma.media.updateMany({ where: { campaign_id: id }, data: { campaign_id: null } });
        return this.prisma.campaign.delete({ where: { id } });
    }
    async getReportsSummary(req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        const advertiserId = role === 'ADVERTISER' ? entityId : undefined;
        return this.campaignService.getCampaignReports(advertiserId);
    }
    async createIntent(createCampaignIntentDto) {
        return this.campaignService.createIntent(createCampaignIntentDto);
    }
    async getCampaignById(id, req) {
        const role = req.user?.role;
        const entityId = req.user?.entityId;
        const campaign = await this.campaignService.getCampaignById(id);
        if (!campaign)
            throw new common_1.NotFoundException('Campaña no encontrada');
        if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
            throw new common_1.ForbiddenException('No tienes permisos para ver esta campaña');
        }
        return campaign;
    }
};
exports.CampaignController = CampaignController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('advertiser/hub'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getAdvertiserHub", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('advertiser/:id/profile'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getAdvertiserProfile", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "updateCampaign", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_campaign_dto_1.CreateCampaignDto, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Post)('register-media'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "registerMedia", null);
__decorate([
    (0, common_1.Post)('simulate-budget'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "simulateBudget", null);
__decorate([
    (0, common_1.Post)(':id/generate-video'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "generateVideo", null);
__decorate([
    (0, common_1.Post)(':id/assets'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_media_asset_dto_1.AddMediaAssetDto, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "addMediaAsset", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getAllCampaigns", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('deviceIds')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "assignToDevices", null);
__decorate([
    (0, common_1.Get)('stats/:id/distribution'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getCampaignDistribution", null);
__decorate([
    (0, common_1.Get)(':campaignId/devices'),
    __param(0, (0, common_1.Param)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getCampaignDevices", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('tablet/:deviceId/playlist'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getTabletPlaylist", null);
__decorate([
    (0, common_1.Post)(':id/drivers'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "assignDrivers", null);
__decorate([
    (0, common_1.Post)(':id/link-media'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('mediaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "linkMediaToCampaign", null);
__decorate([
    (0, common_1.Post)(':id/unlink-media'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('mediaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "unlinkMediaFromCampaign", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "deleteCampaign", null);
__decorate([
    (0, common_1.Get)('reports/summary'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getReportsSummary", null);
__decorate([
    (0, common_1.Post)('intent'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "createIntent", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CampaignController.prototype, "getCampaignById", null);
exports.CampaignController = CampaignController = __decorate([
    (0, common_1.Controller)('campaigns'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __metadata("design:paramtypes", [campaign_service_1.CampaignService,
        prisma_service_1.PrismaService,
        media_service_1.MediaService,
        video_generator_service_1.VideoGeneratorService])
], CampaignController);
//# sourceMappingURL=campaign.controller.js.map