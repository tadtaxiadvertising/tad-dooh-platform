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
exports.AdvertisersController = void 0;
const common_1 = require("@nestjs/common");
const advertisers_service_1 = require("./advertisers.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const throttler_1 = require("@nestjs/throttler");
let AdvertisersController = class AdvertisersController {
    constructor(advertisersService) {
        this.advertisersService = advertisersService;
    }
    async findAll() {
        return this.advertisersService.findAll();
    }
    async login(body) {
        if (!body.email || !body.password) {
            throw new common_1.BadRequestException('email and password are required');
        }
        return this.advertisersService.login(body.email, body.password);
    }
    async recoverPassword(body) {
        if (!body.email) {
            throw new common_1.BadRequestException('Email is required for password recovery');
        }
        return this.advertisersService.recoverPassword(body.email);
    }
    async resetPassword(body) {
        if (!body.token || !body.newPassword) {
            throw new common_1.BadRequestException('Token and newPassword are required');
        }
        return this.advertisersService.resetPassword(body.token, body.newPassword);
    }
    async findOne(id) {
        const adv = await this.advertisersService.findOne(id);
        if (!adv)
            throw new common_1.BadRequestException('Anunciante no encontrado');
        return adv;
    }
    async create(body) {
        const FORBIDDEN_FIELDS = ['role', 'isAdmin', 'status', 'referredBy', 'app_metadata', 'user_metadata'];
        const injected = FORBIDDEN_FIELDS.filter((field) => body?.[field] !== undefined);
        if (injected.length > 0) {
            throw new common_1.BadRequestException(`Intento de inyección de campos privilegiados bloqueado: ${injected.join(', ')}`);
        }
        const companyName = body?.companyName;
        const contactName = body?.contactName;
        const email = body?.email;
        if (!companyName || !contactName || !email) {
            throw new common_1.BadRequestException('companyName, contactName, and email are required');
        }
        return this.advertisersService.create({
            companyName: String(companyName),
            contactName: String(contactName),
            email: String(email),
            phone: body?.phone !== undefined ? String(body.phone) : undefined,
            password: typeof body?.password === 'string' ? body.password : undefined,
            referralCode: typeof body?.referralCode === 'string' ? body.referralCode : undefined,
        });
    }
    async update(id, body) {
        return this.advertisersService.update(id, body);
    }
    async delete(id) {
        return this.advertisersService.remove(id);
    }
    async getPortal(id) {
        const data = await this.advertisersService.getPortalData(id);
        if (!data)
            throw new common_1.BadRequestException('Anunciante no encontrado');
        return data;
    }
    async getInvoices(id) {
        return this.advertisersService.getInvoices(id);
    }
};
exports.AdvertisersController = AdvertisersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "findAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('recover-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "recoverPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "findOne", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id/portal'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "getPortal", null);
__decorate([
    (0, common_1.Get)(':id/invoices'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdvertisersController.prototype, "getInvoices", null);
exports.AdvertisersController = AdvertisersController = __decorate([
    (0, common_1.Controller)('advertisers'),
    __metadata("design:paramtypes", [advertisers_service_1.AdvertisersService])
], AdvertisersController);
//# sourceMappingURL=advertisers.controller.js.map