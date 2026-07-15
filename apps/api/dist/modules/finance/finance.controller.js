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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const finance_service_1 = require("./finance.service");
const invoice_service_1 = require("./invoice.service");
const whatsapp_service_1 = require("../notifications/whatsapp.service");
const email_service_1 = require("../notifications/email.service");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
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
let FinanceController = class FinanceController {
    constructor(financeService, invoiceService, whatsappService, emailService, prisma) {
        this.financeService = financeService;
        this.invoiceService = invoiceService;
        this.whatsappService = whatsappService;
        this.emailService = emailService;
        this.prisma = prisma;
    }
    async downloadCampaignPdf(id, res) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id },
            include: { media: { select: mediaSafeSelect } }
        });
        if (!campaign)
            return res.status(404).send('Campaña no encontrada');
        const impressions = await this.prisma.playbackEvent.count({
            where: { videoId: { in: campaign.media.map(m => m.id) }, eventType: 'play_confirm' }
        });
        const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(campaign, {
            totalImpressions: impressions,
            assignedTaxis: campaign.media.length
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=POP_${campaign.name}.pdf`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
    async downloadFleetPdf(res) {
        const devices = await this.prisma.device.findMany();
        const pdf = await this.invoiceService.generateFleetStatusPDF(devices);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=TAD_Inventario_Flota.pdf',
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
    async downloadTransactionPdf(id, res) {
        const tx = await this.prisma.financialTransaction.findUnique({ where: { id } });
        if (!tx)
            return res.status(404).send('Transacción no encontrada');
        const pdf = await this.invoiceService.generateTransactionReceiptPDF(tx);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Recibo_${tx.id.substring(0, 8)}.pdf`,
            'Content-Length': pdf.length,
        });
        res.end(pdf);
    }
    async getPayroll(month, year) {
        try {
            const m = month ? parseInt(month) : new Date().getMonth() + 1;
            const y = year ? parseInt(year) : new Date().getFullYear();
            const results = await this.financeService.calculateMonthlyPayroll(m, y);
            return results;
        }
        catch (error) {
            console.error('CRITICAL_FINANCE_ERROR: getPayroll failed', error);
            return {
                error: 'Error al calcular la nómina',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    async processPayment(data) {
        return this.financeService.processPayment(data.driverId, data.month || new Date().getMonth() + 1, data.year || new Date().getFullYear(), data.reference);
    }
    async sendWhatsAppPaymentConfirm(body) {
        return this.whatsappService.sendDriverPaymentConfirm(body.phone, body.driverName, body.amount, body.month);
    }
    async triggerMonthlyBilling(data) {
        const m = data.month || new Date().getMonth() + 1;
        const y = data.year || new Date().getFullYear();
        return this.financeService.triggerMonthlyBilling(m, y);
    }
    async getCampaignBilling() {
        return this.financeService.getCampaignBillingReport();
    }
    async getInvoice(campaignId, res) {
        const html = await this.financeService.generateInvoiceHtml(campaignId);
        if (!html) {
            return res.status(common_1.HttpStatus.NOT_FOUND).json({ message: 'Campaign not found' });
        }
        res.set('Content-Type', 'text/html');
        res.status(common_1.HttpStatus.OK).send(html);
    }
    async exportPayroll(month, year, res) {
        const m = month ? parseInt(month) : new Date().getMonth() + 1;
        const y = year ? parseInt(year) : new Date().getFullYear();
        const csv = await this.financeService.exportPayrollCsv(m, y);
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', `attachment; filename=payroll-${m}-${y}.csv`);
        res.status(common_1.HttpStatus.OK).send(csv);
    }
    async exportCampaigns(res) {
        const csv = await this.financeService.exportCampaignsCsv();
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', 'attachment; filename=campaigns-billing.csv');
        res.status(common_1.HttpStatus.OK).send(csv);
    }
    async exportSingleCampaign(id, res) {
        const csv = await this.financeService.exportCampaignCsv(id);
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', `attachment; filename=campaign-${id}.csv`);
        res.status(common_1.HttpStatus.OK).send(csv);
    }
    async recordTransaction(data) {
        return this.financeService.recordTransaction(data);
    }
    async getSummary() {
        return this.financeService.getFinancialSummary();
    }
    async getInvestorMetrics() {
        return this.financeService.getInvestorMetrics();
    }
    async getLedger() {
        return this.financeService.getLedger();
    }
    async emailCampaignReport(id, body) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id },
            include: { media: { select: mediaSafeSelect } },
        });
        if (!campaign)
            return { success: false, message: 'Campaña no encontrada' };
        const impressions = await this.prisma.playbackEvent.count({
            where: { videoId: { in: campaign.media.map((m) => m.id) }, eventType: 'play_confirm' },
        });
        const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(campaign, {
            totalImpressions: impressions,
            assignedTaxis: campaign.media.length,
        });
        const result = await this.emailService.sendCampaignReport(body.email, body.advertiserName || campaign.advertiser, campaign.name, pdf, body.reportUrl);
        return { ...result, message: result.success ? 'Reporte enviado correctamente' : 'Error al enviar el reporte' };
    }
    async emailInvoice(campaignId, body) {
        const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, include: { media: { select: mediaSafeSelect } } });
        if (!campaign)
            return { success: false, message: 'Campaña no encontrada' };
        const invoiceId = `INV-${campaignId.slice(0, 8).toUpperCase()}`;
        const baseAmount = body.amount || 3000;
        const impressions = await this.prisma.playbackEvent.count({
            where: { eventType: 'play_confirm' },
        });
        const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(campaign, {
            totalImpressions: impressions,
            assignedTaxis: campaign.media.length || 1,
        });
        const result = await this.emailService.sendInvoice(body.email, campaign.advertiser, campaign.name, invoiceId, baseAmount, pdf);
        return { ...result, message: result.success ? 'Factura enviada correctamente' : 'Error al enviar la factura' };
    }
    async emailDriverPaymentConfirm(body) {
        let pdfBuffer;
        if (body.driverId) {
            try {
                const driver = await this.prisma.driver.findUnique({ where: { id: body.driverId } });
                if (driver) {
                    pdfBuffer = await this.invoiceService.generateDriverSettlementPDF({
                        chofer: driver.fullName,
                        placa: driver.licensePlate || 'N/A',
                        ingreso: body.amount.toString(),
                        anuncios: 'Revisar Detalle',
                    });
                }
            }
            catch (e) {
            }
        }
        const result = await this.emailService.sendDriverPaymentConfirmation(body.email, body.driverName, body.amount, body.month, pdfBuffer);
        return { ...result, message: result.success ? 'Email enviado al conductor' : 'Error al enviar el email' };
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('report/campaign/:id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "downloadCampaignPdf", null);
__decorate([
    (0, common_1.Get)('report/fleet/pdf'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "downloadFleetPdf", null);
__decorate([
    (0, common_1.Get)('transaction/:id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "downloadTransactionPdf", null);
__decorate([
    (0, common_1.Get)('payroll'),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getPayroll", null);
__decorate([
    (0, common_1.Post)('payroll/pay'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "processPayment", null);
__decorate([
    (0, common_1.Post)('payroll/whatsapp-confirm'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "sendWhatsAppPaymentConfirm", null);
__decorate([
    (0, common_1.Post)('payroll/trigger'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "triggerMonthlyBilling", null);
__decorate([
    (0, common_1.Get)('report/campaigns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getCampaignBilling", null);
__decorate([
    (0, common_1.Get)('invoice/:campaignId'),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Get)('export/payroll.csv'),
    __param(0, (0, common_1.Query)('month')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "exportPayroll", null);
__decorate([
    (0, common_1.Get)('export/campaigns.csv'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "exportCampaigns", null);
__decorate([
    (0, common_1.Get)('export/campaign/:id.csv'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "exportSingleCampaign", null);
__decorate([
    (0, common_1.Post)('transactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "recordTransaction", null);
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('investor-metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getInvestorMetrics", null);
__decorate([
    (0, common_1.Get)('ledger'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getLedger", null);
__decorate([
    (0, common_1.Post)('report/campaign/:id/email'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "emailCampaignReport", null);
__decorate([
    (0, common_1.Post)('invoice/:campaignId/email'),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "emailInvoice", null);
__decorate([
    (0, common_1.Post)('payroll/email-confirm'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "emailDriverPaymentConfirm", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('finance'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [finance_service_1.FinanceService,
        invoice_service_1.InvoiceService,
        whatsapp_service_1.WhatsAppService,
        email_service_1.EmailService,
        prisma_service_1.PrismaService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map