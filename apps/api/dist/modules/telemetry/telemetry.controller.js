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
var TelemetryController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryController = void 0;
const common_1 = require("@nestjs/common");
const telemetry_service_1 = require("./telemetry.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
let TelemetryController = TelemetryController_1 = class TelemetryController {
    constructor(telemetryService, prisma) {
        this.telemetryService = telemetryService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(TelemetryController_1.name);
    }
    async sync(payload) {
        if (!Array.isArray(payload) || payload.length === 0) {
            throw new common_1.BadRequestException('EMPTY_PAYLOAD');
        }
        const headDriverId = payload[0]?.driverId;
        if (!headDriverId) {
            throw new common_1.BadRequestException('MISSING_DRIVER_ID');
        }
        const driver = await this.prisma.driver.findUnique({
            where: { id: headDriverId },
            select: { id: true },
        });
        if (!driver) {
            throw new common_1.BadRequestException('DRIVER_NOT_FOUND');
        }
        this.telemetryService.sync(payload).catch(err => this.logger.error(`Telemetry sync error: ${err.message}`));
        return { success: true };
    }
    async recordPlayback(payload, tabletKey) {
        const rateLimitOk = this.telemetryService.checkPlaybackRateLimit(payload.deviceId);
        if (!rateLimitOk) {
            this.logger.warn(`⚠️ Rate limit exceeded for deviceId=${payload.deviceId}`);
            return { success: false, reason: 'RATE_LIMITED', message: 'Max 60 playback events per minute per device' };
        }
        const deviceValid = await this.telemetryService.validateDevice(payload.deviceId);
        if (!deviceValid) {
            this.logger.warn(`⚠️ Invalid or inactive deviceId=${payload.deviceId}`);
            return { success: false, reason: 'DEVICE_INVALID', message: 'Device not registered or not OPERATIVO' };
        }
        if (tabletKey) {
            const keyValid = await this.telemetryService.validateTabletKey(payload.deviceId, tabletKey);
            if (!keyValid) {
                this.logger.warn(`⚠️ Invalid tablet key for deviceId=${payload.deviceId}`);
                return { success: false, reason: 'TABLET_KEY_INVALID', message: 'X-Tablet-Key does not match registered device' };
            }
        }
        const videoValid = await this.telemetryService.validateVideo(payload.videoId);
        if (!videoValid) {
            this.logger.warn(`⚠️ Invalid videoId=${payload.videoId} (no active campaign)`);
            return { success: false, reason: 'VIDEO_INVALID', message: 'Video not found or campaign not active' };
        }
        const ts = payload.clientTimestamp ? new Date(payload.clientTimestamp) : new Date();
        const now = new Date();
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const oneMinFuture = new Date(now.getTime() + 60 * 1000);
        if (ts < fiveMinAgo || ts > oneMinFuture) {
            this.logger.warn(`⚠️ Timestamp out of window for deviceId=${payload.deviceId}: ${ts.toISOString()}`);
            return { success: false, reason: 'TIMESTAMP_INVALID', message: 'Event timestamp outside 5-minute acceptance window' };
        }
        return this.telemetryService.recordPlayback({
            ...payload,
            verified: true,
            clientTimestamp: payload.clientTimestamp,
        });
    }
    async recordPlaybackBatch(payload, tabletKey) {
        if (!payload || payload.length === 0) {
            return { success: false, reason: 'EMPTY_PAYLOAD' };
        }
        const deviceId = payload[0]?.deviceId;
        if (!deviceId) {
            return { success: false, reason: 'MISSING_DEVICE_ID' };
        }
        const deviceValid = await this.telemetryService.validateDevice(deviceId);
        if (!deviceValid) {
            return { success: false, reason: 'DEVICE_INVALID', message: 'Device not registered or not OPERATIVO' };
        }
        const videoIds = [...new Set(payload.map(e => e.videoId))];
        for (const videoId of videoIds) {
            const videoValid = await this.telemetryService.validateVideo(videoId);
            if (!videoValid) {
                this.logger.warn(`⚠️ Invalid videoId=${videoId} in batch`);
            }
        }
        const rateLimitOk = this.telemetryService.checkPlaybackRateLimit(deviceId, payload.length);
        if (!rateLimitOk) {
            return { success: false, reason: 'RATE_LIMITED', message: 'Max 60 playback events per minute per device' };
        }
        const result = await this.telemetryService.recordPlaybackBatch(payload);
        return { success: true, processed: result.processed, rejected: result.rejected };
    }
};
exports.TelemetryController = TelemetryController;
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "sync", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('playback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-tablet-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "recordPlayback", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('playback-batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-tablet-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String]),
    __metadata("design:returntype", Promise)
], TelemetryController.prototype, "recordPlaybackBatch", null);
exports.TelemetryController = TelemetryController = TelemetryController_1 = __decorate([
    (0, common_1.Controller)('telemetry'),
    __metadata("design:paramtypes", [telemetry_service_1.TelemetryService,
        prisma_service_1.PrismaService])
], TelemetryController);
//# sourceMappingURL=telemetry.controller.js.map