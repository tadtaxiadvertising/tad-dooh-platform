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
var AdvertisersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvertisersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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
let AdvertisersService = AdvertisersService_1 = class AdvertisersService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.logger = new common_1.Logger(AdvertisersService_1.name);
    }
    async findAll() {
        return this.prisma.advertiser.findMany({
            include: {
                _count: { select: { campaigns: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        return this.prisma.advertiser.findUnique({
            where: { id },
            include: {
                campaigns: {
                    include: {
                        metrics: true,
                        media: true,
                        targetDrivers: true,
                    },
                },
            },
        });
    }
    async create(data) {
        let hashedPassword = null;
        if (data.password) {
            hashedPassword = await bcrypt.hash(data.password, business_rules_1.BCRYPT_ROUNDS);
        }
        return this.prisma.advertiser.create({
            data: {
                companyName: data.companyName,
                contactName: data.contactName,
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                status: business_rules_1.BUSINESS_RULES.STATUS.ADVERTISER.INITIAL,
            },
        });
    }
    async update(id, data) {
        const updateData = {};
        if (data.companyName !== undefined)
            updateData.companyName = data.companyName;
        if (data.contactName !== undefined)
            updateData.contactName = data.contactName;
        if (data.phone !== undefined)
            updateData.phone = data.phone;
        if (data.category !== undefined)
            updateData.category = data.category;
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, business_rules_1.BCRYPT_ROUNDS);
        }
        return this.prisma.advertiser.update({ where: { id }, data: updateData });
    }
    async remove(id) {
        await this.prisma.campaign.deleteMany({ where: { advertiserId: id } });
        return this.prisma.advertiser.delete({ where: { id } });
    }
    async getPortalData(id) {
        const advertiser = await this.prisma.advertiser.findUnique({
            where: { id },
            include: {
                campaigns: {
                    where: { active: true },
                    include: {
                        media: true,
                        mediaAssets: { select: mediaAssetSafeSelect },
                        videos: true,
                    },
                },
                invoices: {
                    orderBy: { issueDate: 'desc' },
                    take: 10,
                },
            },
        });
        if (!advertiser)
            return null;
        const campaignIds = advertiser.campaigns.map(c => c.id);
        const now = new Date();
        const onlineWindowMs = 90 * 1000;
        const activeCampaignWhere = {
            advertiserId: id,
            active: true,
            startDate: { lte: now },
            endDate: { gte: now },
        };
        const contractedDeviceSelect = {
            deviceId: true,
            taxiNumber: true,
            city: true,
            lastSeen: true,
            lastLat: true,
            lastLng: true,
            status: true,
            driverId: true,
            driver: {
                select: {
                    id: true,
                    fullName: true,
                    taxiPlate: true,
                    licensePlate: true,
                    subscriptionPaid: true,
                    subscriptionEnd: true,
                    status: true,
                },
            },
            locations: {
                orderBy: { timestamp: 'desc' },
                take: 1,
                select: {
                    latitude: true,
                    longitude: true,
                    speed: true,
                    timestamp: true,
                },
            },
        };
        const [deviceAssignments, targetDriverAssignments] = await Promise.all([
            this.prisma.deviceCampaign.findMany({
                where: { campaign: activeCampaignWhere },
                include: {
                    campaign: { select: { id: true, name: true } },
                    device: { select: contractedDeviceSelect },
                },
            }),
            this.prisma.driver.findMany({
                where: { campaigns: { some: activeCampaignWhere } },
                select: {
                    id: true,
                    fullName: true,
                    taxiPlate: true,
                    licensePlate: true,
                    subscriptionPaid: true,
                    subscriptionEnd: true,
                    status: true,
                    devices: { select: contractedDeviceSelect },
                },
            }),
        ]);
        const contractedByDeviceId = new Map();
        const upsertContractedScreen = (device, campaignName) => {
            if (!device?.deviceId)
                return;
            const lastLocation = device.locations?.[0] || null;
            const lastLat = device.lastLat ?? lastLocation?.latitude ?? null;
            const lastLng = device.lastLng ?? lastLocation?.longitude ?? null;
            const lastSeen = device.lastSeen ?? lastLocation?.timestamp ?? null;
            const isOnline = !!(lastSeen && (now.getTime() - new Date(lastSeen).getTime()) <= onlineWindowMs);
            const driver = device.driver || null;
            const existing = contractedByDeviceId.get(device.deviceId);
            const campaigns = new Set(existing?.campaigns || []);
            if (campaignName)
                campaigns.add(campaignName);
            let subscriptionStatus = 'PENDING';
            if (driver) {
                if (driver.subscriptionPaid) {
                    const notExpired = !driver.subscriptionEnd || driver.subscriptionEnd > now;
                    subscriptionStatus = notExpired ? 'ACTIVE' : 'EXPIRED';
                }
                else {
                    subscriptionStatus = driver.status || 'PENDING';
                }
            }
            contractedByDeviceId.set(device.deviceId, {
                driverId: driver?.id ?? device.driverId ?? null,
                deviceId: device.deviceId,
                taxiNumber: device.taxiNumber ?? null,
                city: device.city ?? null,
                lastSeen,
                lastLat,
                lastLng,
                status: device.status,
                isOnline,
                driverName: driver?.fullName ?? null,
                plate: driver?.taxiPlate ?? driver?.licensePlate ?? null,
                subscriptionStatus,
                speed: lastLocation?.speed ?? null,
                campaigns: Array.from(campaigns),
            });
        };
        for (const assignment of deviceAssignments) {
            upsertContractedScreen(assignment.device, assignment.campaign.name);
        }
        for (const driver of targetDriverAssignments) {
            for (const device of driver.devices) {
                upsertContractedScreen({ ...device, driver: device.driver || driver }, undefined);
            }
        }
        const contractedScreens = Array.from(contractedByDeviceId.values());
        const driverIds = Array.from(new Set(contractedScreens
            .map((screen) => screen.driverId)
            .filter((driverId) => typeof driverId === 'string' && driverId.length > 0)));
        const deviceIds = Array.from(new Set(contractedScreens
            .map((screen) => screen.deviceId)
            .filter((deviceId) => typeof deviceId === 'string' && deviceId.length > 0)));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [metricsAgg, totalScans, liveImpressions, latestInvoice, geoData, uniqueNodes] = await Promise.all([
            campaignIds.length > 0
                ? this.prisma.campaignMetric.aggregate({
                    where: { campaignId: { in: campaignIds } },
                    _sum: { totalImpressions: true, totalCompletions: true },
                })
                : Promise.resolve({ _sum: { totalImpressions: 0, totalCompletions: 0 } }),
            campaignIds.length > 0
                ? this.prisma.analyticsEvent.count({
                    where: {
                        campaignId: { in: campaignIds },
                        eventType: { in: ['qr_scan', 'scan_redirect', 'scan', 'QR_SCAN'] },
                    },
                })
                : Promise.resolve(0),
            campaignIds.length > 0
                ? this.getLiveImpressionsForCampaigns(advertiser.id)
                : Promise.resolve(0),
            this.prisma.invoice.findFirst({
                where: { advertiserId: id },
                orderBy: { issueDate: 'desc' }
            }),
            campaignIds.length > 0
                ? this.prisma.campaignMetric.groupBy({
                    by: ['city'],
                    where: { campaignId: { in: campaignIds } },
                    _sum: { totalImpressions: true }
                })
                : Promise.resolve([]),
            campaignIds.length > 0
                ? this.prisma.playbackEvent.groupBy({
                    by: ['deviceId'],
                    where: {
                        videoId: { in: await this.getAdvertiserVideoIds(advertiser.id) },
                        eventType: 'play_confirm'
                    }
                })
                : Promise.resolve([])
        ]);
        const totalImpressions = (metricsAgg._sum.totalImpressions || 0) + liveImpressions;
        const totalCompletions = metricsAgg._sum.totalCompletions || 0;
        const activeNodes = uniqueNodes.length;
        const avgFrequency = activeNodes > 0 ? Number((totalImpressions / (activeNodes * 1.5)).toFixed(1)) : 0;
        const geoDistribution = geoData.map(g => ({
            name: g.city || 'Desconocido',
            value: totalImpressions > 0 ? Math.round((g._sum.totalImpressions || 0) / totalImpressions * 100) : 0
        })).sort((a, b) => b.value - a.value);
        const totalAds = advertiser.campaigns.length;
        const subtotal = totalAds * business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
        const taxAmount = subtotal * business_rules_1.BUSINESS_RULES.ITBIS_RATE;
        const totalCost = subtotal + taxAmount;
        const [allCampaignMetrics, allCampaignScans, allAssignments] = await Promise.all([
            campaignIds.length > 0
                ? this.prisma.campaignMetric.groupBy({
                    by: ['campaignId'],
                    where: { campaignId: { in: campaignIds } },
                    _sum: { totalImpressions: true, totalCompletions: true },
                })
                : Promise.resolve([]),
            campaignIds.length > 0
                ? this.prisma.analyticsEvent.groupBy({
                    by: ['campaignId'],
                    where: {
                        campaignId: { in: campaignIds },
                        eventType: { in: ['qr_scan', 'scan_redirect', 'scan', 'QR_SCAN'] },
                    },
                    _count: { id: true },
                })
                : Promise.resolve([]),
            campaignIds.length > 0
                ? this.prisma.deviceCampaign.findMany({
                    where: { campaign_id: { in: campaignIds } },
                    include: {
                        device: { select: { lastSyncAt: true, lastSyncSuccess: true, status: true } },
                    },
                })
                : Promise.resolve([]),
        ]);
        const metricsMap = new Map(allCampaignMetrics.map(m => [m.campaignId, m]));
        const scansMap = new Map(allCampaignScans.map(s => [s.campaignId, s._count.id]));
        const assignmentsMap = new Map();
        for (const a of allAssignments) {
            const list = assignmentsMap.get(a.campaign_id) || [];
            list.push(a);
            assignmentsMap.set(a.campaign_id, list);
        }
        const campaignsWithMetrics = advertiser.campaigns.map(c => {
            const campMetrics = metricsMap.get(c.id);
            const cScans = scansMap.get(c.id) || 0;
            const assignments = assignmentsMap.get(c.id) || [];
            const totalAssigned = assignments.length;
            const syncedCount = assignments.filter(a => a.device.status === 'ACTIVE' &&
                a.device.lastSyncSuccess &&
                a.device.lastSyncAt &&
                a.device.lastSyncAt >= c.updatedAt).length;
            const syncProgress = totalAssigned > 0 ? (syncedCount / totalAssigned) * 100 : 100;
            const consolidatedMedia = [
                ...c.media.map(m => ({ id: m.id, url: m.cdnUrl || m.url, type: m.mimeType || m.mime_type, name: m.name || m.filename, category: 'Vault' })),
                ...c.mediaAssets.map(a => ({ id: a.id, url: a.url, type: a.type, name: a.filename, category: 'Asset' })),
                ...c.videos.map(v => ({ id: v.id, url: v.url, type: v.mimeType || 'video/mp4', name: v.title, category: 'Video' })),
            ];
            return {
                id: c.id,
                name: c.name,
                status: c.status,
                start: c.startDate,
                end: c.endDate,
                targetUrl: c.targetUrl,
                promocionesContratadas: c.targetImpressions || 0,
                impressions: campMetrics?._sum.totalImpressions || 0,
                completions: campMetrics?._sum.totalCompletions || 0,
                scans: cScans,
                syncProgress: Math.round(syncProgress),
                totalDevices: totalAssigned,
                media: consolidatedMedia,
            };
        });
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const metricsHistory = await this.prisma.campaignMetric.groupBy({
            by: ['date'],
            where: {
                campaignId: { in: campaignIds },
                date: { gte: sevenDaysAgo },
            },
            _sum: { totalImpressions: true, totalCompletions: true },
            orderBy: { date: 'asc' },
        });
        const timeSeries = metricsHistory.map(m => ({
            date: m.date.toISOString().split('T')[0],
            impressions: Number(m._sum.totalImpressions || 0),
            completions: Number(m._sum.totalCompletions || 0),
        }));
        timeSeries.push({
            date: new Date().toISOString().split('T')[0],
            impressions: liveImpressions,
            completions: 0
        });
        const pendingInvoices = advertiser.invoices.filter((inv) => inv.status !== 'PAID');
        const balanceRD = pendingInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
        const invoicesList = advertiser.invoices.map((inv) => ({
            id: inv.id,
            issueDate: inv.issueDate.toISOString().split('T')[0],
            dueDate: inv.dueDate.toISOString().split('T')[0],
            subtotal: inv.subtotal,
            taxAmount: inv.taxAmount,
            amount: inv.totalAmount,
            totalAmount: inv.totalAmount,
            status: inv.status,
            pdfUrl: inv.pdfUrl || null,
        }));
        const invoiceStatusSummary = {
            pending: advertiser.invoices.filter((i) => i.status === 'PENDING').length,
            paid: advertiser.invoices.filter((i) => i.status === 'PAID').length,
            overdue: advertiser.invoices.filter((i) => i.status === 'OVERDUE').length,
        };
        return {
            brand: {
                id: advertiser.id,
                name: advertiser.companyName,
                category: advertiser.category,
                contact: advertiser.contactName,
                email: advertiser.email,
                phone: advertiser.phone,
                status: advertiser.status,
            },
            summary: {
                promocionesContratadas: advertiser.campaigns.reduce((acc, curr) => acc + (curr.targetImpressions || 0), 0),
                impressions: totalImpressions,
                completions: totalCompletions,
                scans: totalScans,
                activeCampaigns: totalAds,
                contractedScreens: contractedScreens.length,
                activeContractedScreens: contractedScreens.filter((screen) => screen.isOnline).length,
            },
            telemetry: {
                contractedScreens,
                contractedScreensTotal: contractedScreens.length,
                activeContractedScreens: contractedScreens.filter((screen) => screen.isOnline).length,
                driverIds,
                deviceIds,
            },
            contractedScreens,
            driverIds,
            deviceIds,
            activeDriverIds: driverIds,
            stats: {
                totalImpressions,
                totalCompletions,
                totalScans,
                activeCampaigns: totalAds,
                activeNodes,
                avgFrequency,
                geoDistribution,
            },
            financials: {
                subtotal,
                taxAmount,
                totalCost,
                costPerAd: business_rules_1.BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
                taxRate: business_rules_1.BUSINESS_RULES.ITBIS_RATE,
                balanceRD,
                invoices: invoicesList,
                invoiceStatusSummary,
                latestInvoice: latestInvoice ? {
                    id: latestInvoice.id,
                    date: latestInvoice.issueDate.toISOString().split('T')[0],
                    status: latestInvoice.status,
                    amount: latestInvoice.totalAmount,
                } : null,
            },
            campaigns: campaignsWithMetrics,
            timeSeries,
        };
    }
    async login(email, pass) {
        const user = await this.prisma.advertiser.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (!user.password) {
            throw new common_1.UnauthorizedException('Tu cuenta aún no tiene una contraseña configurada. Por favor, utiliza la opción "Recuperar Contraseña" para establecer una.');
        }
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const payload = {
            sub: user.id,
            email: user.email,
            role: 'ADVERTISER',
            app_metadata: { role: 'ADVERTISER', entityId: user.id },
        };
        const jwtSecret = this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET');
        if (!jwtSecret) {
            this.logger.error('🚨 [ADVERTISER_LOGIN] JWT_SECRET no configurado. Login bloqueado por seguridad.');
            throw new Error('Error de configuración del servidor.');
        }
        const token = jwt.sign(payload, jwtSecret, { expiresIn: business_rules_1.JWT_EXPIRY });
        return {
            access_token: token,
            advertiserId: user.id,
            name: user.companyName,
            role: 'ADVERTISER',
            entityId: user.id,
        };
    }
    async recoverPassword(email) {
        const user = await this.prisma.advertiser.findUnique({ where: { email } });
        if (!user) {
            return { success: true, message: 'If email exists, recovery sent.' };
        }
        const jwtSecret = this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET');
        if (!jwtSecret) {
            this.logger.error(`[ADVERTISER_AUTH][RECOVER_PASSWORD] JWT secret no configurado para email=${email}.`);
            return { success: false, message: 'Error de configuración del servidor.' };
        }
        const resetToken = jwt.sign({ sub: user.id, email: user.email, purpose: 'reset' }, jwtSecret, { expiresIn: '15m' });
        this.logger.log(`[AUTH] Recovery token generado para ${email} — integrar con Resend/SendGrid`);
        return { success: true, message: 'Recovery instructions sent.' };
    }
    async resetPassword(token, newPass) {
        const jwtSecret = this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET');
        if (!jwtSecret) {
            this.logger.error('[ADVERTISER_AUTH][RESET_PASSWORD] JWT secret no configurado.');
            throw new Error('Error de configuración del servidor.');
        }
        try {
            const payload = jwt.verify(token, jwtSecret);
            if (payload.purpose !== 'reset') {
                throw new common_1.BadRequestException('Token inválido para esta operación');
            }
            const hashedPassword = await bcrypt.hash(newPass, business_rules_1.BCRYPT_ROUNDS);
            await this.prisma.advertiser.update({
                where: { id: payload.sub },
                data: { password: hashedPassword }
            });
            return { success: true, message: 'Contraseña actualizada correctamente.' };
        }
        catch (err) {
            this.logger.error(`[ADVERTISER_AUTH][RESET_PASSWORD] Token inválido o expirado: ${err.message}`);
            throw new common_1.UnauthorizedException('El enlace ha expirado o es inválido.');
        }
    }
    async getInvoices(advertiserId) {
        const invoices = await this.prisma.invoice.findMany({
            where: { advertiserId },
            orderBy: { issueDate: 'desc' },
        });
        const balanceRD = invoices
            .filter((inv) => inv.status !== 'PAID')
            .reduce((acc, inv) => acc + inv.totalAmount, 0);
        return {
            invoices: invoices.map((inv) => ({
                id: inv.id,
                issueDate: inv.issueDate.toISOString().split('T')[0],
                dueDate: inv.dueDate.toISOString().split('T')[0],
                subtotal: inv.subtotal,
                taxAmount: inv.taxAmount,
                amount: inv.totalAmount,
                totalAmount: inv.totalAmount,
                status: inv.status,
                pdfUrl: inv.pdfUrl || null,
            })),
            balanceRD,
            invoiceStatusSummary: {
                pending: invoices.filter((i) => i.status === 'PENDING').length,
                paid: invoices.filter((i) => i.status === 'PAID').length,
                overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
            },
        };
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
    async getLiveImpressionsForCampaigns(advertiserId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const videoIds = await this.getAdvertiserVideoIds(advertiserId);
        if (videoIds.length === 0)
            return 0;
        return this.prisma.playbackEvent.count({
            where: {
                videoId: { in: videoIds },
                timestamp: { gte: today },
                eventType: 'play_confirm'
            }
        });
    }
};
exports.AdvertisersService = AdvertisersService;
exports.AdvertisersService = AdvertisersService = AdvertisersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AdvertisersService);
//# sourceMappingURL=advertisers.service.js.map