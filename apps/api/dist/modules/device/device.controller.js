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
exports.DeviceController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const device_service_1 = require("./device.service");
const register_device_dto_1 = require("./dto/register-device.dto");
const heartbeat_dto_1 = require("./dto/heartbeat.dto");
const playback_confirmation_dto_1 = require("./dto/playback-confirmation.dto");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const subscription_guard_1 = require("./guards/subscription.guard");
const sync_device_dto_1 = require("./dto/sync-device.dto");
const bulk_sync_dto_1 = require("./dto/bulk-sync.dto");
let DeviceController = class DeviceController {
    constructor(deviceService) {
        this.deviceService = deviceService;
    }
    async register(dto) {
        const device = await this.deviceService.registerDevice(dto);
        return { success: true, device_id: device.deviceId };
    }
    async heartbeat(dto) {
        await this.deviceService.deviceHeartbeat(dto);
        return { success: true };
    }
    async playback(dto) {
        await this.deviceService.recordPlayback(dto);
        return { success: true };
    }
    async sync(dto) {
        return this.deviceService.syncDeviceCampaigns(dto);
    }
    async bulkSync(dto) {
        return this.deviceService.processBulkSync(dto);
    }
    async checkSlots(deviceId) {
        return this.deviceService.getDeviceSlots(deviceId);
    }
    async acknowledgeCommand(commandId, result) {
        return this.deviceService.acknowledgeCommand(commandId, result);
    }
};
exports.DeviceController = DeviceController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_device_dto_1.RegisterDeviceDto]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('heartbeat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [heartbeat_dto_1.HeartbeatDto]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Post)('playback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [playback_confirmation_dto_1.PlaybackConfirmationDto]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "playback", null);
__decorate([
    (0, common_1.UseGuards)(subscription_guard_1.SubscriptionGuard),
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sync_device_dto_1.SyncDeviceDto]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "sync", null);
__decorate([
    (0, common_1.UseGuards)(subscription_guard_1.SubscriptionGuard),
    (0, common_1.Post)('bulk-sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_sync_dto_1.BulkSyncDto]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "bulkSync", null);
__decorate([
    (0, common_1.Get)(':id/slots'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "checkSlots", null);
__decorate([
    (0, common_1.Post)('command/:id/ack'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeviceController.prototype, "acknowledgeCommand", null);
exports.DeviceController = DeviceController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('device'),
    __metadata("design:paramtypes", [device_service_1.DeviceService])
], DeviceController);
//# sourceMappingURL=device.controller.js.map