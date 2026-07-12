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
var CampaignService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../supabase/supabase.service");
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
    weight: true,
};
let CampaignService = CampaignService_1 = class CampaignService {
    constructor(prisma, supabaseService) {
        this.prisma = prisma;
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(CampaignService_1.name);
    }
    async updateCampaign(id, dto) {
        const data = {};
        if (dto.name)
            data.name = dto.name;
        if (dto.advertiser)
            data.advertiser = dto.advertiser;
        if (dto.advertiser_id)
            data.advertiserId = dto.advertiser_id;
        if (dto.start_date)
            data.startDate = new Date(dto.start_date);
        if (dto.end_date)
            data.endDate = new Date(dto.end_date);
        if (dto.active !== undefined)
            data.active = dto.active;
        if (dto.target_all !== undefined)
            data.targetAll = dto.target_all;
        if (dto.target_city)
            data.targetCity = dto.target_city;
        if (dto.budget !== undefined)
            data.budget = Number(dto.budget);
        if (dto.target_impressions !== undefined)
            data.targetImpressions = Number(dto.target_impressions);
        if (dto.whatsapp !== undefined)
            data.whatsapp = dto.whatsapp;
        if (dto.instagram !== undefined)
            data.instagram = dto.instagram;
        if (dto.facebook !== undefined)
            data.facebook = dto.facebook;
        if (dto.websiteUrl !== undefined)
            data.websiteUrl = dto.websiteUrl;
        if (dto.pedidosYaUrl !== undefined)
            data.pedidosYaUrl = dto.pedidosYaUrl;
        if (dto.uberEatsUrl !== undefined)
            data.uberEatsUrl = dto.uberEatsUrl;
        const campaign = await this.prisma.campaign.update({
            where: { id },
            data,
        });
        if (dto.target_devices) {
            await this.assignCampaignToDevices(id, dto.target_devices);
        }
        else {
            let devicesToSync = [];
            if (campaign.targetAll || campaign.isGlobal) {
                devicesToSync = (await this.prisma.device.findMany({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE }, select: { id: true, deviceId: true } }));
            }
            else {
                const assignmentsV2 = await this.prisma.deviceCampaign.findMany({ where: { campaign_id: id }, select: { device_id: true } });
                const assignmentsV1 = await this.prisma.playlistItem.findMany({ where: { campaignId: id }, include: { device: { select: { id: true } } } });
                const uniqueDeviceIds = new Set([
                    ...assignmentsV2.map(a => a.device_id),
                    ...assignmentsV1.map(a => a.device.id)
                ]);
                devicesToSync = Array.from(uniqueDeviceIds).map(id => ({ id }));
            }
            if (devicesToSync.length > 0) {
                await this.prisma.deviceCommand.createMany({
                    data: devicesToSync.map(d => ({
                        deviceId: d.id,
                        commandType: 'FORCE_SYNC',
                        commandParams: JSON.stringify({ reason: 'campaign_updated' }),
                        status: 'PENDING',
                        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
                    }))
                });
            }
        }
        if (campaign.status === 'ACTIVE') {
            await this.prisma.refreshActiveCampaignsView();
            this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
                reason: 'campaign_updated',
                campaignId: id
            }).catch(() => { });
        }
        return campaign;
    }
    async createCampaign(dto, user) {
        const isAdmin = user?.role === 'ADMIN';
        const isAdvertiser = user?.role === 'ADVERTISER';
        let assignedAdvertiser = dto.advertiser;
        let assignedAdvertiserId = dto.advertiser_id;
        let initialStatus = dto.active ? 'ACTIVE' : 'DRAFT';
        if (isAdvertiser && user?.entityId) {
            assignedAdvertiserId = user.entityId;
            const advertiser = await this.prisma.advertiser.findUnique({ where: { id: user.entityId } });
            assignedAdvertiser = advertiser?.companyName || assignedAdvertiser;
            initialStatus = 'PENDING_REVIEW';
        }
        else if (!isAdmin && user?.email && !assignedAdvertiserId) {
            const advertiser = await this.prisma.advertiser.findUnique({ where: { email: user.email } });
            if (advertiser) {
                assignedAdvertiserId = advertiser.id;
                assignedAdvertiser = advertiser.companyName;
            }
            initialStatus = 'PENDING_REVIEW';
        }
        const campaign = await this.prisma.campaign.create({
            data: {
                name: dto.name,
                advertiser: assignedAdvertiser,
                advertiserId: assignedAdvertiserId,
                startDate: new Date(dto.start_date),
                endDate: new Date(dto.end_date),
                active: initialStatus === 'ACTIVE',
                status: initialStatus,
                targetImpressions: dto.target_impressions || 0,
                budget: dto.budget || 0,
                targetAll: dto.target_all !== undefined ? dto.target_all : false,
                targetCity: dto.target_city || 'Global',
                category: dto.category || 'General',
                whatsapp: dto.whatsapp,
                instagram: dto.instagram,
                facebook: dto.facebook,
                websiteUrl: dto.websiteUrl,
                pedidosYaUrl: dto.pedidosYaUrl,
                uberEatsUrl: dto.uberEatsUrl,
            },
        });
        let devicesToAssign = dto.target_devices || [];
        if (devicesToAssign.length === 0 && !dto.target_all && dto.target_city) {
            this.logger.log(`🤖 Auto-asignando dispositivos para campaña ${campaign.id} en ${dto.target_city}`);
            const limit = Math.floor((dto.budget || 3000) / 3000) || 10;
            const optimalDevices = await this.getOptimalDevicesForCampaign(dto.target_city, limit);
            devicesToAssign = optimalDevices.map(d => d.deviceId);
        }
        if (devicesToAssign.length > 0) {
            await this.assignCampaignToDevices(campaign.id, devicesToAssign);
        }
        if (campaign.status === 'ACTIVE') {
            await this.prisma.refreshActiveCampaignsView();
            this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
                reason: 'campaign_created',
                campaignId: campaign.id
            }).catch(() => { });
        }
        return campaign;
    }
    async assignCampaignToDevices(campaignId, idOrHwIds) {
        const devices = await this.prisma.device.findMany({
            where: {
                OR: [
                    { id: { in: idOrHwIds } },
                    { deviceId: { in: idOrHwIds } }
                ]
            },
            select: { id: true, deviceId: true, _count: { select: { campaigns: true } } }
        });
        if (devices.length === 0 && idOrHwIds.length > 0) {
            this.logger.warn(`⚠️ No devices found for ${idOrHwIds.length} provided IDs.`);
        }
        const availableDevices = devices.filter(d => d._count.campaigns < business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER);
        const skippedCount = devices.length - availableDevices.length;
        return await this.prisma.$transaction(async (tx) => {
            await tx.playlistItem.deleteMany({ where: { campaignId } });
            await tx.deviceCampaign.deleteMany({ where: { campaign_id: campaignId } });
            await tx.campaign.update({
                where: { id: campaignId },
                data: { updatedAt: new Date() }
            });
            if (availableDevices.length === 0)
                return { count: 0, skipped: skippedCount };
            const dataV1 = availableDevices.map(d => ({ campaignId, deviceId: d.deviceId }));
            const dataV2 = availableDevices.map(d => ({ campaign_id: campaignId, device_id: d.id }));
            await tx.playlistItem.createMany({ data: dataV1 });
            await tx.deviceCampaign.createMany({ data: dataV2 });
            const commands = availableDevices.map(d => ({
                deviceId: d.id,
                commandType: 'FORCE_SYNC',
                commandParams: JSON.stringify({ reason: 'campaign_assigned', campaignId, deviceId: d.deviceId }),
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
            }));
            await tx.deviceCommand.createMany({ data: commands });
            this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
                reason: 'campaign_assigned',
                campaignId,
                targets: availableDevices.map(d => d.deviceId)
            }).catch(e => this.logger.warn(`Realtime broadcast failed: ${e.message}`));
            this.prisma.refreshActiveCampaignsView().catch(e => this.logger.error(`View refresh failed: ${e.message}`));
            return { count: availableDevices.length, skipped: skippedCount };
        });
    }
    async assignCampaignToDevice(deviceId, campaignId) {
        const currentCount = await this.prisma.deviceCampaign.count({
            where: { device_id: deviceId }
        });
        if (currentCount >= business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER) {
            throw new common_1.BadRequestException(`Este taxi ya tiene los ${business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER} slots de 30s ocupados.`);
        }
        return await this.prisma.deviceCampaign.create({
            data: { device_id: deviceId, campaign_id: campaignId }
        });
    }
    async registerDirectMedia(dto, user) {
        this.logger.debug(`[MEDIA_REG] Intentando registro de ${dto.fileName} (${dto.fileSize} bytes)`);
        if (user?.role !== 'ADMIN') {
            if (user?.entityId) {
                if (dto.brandId && user.entityId !== dto.brandId) {
                    this.logger.warn(`[MEDIA_REG] Rechazado: Entidad no coincide. Token=${user.entityId}, DTO=${dto.brandId}`);
                    throw new common_1.BadRequestException('ID de marca no coincide con tu perfíl de anunciante');
                }
            }
            else if (user?.email && dto.brandId) {
                const advertiser = await this.prisma.advertiser.findUnique({ where: { email: user.email } });
                if (!advertiser || advertiser.id !== dto.brandId) {
                    this.logger.warn(`[MEDIA_REG] Rechazado: No se encontró anunciante o ID incorrecto para ${user.email}`);
                    throw new common_1.BadRequestException('No tienes permisos suficientes para esta marca');
                }
            }
        }
        if (dto.fileSize && Number(dto.fileSize) > business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES) {
            this.logger.warn(`[MEDIA_REG] Archivo demasiado grande: ${dto.fileSize} > ${business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES}`);
            throw new common_1.BadRequestException(`El archivo excede el límite permitido de ${business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`);
        }
        try {
            const media = await this.prisma.media.create({
                data: {
                    filename: dto.fileName,
                    originalFilename: dto.fileName,
                    url: dto.url,
                    fileSize: dto.fileSize ? BigInt(Math.round(Number(dto.fileSize))) : BigInt(0),
                    storageKey: dto.storagePath,
                    status: 'READY'
                }
            });
            this.logger.log(`✅ [MEDIA_REG] Media registrada con éxito: ${media.id}`);
            return { success: true, media };
        }
        catch (e) {
            this.logger.error(`❌ [MEDIA_REG] Error en base de datos: ${e.message}`);
            throw new common_1.BadRequestException(`Error al guardar en base de datos: ${e.message}`);
        }
    }
    async addMediaAsset(campaignId, dto) {
        const deviceId = dto.deviceId;
        if (deviceId) {
            const activeData = await this.getActiveSyncVideos(deviceId);
            if (activeData.media_assets.length >= business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER) {
                throw new common_1.BadRequestException(`Pantalla llena (Límite de ${business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER} slots alcanzado)`);
            }
        }
        const asset = await this.prisma.mediaAsset.create({
            data: {
                campaignId,
                type: dto.type,
                filename: dto.filename,
                url: dto.url,
                fileSize: Math.round(Number(dto.fileSize || 0)),
                checksum: dto.checksum || 'manual-upload',
                duration: Math.round(Number(dto.duration || 30)),
                version: 1,
            },
        });
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
                    commandParams: JSON.stringify({ reason: 'media_asset_added', campaignId, assetId: asset.id }),
                    status: 'PENDING',
                    expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
                }))
            });
        }
        else {
            const allActiveDevices = await this.prisma.device.findMany({
                where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
                select: { id: true }
            });
            if (allActiveDevices.length > 0) {
                await this.prisma.deviceCommand.createMany({
                    data: allActiveDevices.map(d => ({
                        deviceId: d.id,
                        commandType: 'FORCE_SYNC',
                        commandParams: JSON.stringify({ reason: 'global_media_asset_added', campaignId, assetId: asset.id }),
                        status: 'PENDING',
                        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
                    }))
                });
            }
        }
        const isRendering = dto.status === 'RENDERING';
        if (!isRendering) {
            this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
                reason: 'media_asset_added',
                campaignId,
                assetId: asset.id,
                count: devicesToSync.length
            }).catch(() => { });
        }
        else {
            common_1.Logger.log(`[CONTENT_DIST] MediaAsset ${asset.id} is rendering. WAKE_UP_CALL deferred.`);
        }
        return asset;
    }
    async getAllCampaigns() {
        return this.prisma.campaign.findMany({
            include: { mediaAssets: { select: mediaAssetSafeSelect }, media: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCampaignById(id) {
        return this.prisma.campaign.findUnique({
            where: { id },
            include: { mediaAssets: { select: mediaAssetSafeSelect }, media: true },
        });
    }
    async getActiveSyncVideos(deviceIdOrUuid, deviceCity) {
        const now = new Date();
        this.logger.log(`🕒 Sync Internal Clock: ${now.toISOString()} (${now.getTime()})`);
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ id: deviceIdOrUuid }, { deviceId: deviceIdOrUuid }] },
            select: { id: true, deviceId: true, city: true, driverId: true }
        });
        if (!device) {
            this.logger.warn(`⚠️ getActiveSyncVideos: Device '${deviceIdOrUuid}' NOT FOUND in DB. Check if registerDevice was called first.`);
            return { version: 0, sync_hash: 'not-found', media_assets: [] };
        }
        const uuid = device.id;
        const hwId = device.deviceId;
        const city = deviceCity || device.city || 'Santiago';
        const driverId = device.driverId;
        this.logger.log(`🔎 Sync for device: hwId=${hwId}, uuid=${uuid}, city=${city}, driverId=${driverId || 'none'}`);
        let activeCampaigns = [];
        try {
            const results = await this.prisma.$queryRaw `
        SELECT campaign_id FROM mv_active_campaigns
        WHERE active = true 
          AND start_date <= NOW() 
          AND end_date >= NOW()
          AND (
            target_all = true OR 
            target_city = ${city} OR
            target_cities::text LIKE ${`%${city}%`} OR
            assigned_device_uuids::jsonb @> ${JSON.stringify([uuid])}::jsonb OR
            assigned_hw_ids::jsonb @> ${JSON.stringify([hwId])}::jsonb OR
            (assigned_driver_ids::jsonb @> ${JSON.stringify([driverId])}::jsonb AND ${!!driverId})
          )
        LIMIT 15
      `;
            const campaignIds = results.map(r => r.campaign_id);
            if (campaignIds.length > 0) {
                activeCampaigns = await this.prisma.campaign.findMany({
                    where: { id: { in: campaignIds } },
                    include: {
                        mediaAssets: { select: mediaAssetSafeSelect },
                        media: true,
                        videos: true,
                        advertiserRef: true,
                    },
                    orderBy: { updatedAt: 'desc' }
                });
            }
        }
        catch (primaryError) {
            this.logger.error(`❌ getActiveSyncVideos optimized query failed: ${primaryError?.message}. Falling back to legacy query.`);
            activeCampaigns = await this.prisma.campaign.findMany({
                where: {
                    active: true,
                    startDate: { lte: now },
                    endDate: { gte: now },
                    OR: [
                        { targetAll: true, OR: [{ targetCity: 'Global' }, { targetCity: city }] },
                        { devices: { some: { device_id: uuid } } },
                        { targets: { some: { deviceId: hwId } } },
                        ...(driverId ? [{ targetDrivers: { some: { id: driverId } } }] : [])
                    ]
                },
                include: {
                    mediaAssets: { select: mediaAssetSafeSelect },
                    media: true,
                    videos: true,
                    advertiserRef: true,
                },
                orderBy: { updatedAt: 'desc' }
            });
        }
        this.logger.log(`📊 Campaigns found for ${hwId}: ${activeCampaigns.length} total.`);
        activeCampaigns.forEach(c => {
            const assetsCount = (c.mediaAssets?.length || 0) + (c.media?.length || 0) + (c.videos?.length || 0);
            this.logger.log(`   📂 Campaign "${c.name}" [${c.id}] | active=${c.active} | targetAll=${c.targetAll} | assets=${assetsCount} | dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`);
        });
        if (!activeCampaigns || activeCampaigns.length === 0) {
            this.logger.warn(`⚠️ No active campaigns found for device ${hwId}. Check campaign dates, active flag, and device assignments.`);
            return { version: 0, sync_hash: 'empty', media_assets: [] };
        }
        const mediaAssets = [];
        for (const campaign of activeCampaigns) {
            const mapMediaAsset = (ma) => ({
                id: ma.id || ma.checksum || `asset-${Math.random().toString(36).substr(2, 9)}`,
                campaignId: campaign.id,
                filename: ma.filename || ma.name || ma.title || 'video.mp4',
                url: ma.cdnUrl || ma.url || '',
                checksum: ma.hashMd5 || ma.hash || ma.checksum || 'no-checksum',
                hashMd5: ma.hashMd5 || ma.hash || ma.checksum || null,
                duration: Number(ma.duration || 30),
                qrUrl: campaign.targetUrl || ma.qrUrl || null,
                advertiserId: campaign.advertiserRef?.id || campaign.advertiserId || null,
                advertiserName: campaign.advertiserRef?.companyName || campaign.advertiser || 'TAD Advertiser',
                weight: ma.weight ?? null,
            });
            if (campaign.mediaAssets)
                mediaAssets.push(...campaign.mediaAssets.map(mapMediaAsset));
            if (campaign.media)
                mediaAssets.push(...campaign.media.map(mapMediaAsset));
            if (campaign.videos)
                mediaAssets.push(...campaign.videos.map(mapMediaAsset));
        }
        const MAX_SLOTS = business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER;
        const finalMediaAssets = mediaAssets.slice(0, MAX_SLOTS);
        const hashBase = finalMediaAssets.map(a => `${a.id}:${a.checksum || 'no-checksum'}`).join('|');
        const syncHash = crypto.createHash('md5').update(hashBase).digest('hex');
        const latestUpdate = activeCampaigns[0].updatedAt.getTime();
        return {
            version: latestUpdate,
            sync_hash: syncHash,
            media_assets: finalMediaAssets
        };
    }
    async getCampaignReports(advertiserId, startDate, endDate) {
        const where = {};
        if (advertiserId) {
            where.campaign = { advertiserId };
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = startDate;
            if (endDate)
                where.date.lte = endDate;
        }
        const metrics = await this.prisma.campaignMetric.findMany({
            where,
            include: {
                campaign: {
                    select: { name: true, advertiser: true }
                }
            },
            orderBy: { date: 'asc' }
        });
        const summary = metrics.reduce((acc, curr) => {
            acc.impressions += curr.totalImpressions;
            acc.completions += curr.totalCompletions;
            return acc;
        }, { impressions: 0, completions: 0 });
        const byDate = metrics.reduce((acc, curr) => {
            const day = curr.date.toISOString().split('T')[0];
            if (!acc[day])
                acc[day] = { date: day, impressions: 0, completions: 0 };
            acc[day].impressions += curr.totalImpressions;
            acc[day].completions += curr.totalCompletions;
            return acc;
        }, {});
        const byCity = metrics.reduce((acc, curr) => {
            const city = curr.city || 'Desconocido';
            if (!acc[city])
                acc[city] = { city, impressions: 0 };
            acc[city].impressions += curr.totalImpressions;
            return acc;
        }, {});
        return {
            summary,
            timeSeries: Object.values(byDate),
            geographic: Object.values(byCity),
            totalRecords: metrics.length
        };
    }
    async linkMediaToCampaign(campaignId, mediaId) {
        const updated = await this.prisma.media.update({
            where: { id: mediaId },
            data: { campaign_id: campaignId },
        });
        const campaign = await this.prisma.campaign.update({
            where: { id: campaignId },
            data: { updatedAt: new Date() }
        });
        let devicesToSync = [];
        if (campaign.targetAll || campaign.isGlobal) {
            devicesToSync = await this.prisma.device.findMany({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE }, select: { id: true, deviceId: true } });
        }
        else {
            const assignments = await this.prisma.deviceCampaign.findMany({
                where: { campaign_id: campaignId },
                include: { device: { select: { deviceId: true } } }
            });
            devicesToSync = assignments.map(a => ({ id: a.device_id, deviceId: a.device.deviceId }));
        }
        if (devicesToSync.length > 0) {
            await this.prisma.deviceCommand.createMany({
                data: devicesToSync.map(d => ({
                    deviceId: d.id,
                    commandType: 'FORCE_SYNC',
                    commandParams: JSON.stringify({ reason: 'media_linked', campaignId, mediaId }),
                    status: 'PENDING',
                    expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
                }))
            });
            this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
                reason: 'media_linked',
                campaignId,
                mediaId,
                targets: devicesToSync.map(d => d.deviceId)
            }).catch(() => { });
        }
        return updated;
    }
    async getOptimalDevicesForCampaign(campaignCity, limit) {
        const devices = await this.prisma.device.findMany({
            where: {
                city: campaignCity === 'Global' ? undefined : campaignCity,
                status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                connectivityStatus: 'ONLINE',
            },
            include: {
                driver: {
                    select: { level: true },
                },
                _count: {
                    select: { campaigns: true },
                },
            },
        });
        const availableDevices = devices.filter((d) => d._count.campaigns < business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER);
        const priorityMap = {
            [business_rules_1.BUSINESS_RULES.LEVELS.ORO.label]: business_rules_1.BUSINESS_RULES.LEVELS.ORO.priority,
            [business_rules_1.BUSINESS_RULES.LEVELS.PLATA.label]: business_rules_1.BUSINESS_RULES.LEVELS.PLATA.priority,
            [business_rules_1.BUSINESS_RULES.LEVELS.BASE.label]: business_rules_1.BUSINESS_RULES.LEVELS.BASE.priority,
        };
        availableDevices.sort((a, b) => {
            const priorityA = priorityMap[a.driver?.level || 'BASE'] || 0;
            const priorityB = priorityMap[b.driver?.level || 'BASE'] || 0;
            return priorityB - priorityA;
        });
        return availableDevices.slice(0, limit);
    }
    async simulateImpact(budgetRD, city) {
        const costPerScreen = business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
        const uniqueReachPerScreen = 2000;
        const viewFrequency = 2;
        const onlineScreensCount = await this.prisma.device.count({
            where: {
                city: city === 'Global' ? undefined : city,
                status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
                connectivityStatus: 'ONLINE',
            },
        });
        const recommendedScreens = Math.min(onlineScreensCount, Math.floor(budgetRD / costPerScreen));
        const uniqueReach = recommendedScreens * uniqueReachPerScreen;
        const totalImpressions = uniqueReach * viewFrequency;
        return {
            budget: budgetRD,
            city,
            recommendedScreens,
            uniqueReach,
            totalImpressions,
            onlineScreensInZone: onlineScreensCount,
        };
    }
    async createIntent(dto) {
        try {
            const intent = await this.prisma.campaignIntent.create({
                data: {
                    brandName: dto.brandName,
                    budget: dto.budget,
                    expectedScreens: dto.expectedScreens,
                    fileMetadata: dto.fileMetadata || {},
                    status: 'PENDING_PAYMENT',
                },
            });
            return { success: true, data: intent };
        }
        catch (error) {
            this.logger.error('Error creating campaign intent:', error);
            throw new common_1.BadRequestException(`No se pudo registrar la intención de campaña: ${error.message}`);
        }
    }
};
exports.CampaignService = CampaignService;
exports.CampaignService = CampaignService = CampaignService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService])
], CampaignService);
//# sourceMappingURL=campaign.service.js.map