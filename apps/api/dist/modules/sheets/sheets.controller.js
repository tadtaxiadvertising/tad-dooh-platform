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
var SheetsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsController = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("./sheets.service");
const invoice_service_1 = require("../finance/invoice.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let SheetsController = SheetsController_1 = class SheetsController {
    constructor(sheetsService, invoiceService) {
        this.sheetsService = sheetsService;
        this.invoiceService = invoiceService;
        this.logger = new common_1.Logger(SheetsController_1.name);
    }
    async syncAll() {
        return this.sheetsService.syncAllTables();
    }
    async getReport() {
        const data = await this.sheetsService.getSecondaryDBData();
        if (!data)
            return { error: 'Service Unavailable or Sheet Empty' };
        return data;
    }
    async downloadInvoice(driverId, res) {
        this.logger.log(`Solicitud de factura PDF para: ${driverId}`);
        try {
            const data = await this.sheetsService.getSecondaryDBData();
            let row = data?.find(r => r.ID_CHOFER === driverId ||
                (r.CHOFER && r.CHOFER.toLowerCase().includes(driverId.toLowerCase())));
            if (!row) {
                row = {
                    chofer: driverId,
                    placa: 'REVISIÓN PENDIENTE',
                    ingreso: "0.00",
                    estatus: 'OFFLINE_REPORT'
                };
            }
            const pdfBuffer = await this.invoiceService.generateDriverSettlementPDF(row);
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=TAD_Factura_${driverId}.pdf`,
                'Content-Length': pdfBuffer.length,
            });
            res.end(pdfBuffer);
        }
        catch (e) {
            this.logger.error(`Error generando PDF: ${e.message}`);
            res.status(500).send({ error: 'Fallo al generar el PDF de facturación' });
        }
    }
};
exports.SheetsController = SheetsController;
__decorate([
    (0, common_1.Post)('sync'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SheetsController.prototype, "syncAll", null);
__decorate([
    (0, common_1.Get)('report'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SheetsController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('invoice/:driverId'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('driverId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SheetsController.prototype, "downloadInvoice", null);
exports.SheetsController = SheetsController = SheetsController_1 = __decorate([
    (0, common_1.Controller)('sheets'),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService,
        invoice_service_1.InvoiceService])
], SheetsController);
//# sourceMappingURL=sheets.controller.js.map