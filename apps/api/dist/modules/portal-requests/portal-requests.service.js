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
var PortalRequestsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../supabase/supabase.service");
const business_rules_1 = require("../../common/constants/business-rules");
let PortalRequestsService = PortalRequestsService_1 = class PortalRequestsService {
    constructor(prisma, supabase) {
        this.prisma = prisma;
        this.supabase = supabase;
        this.logger = new common_1.Logger(PortalRequestsService_1.name);
    }
    async create(data) {
        return this.prisma.portalRequest.create({
            data: {
                advertiserId: data.advertiserId,
                driverId: data.driverId,
                campaignId: data.campaignId,
                type: data.type,
                title: data.title,
                description: data.description,
                data: data.data ? JSON.stringify(data.data) : '{}',
                status: 'PENDING',
            },
        });
    }
    async findAll() {
        return this.prisma.portalRequest.findMany({
            include: {
                advertiser: {
                    select: {
                        companyName: true,
                        email: true,
                    },
                },
                driver: {
                    select: {
                        fullName: true,
                        phone: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByAdvertiser(advertiserId) {
        return this.prisma.portalRequest.findMany({
            where: { advertiserId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByDriver(driverId) {
        return this.prisma.portalRequest.findMany({
            where: { driverId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        return this.prisma.portalRequest.findUnique({
            where: { id },
            include: {
                advertiser: true,
                driver: true,
            },
        });
    }
    async update(id, updateData) {
        const request = await this.prisma.portalRequest.findUnique({
            where: { id },
            include: { advertiser: true, driver: true },
        });
        if (!request)
            throw new Error(`PortalRequest ${id} not found`);
        const updated = await this.prisma.portalRequest.update({
            where: { id },
            data: updateData,
        });
        if (updateData.status === 'APPROVED') {
            if (request.type === 'CAMPAIGN_CREATE' && request.data) {
                const cData = JSON.parse(request.data);
                if (cData.mediaUrl) {
                    this.validateMediaUrl(cData.mediaUrl);
                }
                if (request.advertiserId) {
                    const activeCount = await this.prisma.campaign.count({
                        where: {
                            advertiserId: request.advertiserId,
                            status: { in: ['ACTIVE', 'PENDING_REVIEW', 'PENDING_PAYMENT'] },
                        },
                    });
                    if (activeCount >= business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_ADVERTISER) {
                        throw new common_1.BadRequestException(`Límite alcanzado: este anunciante ya tiene ${activeCount} campañas activas (máx. ${business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_ADVERTISER}).`);
                    }
                }
            }
            if (request.type === 'CONTENT_UPDATE' && request.data) {
                const mediaData = JSON.parse(request.data);
                if (mediaData?.url) {
                    this.validateMediaUrl(mediaData.url);
                }
            }
            try {
                this.logger.log(`[APPROVAL_FLOW] Processing approval for request ${id}, type: ${request.type}`);
                let targetCampaignId = request.campaignId;
                if (request.type === 'CAMPAIGN_CREATE' && request.data) {
                    const cData = JSON.parse(request.data);
                    const newCampaign = await this.prisma.campaign.create({
                        data: {
                            name: cData.name,
                            advertiser: request.advertiser?.companyName || "Anunciante de Portal",
                            advertiserId: request.advertiserId || null,
                            description: request.description || "Inició vía Portal de Anunciante",
                            startDate: new Date(cData.startDate),
                            endDate: new Date(cData.endDate),
                            status: 'ACTIVE',
                            active: true,
                            isGlobal: true,
                            targetAll: true,
                            budget: 1000,
                            category: cData.category || 'General'
                        }
                    });
                    targetCampaignId = newCampaign.id;
                    if (cData.mediaUrl) {
                        await this.prisma.mediaAsset.create({
                            data: {
                                campaignId: targetCampaignId,
                                type: 'VIDEO',
                                filename: `portal-${newCampaign.id}.mp4`,
                                url: cData.mediaUrl,
                                fileSize: 1024 * 1024 * 5,
                                checksum: `MD5-${newCampaign.id}`,
                                duration: 15,
                                version: 1,
                            }
                        });
                    }
                    await this.prisma.portalRequest.update({
                        where: { id },
                        data: { campaignId: targetCampaignId }
                    });
                    this.logger.log(`[APPROVAL_FLOW] Created NEW Campaign ${targetCampaignId} for Advertiser ${request.advertiserId}`);
                }
                if (request.type === 'PAYOUT' && request.driverId) {
                    let amount = 0;
                    try {
                        const payoutData = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
                        amount = parseFloat(payoutData?.amount) || 0;
                    }
                    catch { }
                    if (amount === 0) {
                        const amountStr = request.description?.match(/RD\$([\d,.]+)/)?.[1]?.replace(/,/g, '') || '0';
                        amount = parseFloat(amountStr) || 0;
                    }
                    const month = new Date().getMonth() + 1;
                    const year = new Date().getFullYear();
                    if (amount > 0) {
                        const existing = await this.prisma.payrollPayment.findUnique({
                            where: {
                                driverId_month_year: {
                                    driverId: request.driverId,
                                    month,
                                    year
                                }
                            }
                        });
                        if (existing) {
                            await this.prisma.payrollPayment.update({
                                where: { id: existing.id },
                                data: {
                                    amount: existing.amount + amount,
                                    status: 'PAID',
                                    paidAt: new Date(),
                                    referenceNum: `UPG-${id}`
                                }
                            });
                        }
                        else {
                            await this.prisma.payrollPayment.create({
                                data: {
                                    driverId: request.driverId,
                                    amount: amount,
                                    month,
                                    year,
                                    status: 'PAID',
                                    paidAt: new Date(),
                                    referenceNum: `REQ-${id}`
                                }
                            });
                        }
                        this.logger.log(`[APPROVAL_FLOW] 💰 PAID RD$${amount} to Driver ${request.driverId}`);
                    }
                }
                if (targetCampaignId) {
                    await this.prisma.campaign.update({
                        where: { id: targetCampaignId },
                        data: { active: true, status: 'ACTIVE', updatedAt: new Date() }
                    });
                    if (request.type === 'CONTENT_UPDATE' && request.data) {
                        let mediaData;
                        try {
                            mediaData = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
                        }
                        catch (e) {
                            this.logger.warn(`[APPROVAL_FLOW] Invalid media data JSON for request ${id}`);
                        }
                        if (mediaData?.mediaId) {
                            await this.prisma.media.update({
                                where: { id: mediaData.mediaId },
                                data: { campaign_id: targetCampaignId }
                            }).catch(() => { });
                        }
                        else if (mediaData?.url) {
                            const checksum = mediaData.checksum || mediaData.hashMd5 || 'portal-upload';
                            const existingMedia = await this.prisma.media.findFirst({
                                where: {
                                    OR: [
                                        { hashMd5: checksum },
                                        { url: mediaData.url },
                                    ],
                                },
                            }).catch(() => null);
                            if (existingMedia) {
                                if (existingMedia.campaign_id !== targetCampaignId) {
                                    await this.prisma.media.update({
                                        where: { id: existingMedia.id },
                                        data: { campaign_id: targetCampaignId }
                                    }).catch(() => { });
                                }
                                this.logger.log(`[APPROVAL_FLOW] Media duplicado detectado (checksum/url ya registrado). ` +
                                    `Enlazado a campaña, saltando creación de MediaAsset para ${mediaData.filename}. mediaId=${existingMedia.id}`);
                            }
                            else {
                                await this.prisma.mediaAsset.create({
                                    data: {
                                        campaignId: targetCampaignId,
                                        type: mediaData.type || 'VIDEO',
                                        filename: mediaData.filename || 'portal-upload.mp4',
                                        url: mediaData.url,
                                        fileSize: Math.round(Number(mediaData.fileSize || 0)),
                                        checksum,
                                        duration: Math.round(Number(mediaData.duration || 30)),
                                        version: 1,
                                    }
                                }).catch(e => this.logger.warn(`[APPROVAL_FLOW] MediaAsset create failed: ${e.message}`));
                            }
                        }
                    }
                    const campaign = await this.prisma.campaign.findUnique({
                        where: { id: targetCampaignId },
                        select: { targetAll: true, isGlobal: true }
                    });
                    let devicesToSync = [];
                    if (campaign?.targetAll || campaign?.isGlobal) {
                        devicesToSync = await this.prisma.device.findMany({
                            where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE }, select: { id: true }
                        });
                        if (devicesToSync.length > 0) {
                            await this.prisma.deviceCampaign.createMany({
                                data: devicesToSync.map(d => ({
                                    device_id: d.id,
                                    campaign_id: targetCampaignId,
                                })),
                                skipDuplicates: true,
                            });
                        }
                    }
                    else {
                        const assignments = await this.prisma.deviceCampaign.findMany({
                            where: { campaign_id: targetCampaignId }
                        });
                        devicesToSync = assignments.map(a => ({ id: a.device_id }));
                    }
                    if (devicesToSync.length > 0) {
                        await this.prisma.deviceCommand.createMany({
                            data: devicesToSync.map(d => ({
                                deviceId: d.id,
                                commandType: 'FORCE_SYNC',
                                commandParams: JSON.stringify({
                                    reason: 'portal_request_approved',
                                    campaignId: targetCampaignId,
                                    requestId: id,
                                }),
                                status: 'PENDING',
                                expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
                            }))
                        });
                    }
                    this.supabase.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
                        reason: 'portal_request_approved',
                        campaignId: targetCampaignId,
                        requestId: id,
                    }).catch(() => { });
                    this.logger.log(`[APPROVAL_FLOW] ✅ Campaign ${targetCampaignId} activated, assigned & synced to ${devicesToSync.length} devices.`);
                }
            }
            catch (err) {
                this.logger.error(`[APPROVAL_FLOW] ❌ Approval dispatch failed: ${err.message}`);
            }
        }
        return this.prisma.portalRequest.findUnique({
            where: { id },
            include: { advertiser: true, driver: true },
        });
    }
    async remove(id) {
        return this.prisma.portalRequest.delete({
            where: { id },
        });
    }
    validateMediaUrl(url) {
        const cleanPath = url.split('?')[0].split('#')[0];
        const ext = cleanPath.split('.').pop()?.toLowerCase() || '';
        const isAllowed = business_rules_1.BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.some((allowed) => allowed === `.${ext}`);
        if (!isAllowed) {
            throw new common_1.BadRequestException(`URL de pieza no válida: debe terminar en ${business_rules_1.BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.join(', ')}. Recibido: ${cleanPath}`);
        }
    }
};
exports.PortalRequestsService = PortalRequestsService;
exports.PortalRequestsService = PortalRequestsService = PortalRequestsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService])
], PortalRequestsService);
//# sourceMappingURL=portal-requests.service.js.map