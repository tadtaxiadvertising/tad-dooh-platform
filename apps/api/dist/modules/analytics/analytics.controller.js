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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const whatsapp_service_1 = require("../notifications/whatsapp.service");
const invoice_service_1 = require("../finance/invoice.service");
const prisma_service_1 = require("../prisma/prisma.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const common_2 = require("@nestjs/common");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService, whatsappService, prisma, invoiceService) {
        this.analyticsService = analyticsService;
        this.whatsappService = whatsappService;
        this.prisma = prisma;
        this.invoiceService = invoiceService;
    }
    async shareReportByWhatsApp(id, body) {
        return this.whatsappService.sendImpactReport(body.phone, body.advertiserName, body.campaignName, body.reportUrl);
    }
    async trackQrScan(campaignId, deviceId, res) {
        const targetUrl = await this.analyticsService.registerQrScan(campaignId, deviceId);
        return res.redirect(common_1.HttpStatus.MOVED_PERMANENTLY, targetUrl);
    }
    async ingestEvent(dto) {
        await this.analyticsService.ingestEvent(dto);
        return { success: true };
    }
    async ingestBatchEvents(body) {
        const events = Array.isArray(body) ? body : (body.events || []);
        await this.analyticsService.ingestBatchEvents(events);
        return { success: true };
    }
    async getCampaignAnalytics(campaignId, req) {
        const { role, entityId } = req.user;
        if (role === roles_decorator_1.UserRole.ADVERTISER) {
            const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
            if (!campaign || campaign.advertiserId !== entityId) {
                throw new common_1.ForbiddenException('No tienes permiso para ver las analíticas de esta campaña');
            }
        }
        return this.analyticsService.getCampaignAnalytics(campaignId);
    }
    async getDeviceAnalytics(deviceId) {
        return this.analyticsService.getDeviceAnalytics(deviceId);
    }
    async getAnalyticsSummary(req) {
        const { role, entityId } = req.user;
        const advertiserId = role === roles_decorator_1.UserRole.ADVERTISER ? entityId : undefined;
        return this.analyticsService.getAnalyticsSummary(advertiserId);
    }
    async getTotalImpressions(req) {
        const { role, entityId } = req.user;
        const advertiserId = role === roles_decorator_1.UserRole.ADVERTISER ? entityId : undefined;
        return this.analyticsService.getTotalImpressions(advertiserId);
    }
    async getAntiFraudMetrics(req) {
        const { role, entityId } = req.user;
        const advertiserId = role === roles_decorator_1.UserRole.ADVERTISER ? entityId : undefined;
        return this.analyticsService.getAntiFraudMetrics(advertiserId);
    }
    async getTopTaxis(req) {
        const { role, entityId } = req.user;
        const advertiserId = role === roles_decorator_1.UserRole.ADVERTISER ? entityId : undefined;
        return this.analyticsService.getTopTaxis(advertiserId);
    }
    async getHourlyAnalytics(req) {
        const { role, entityId } = req.user;
        const advertiserId = role === roles_decorator_1.UserRole.ADVERTISER ? entityId : undefined;
        return this.analyticsService.getHourlyAnalytics(advertiserId);
    }
    async getRecentPlays(req) {
        const { role, entityId } = req.user;
        const advertiserId = role === roles_decorator_1.UserRole.ADVERTISER ? entityId : undefined;
        return this.analyticsService.getRecentPlays(advertiserId);
    }
    async getHeatmap(advertiserId, req) {
        const finalAdvertiserId = req.user?.role === roles_decorator_1.UserRole.ADVERTISER ? req.user.entityId : advertiserId;
        return this.analyticsService.getPlaybackHeatmap(finalAdvertiserId);
    }
    async getWeeklyCampaignAnalytics(campaignId) {
        return this.analyticsService.getWeeklyCampaignMetrics(campaignId);
    }
    async downloadWeeklyPdf(id, res) {
        const campaign = await this.prisma.campaign.findUnique({ where: { id } });
        if (!campaign)
            return res.status(404).send('Campaña no encontrada');
        const data = await this.analyticsService.getWeeklyCampaignMetrics(id);
        const pdf = await this.invoiceService.generateWeeklyPerformancePDF(campaign, data);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Reporte_Semanal_${campaign.name}.pdf`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
    async trackExternalGps(data) {
        await this.analyticsService.updateDeviceLocationFromMobile(data);
        return { success: true };
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('campaign/:id/share-whatsapp'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "shareReportByWhatsApp", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('qr-scan'),
    __param(0, (0, common_1.Query)('campaignId')),
    __param(1, (0, common_1.Query)('deviceId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "trackQrScan", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('event'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "ingestEvent", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "ingestBatchEvents", null);
__decorate([
    (0, common_1.Get)('campaign/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getCampaignAnalytics", null);
__decorate([
    (0, common_1.Get)('device/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDeviceAnalytics", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAnalyticsSummary", null);
__decorate([
    (0, common_1.Get)('total-impressions'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTotalImpressions", null);
__decorate([
    (0, common_1.Get)('anti-fraud'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAntiFraudMetrics", null);
__decorate([
    (0, common_1.Get)('top-taxis'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTopTaxis", null);
__decorate([
    (0, common_1.Get)('hourly'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getHourlyAnalytics", null);
__decorate([
    (0, common_1.Get)('recent-plays'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getRecentPlays", null);
__decorate([
    (0, common_1.Get)('heatmap'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_1.Query)('advertiserId')),
    __param(1, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getHeatmap", null);
__decorate([
    (0, common_1.Get)('campaign/:id/weekly'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getWeeklyCampaignAnalytics", null);
__decorate([
    (0, common_1.Get)('campaign/:id/weekly/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "downloadWeeklyPdf", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('external-gps'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "trackExternalGps", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => invoice_service_1.InvoiceService))),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        whatsapp_service_1.WhatsAppService,
        prisma_service_1.PrismaService,
        invoice_service_1.InvoiceService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map