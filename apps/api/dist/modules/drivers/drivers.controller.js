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
var DriversController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversController = void 0;
const common_1 = require("@nestjs/common");
const drivers_service_1 = require("./drivers.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_decorator_2 = require("../auth/decorators/roles.decorator");
const throttler_1 = require("@nestjs/throttler");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const system_settings_service_1 = require("../system-settings/system-settings.service");
let DriversController = DriversController_1 = class DriversController {
    constructor(driversService, systemSettings) {
        this.driversService = driversService;
        this.systemSettings = systemSettings;
        this.logger = new common_1.Logger(DriversController_1.name);
    }
    async getAppVersion() {
        return this.systemSettings.getDriverAppVersion();
    }
    async findAll() {
        return this.driversService.findAll();
    }
    async getStats() {
        return this.driversService.getStats();
    }
    async findOne(id) {
        const driver = await this.driversService.findOne(id);
        if (!driver)
            throw new common_1.BadRequestException('Chofer no encontrado');
        return driver;
    }
    async create(body, req) {
        if (!body.fullName || !body.phone) {
            throw new common_1.BadRequestException('fullName y phone son obligatorios');
        }
        const isAdmin = req?.user?.role === 'ADMIN' || req?.user?.role === 'admin';
        const isContractAccepted = isAdmin ? true : body.contractAccepted;
        if (!isAdmin && !isContractAccepted) {
            throw new common_1.BadRequestException('Debes aceptar el contrato de servicio para unirte a TAD');
        }
        const sanitize = (val) => (val && val.trim() !== '' ? val : undefined);
        return this.driversService.create({
            ...body,
            contractAccepted: isContractAccepted,
            cedula: sanitize(body.cedula),
            taxiPlate: sanitize(body.taxiPlate),
            licensePlate: sanitize(body.licensePlate),
            deviceId: sanitize(body.deviceId),
            subscriptionPaid: isAdmin ? body.subscriptionPaid : false,
            subscriptionEnd: isAdmin && body.subscriptionEnd ? new Date(body.subscriptionEnd) : undefined,
            password: body.password,
        });
    }
    async login(body) {
        const phone = body.phone || body.email || body.cedula;
        if (!phone || !body.password) {
            throw new common_1.BadRequestException('Debe enviar phone, email o cédula junto a la contraseña.');
        }
        return this.driversService.login(phone, body.password);
    }
    async getEarnings(id) {
        return this.driversService.calculateMonthlyEarnings(id);
    }
    async updateSubscription(id, body) {
        return this.driversService.updateSubscription(id, body.paid, body.endDate ? new Date(body.endDate) : undefined);
    }
    async acceptAgreement(id, body, req) {
        if (!body.version)
            throw new common_1.BadRequestException('version es requerida');
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown');
        const userAgent = (req.headers['user-agent'] || 'unknown');
        try {
            return await this.driversService.acceptAgreement(id, body.version, ipAddress, userAgent);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async assignDevice(id, body) {
        if (!body.deviceId)
            throw new common_1.BadRequestException('deviceId es requerido');
        return this.driversService.assignDevice(id, body.deviceId);
    }
    async unlinkDevice(id) {
        return this.driversService.unlinkDevice(id);
    }
    async checkTabletAccess(tabletId) {
        const result = await this.driversService.checkTabletAccess(tabletId);
        if (!result.access && result.httpStatus === common_1.HttpStatus.PAYMENT_REQUIRED) {
            throw new common_1.HttpException(result, common_1.HttpStatus.PAYMENT_REQUIRED);
        }
        return result;
    }
    async getMyHub(req) {
        const { entityId } = req.user;
        if (!entityId)
            throw new common_1.ForbiddenException('No tienes un perfil de conductor asociado');
        return this.driversService.getDriverHubDataById(entityId);
    }
    async getMyTransactions(req) {
        const { entityId } = req.user;
        if (!entityId)
            throw new common_1.ForbiddenException('No tienes un perfil de conductor asociado');
        return this.driversService.getDriverTransactions(entityId);
    }
    async getHubPreview(id) {
        return this.driversService.getDriverHubDataById(id);
    }
    async getDeviceHubPreview(deviceId) {
        return this.driversService.getDriverHubDataByDeviceId(deviceId);
    }
    async getDriverHub(tabletId, tabletKey) {
        const validKey = process.env.TABLET_HUB_KEY;
        if (!validKey || tabletKey !== validKey) {
            this.logger.warn(`🛑 [SECURITY] Intento de acceso a HUB sin TABLET_KEY válida. Tablet: ${tabletId}`);
            throw new common_1.ForbiddenException('Invalid tablet authentication');
        }
        try {
            return await this.driversService.getDriverHubData(tabletId);
        }
        catch (e) {
            throw new common_1.BadRequestException(e.message);
        }
    }
    async purgeAll(secret, req) {
        const adminSecret = process.env.ADMIN_SECRET;
        if (!adminSecret || secret !== adminSecret) {
            this.logger.warn(`⚠️ [PURGE] Intento no autorizado desde IP: ${req.ip}`);
            throw new common_1.ForbiddenException('Unauthorized purge attempt');
        }
        this.logger.warn(`🚨 [PURGE] Purga total iniciada por ADMIN autenticado. IP: ${req.ip}`);
        return this.driversService.purgeAll();
    }
    async remove(id) {
        return this.driversService.remove(id);
    }
    async linkActiveAd(id, campaignId) {
        return this.driversService.linkActiveAd(id, campaignId);
    }
};
exports.DriversController = DriversController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }),
    (0, common_1.Get)('app-version'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getAppVersion", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.DRIVER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "findOne", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "create", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "login", null);
__decorate([
    (0, common_1.Get)(':id/earnings'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.DRIVER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getEarnings", null);
__decorate([
    (0, common_1.Put)(':id/subscription'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Post)(':id/accept-agreement'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.DRIVER),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "acceptAgreement", null);
__decorate([
    (0, common_1.Post)(':id/assign-device'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "assignDevice", null);
__decorate([
    (0, common_1.Post)(':id/unlink-device'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "unlinkDevice", null);
__decorate([
    (0, common_1.Get)('tablet/:tabletId/access'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('tabletId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "checkTabletAccess", null);
__decorate([
    (0, common_1.Get)('me/hub'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.DRIVER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getMyHub", null);
__decorate([
    (0, common_1.Get)('me/transactions'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.DRIVER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getMyTransactions", null);
__decorate([
    (0, common_1.Get)(':id/hub-preview'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getHubPreview", null);
__decorate([
    (0, common_1.Get)('device/:deviceId/hub-preview'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getDeviceHubPreview", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('tablet/:tabletId/hub'),
    __param(0, (0, common_1.Param)('tabletId')),
    __param(1, (0, common_1.Headers)('x-tablet-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "getDriverHub", null);
__decorate([
    (0, common_1.Post)('purge-all'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Headers)('x-admin-secret')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "purgeAll", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/active-ads'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('campaignId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DriversController.prototype, "linkActiveAd", null);
exports.DriversController = DriversController = DriversController_1 = __decorate([
    (0, common_1.Controller)('drivers'),
    __metadata("design:paramtypes", [drivers_service_1.DriversService,
        system_settings_service_1.SystemSettingsService])
], DriversController);
//# sourceMappingURL=drivers.controller.js.map