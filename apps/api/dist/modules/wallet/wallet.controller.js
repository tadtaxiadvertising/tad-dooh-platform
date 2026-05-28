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
exports.WalletController = exports.BankInfoSchema = void 0;
const common_1 = require("@nestjs/common");
const wallet_service_1 = require("./wallet.service");
const idempotency_interceptor_1 = require("../../common/interceptors/idempotency.interceptor");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const zod_1 = require("zod");
exports.BankInfoSchema = zod_1.z.object({
    banco: zod_1.z.string().min(3, 'El nombre del banco es muy corto'),
    cuenta: zod_1.z.string().regex(/^\d{10,20}$/, 'Número de cuenta inválido (debe tener entre 10 y 20 dígitos)'),
    tipo: zod_1.z.enum(['AHORRO', 'CORRIENTE']),
    cedula: zod_1.z.string().regex(/^\d{11}$/, 'La cédula dominicana debe tener 11 dígitos'),
    ownerName: zod_1.z.string().min(3).optional(),
});
const WithdrawSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('El monto debe ser positivo').max(500000, 'El monto excede el límite permitido'),
});
let WalletController = class WalletController {
    constructor(walletService) {
        this.walletService = walletService;
    }
    async getBalance(req) {
        const driverId = this.extractDriverId(req);
        return this.walletService.getBalance(driverId);
    }
    async withdraw(req, payload) {
        const driverId = this.extractDriverId(req);
        const parsed = WithdrawSchema.safeParse(payload);
        if (!parsed.success) {
            throw new common_1.BadRequestException({
                code: 'VALIDATION_ERROR',
                message: parsed.error.errors.map((e) => e.message).join(', '),
            });
        }
        return this.walletService.withdraw(driverId, parsed.data.amount);
    }
    async updateBank(req, payload) {
        const driverId = this.extractDriverId(req);
        const parsed = exports.BankInfoSchema.safeParse(payload);
        if (!parsed.success) {
            throw new common_1.BadRequestException({
                code: 'VALIDATION_ERROR',
                message: parsed.error.errors.map((e) => e.message).join(', '),
            });
        }
        return this.walletService.updateBank(driverId, parsed.data);
    }
    extractDriverId(req) {
        const entityId = req.user?.entityId;
        if (!entityId) {
            throw new common_1.UnauthorizedException('Token de sesión inválido: no se encontró entityId. Reautentícate.');
        }
        return entityId;
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Put)('bank'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "updateBank", null);
exports.WalletController = WalletController = __decorate([
    (0, common_1.Controller)('wallet'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.DRIVER),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map