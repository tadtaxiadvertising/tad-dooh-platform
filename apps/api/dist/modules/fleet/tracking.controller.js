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
exports.TrackingController = void 0;
const common_1 = require("@nestjs/common");
const fleet_service_1 = require("./fleet.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let TrackingController = class TrackingController {
    constructor(fleetService) {
        this.fleetService = fleetService;
    }
    async getBaseline(req) {
        const user = req.user;
        const advertiserId = user.role === roles_decorator_1.UserRole.ADVERTISER ? user.entityId : undefined;
        return this.fleetService.getFleetMap(advertiserId);
    }
};
exports.TrackingController = TrackingController;
__decorate([
    (0, common_1.Get)('baseline'),
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN, roles_decorator_1.UserRole.ADVERTISER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "getBaseline", null);
exports.TrackingController = TrackingController = __decorate([
    (0, common_1.Controller)('tracking'),
    __metadata("design:paramtypes", [fleet_service_1.FleetService])
], TrackingController);
//# sourceMappingURL=tracking.controller.js.map