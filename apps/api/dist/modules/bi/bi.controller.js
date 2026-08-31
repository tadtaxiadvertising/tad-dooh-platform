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
exports.BiController = void 0;
const common_1 = require("@nestjs/common");
const bi_service_1 = require("./bi.service");
const supabase_auth_guard_1 = require("../auth/guards/supabase-auth.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_decorator_2 = require("../auth/decorators/roles.decorator");
let BiController = class BiController {
    constructor(biService) {
        this.biService = biService;
    }
    async getMasterKpis() {
        return this.biService.getMasterKpis();
    }
    async getFleetHealth() {
        return this.biService.getFleetHealth();
    }
    async getTaxiDrillDown(deviceId) {
        return this.biService.getTaxiDrillDown(deviceId);
    }
    async generateReconciliation(dto) {
        if (!dto.period || !dto.period.match(/^\d{4}-\d{2}$/)) {
            throw new common_1.HttpException('Formato de período inválido (YYYY-MM)', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.biService.generateReconciliationReport(dto.period);
    }
    async getReconciliation(period, page, pageSize) {
        const p = page && !isNaN(Number(page)) ? Number(page) : 1;
        const ps = pageSize && !isNaN(Number(pageSize)) ? Number(pageSize) : 100;
        return this.biService.getReconciliationReport(period, p, ps);
    }
    async getHotspots() {
        return this.biService.getHotspots();
    }
};
exports.BiController = BiController;
__decorate([
    (0, common_1.Get)('kpis'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiController.prototype, "getMasterKpis", null);
__decorate([
    (0, common_1.Get)('fleet-health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiController.prototype, "getFleetHealth", null);
__decorate([
    (0, common_1.Get)('fleet-health/:deviceId/drill-down'),
    __param(0, (0, common_1.Param)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BiController.prototype, "getTaxiDrillDown", null);
__decorate([
    (0, common_1.Post)('reconciliation/generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BiController.prototype, "generateReconciliation", null);
__decorate([
    (0, common_1.Get)('reconciliation/:period'),
    __param(0, (0, common_1.Param)('period')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BiController.prototype, "getReconciliation", null);
__decorate([
    (0, common_1.Get)('hotspots'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiController.prototype, "getHotspots", null);
exports.BiController = BiController = __decorate([
    (0, common_1.Controller)('bi'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __metadata("design:paramtypes", [bi_service_1.BiService])
], BiController);
//# sourceMappingURL=bi.controller.js.map