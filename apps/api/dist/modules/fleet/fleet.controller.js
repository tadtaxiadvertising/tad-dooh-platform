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
exports.FleetController = void 0;
const common_1 = require("@nestjs/common");
const fleet_service_1 = require("./fleet.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const roles_decorator_2 = require("../auth/decorators/roles.decorator");
const track_batch_dto_1 = require("./dto/track-batch.dto");
let FleetController = class FleetController {
    constructor(fleetService) {
        this.fleetService = fleetService;
    }
    async getFleetDevices() {
        return this.fleetService.getFleetDevices();
    }
    async getFleetStats() {
        return this.fleetService.getFleetStats();
    }
    async getFleetStatusSummary() {
        return this.fleetService.getFleetStatusSummary();
    }
    async getFleetSummary() {
        return this.fleetService.getFleetStatusSummary();
    }
    async getFleetMap(req) {
        const user = req.user;
        const advertiserId = user.role === roles_decorator_2.UserRole.ADVERTISER ? user.entityId : undefined;
        return this.fleetService.getFleetMap(advertiserId);
    }
    async getTrackingBaseline(req) {
        const user = req.user;
        const advertiserId = user.role === roles_decorator_2.UserRole.ADVERTISER ? user.entityId : undefined;
        return this.fleetService.getFleetMap(advertiserId);
    }
    async getOfflineDevices() {
        return this.fleetService.getOfflineDevices();
    }
    async getFleetFinance() {
        return this.fleetService.getFleetFinance();
    }
    async sendFleetCommand(deviceId, body) {
        return this.fleetService.sendCommand(deviceId, body.type, body.params);
    }
    async broadcastFleetCommand(body) {
        return this.fleetService.broadcastCommand(body.type, body.params);
    }
    async registerDevice(body) {
        if (!body.placa || !body.driverName) {
            const { BadRequestException } = require('@nestjs/common');
            throw new BadRequestException('placa y driverName son obligatorios');
        }
        return this.fleetService.registerDeviceByAdmin(body.placa, body.driverName, body.deviceId);
    }
    async getDeviceRecentPath(deviceId) {
        return this.fleetService.getDeviceRecentPath(deviceId);
    }
    async getTrackingData() {
        return this.fleetService.getTrackingData();
    }
    async getTrackingSummary(req) {
        const user = req.user;
        const advertiserId = user.role === roles_decorator_2.UserRole.ADVERTISER ? user.entityId : undefined;
        return this.fleetService.getTrackingSummary(advertiserId);
    }
    async trackBatch(data) {
        return this.fleetService.ingestTelemetryBatch(data);
    }
};
exports.FleetController = FleetController;
__decorate([
    (0, common_1.Get)('devices'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getFleetDevices", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getFleetStats", null);
__decorate([
    (0, common_1.Get)('status-summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getFleetStatusSummary", null);
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getFleetSummary", null);
__decorate([
    (0, common_1.Get)('map'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getFleetMap", null);
__decorate([
    (0, common_1.Get)('tracking/baseline'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getTrackingBaseline", null);
__decorate([
    (0, common_1.Get)('offline'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getOfflineDevices", null);
__decorate([
    (0, common_1.Get)('finance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getFleetFinance", null);
__decorate([
    (0, common_1.Post)(':id/command'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "sendFleetCommand", null);
__decorate([
    (0, common_1.Post)('broadcast-command'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "broadcastFleetCommand", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Get)('devices/:id/recent-path'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getDeviceRecentPath", null);
__decorate([
    (0, common_1.Get)('tracking'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getTrackingData", null);
__decorate([
    (0, common_1.Get)('tracking/summary'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN, roles_decorator_2.UserRole.ADVERTISER),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "getTrackingSummary", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('track-batch'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [track_batch_dto_1.TrackBatchDto]),
    __metadata("design:returntype", Promise)
], FleetController.prototype, "trackBatch", null);
exports.FleetController = FleetController = __decorate([
    (0, common_1.Controller)('fleet'),
    (0, roles_decorator_1.Roles)(roles_decorator_2.UserRole.ADMIN),
    __metadata("design:paramtypes", [fleet_service_1.FleetService])
], FleetController);
//# sourceMappingURL=fleet.controller.js.map