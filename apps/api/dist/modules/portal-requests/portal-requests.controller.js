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
exports.PortalRequestsController = void 0;
const common_1 = require("@nestjs/common");
const portal_requests_service_1 = require("./portal-requests.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let PortalRequestsController = class PortalRequestsController {
    constructor(portalRequestsService) {
        this.portalRequestsService = portalRequestsService;
    }
    async create(body) {
        return this.portalRequestsService.create(body);
    }
    async findAll() {
        return this.portalRequestsService.findAll();
    }
    async findByAdvertiser(advertiserId) {
        return this.portalRequestsService.findByAdvertiser(advertiserId);
    }
    async findByDriver(driverId) {
        return this.portalRequestsService.findByDriver(driverId);
    }
    async findOne(id) {
        return this.portalRequestsService.findOne(id);
    }
    async update(id, body) {
        return this.portalRequestsService.update(id, body);
    }
    async delete(id) {
        return this.portalRequestsService.remove(id);
    }
};
exports.PortalRequestsController = PortalRequestsController;
__decorate([
    (0, common_1.Post)(),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('advertiser/:advertiserId'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('advertiserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "findByAdvertiser", null);
__decorate([
    (0, common_1.Get)('driver/:driverId'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('driverId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "findByDriver", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PortalRequestsController.prototype, "delete", null);
exports.PortalRequestsController = PortalRequestsController = __decorate([
    (0, common_1.Controller)('portal-requests'),
    __metadata("design:paramtypes", [portal_requests_service_1.PortalRequestsService])
], PortalRequestsController);
//# sourceMappingURL=portal-requests.controller.js.map