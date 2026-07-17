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
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let SyncController = class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
        this.etagCache = new Map();
        this.ttlMs = 5 * 60 * 1000;
    }
    resolveCachedEtag(deviceId, ifNoneMatch) {
        if (!ifNoneMatch)
            return false;
        const cached = this.etagCache.get(deviceId);
        if (!cached || cached.expiresAt < Date.now()) {
            if (cached)
                this.etagCache.delete(deviceId);
            return false;
        }
        return cached.value === ifNoneMatch;
    }
    cacheEtag(deviceId, etag) {
        this.etagCache.set(deviceId, { value: etag, expiresAt: Date.now() + this.ttlMs });
    }
    async getDeviceManifest(deviceId, ifNoneMatch, res) {
        if (!deviceId) {
            throw new common_1.HttpException('DEVICE_ID_REQUIRED', common_1.HttpStatus.BAD_REQUEST);
        }
        if (this.resolveCachedEtag(deviceId, ifNoneMatch)) {
            res.status(common_1.HttpStatus.NOT_MODIFIED).send();
            return;
        }
        const manifest = await this.syncService.getDeviceManifest(deviceId);
        if (manifest.killSwitch === true) {
            res.setHeader('Cache-Control', 'no-store');
            throw new common_1.HttpException(manifest, common_1.HttpStatus.PAYMENT_REQUIRED);
        }
        const etag = manifest.etag || '';
        this.cacheEtag(deviceId, etag);
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        return manifest;
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':deviceId'),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, common_1.Headers)('if-none-match')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "getDeviceManifest", null);
exports.SyncController = SyncController = __decorate([
    (0, common_1.Controller)('sync'),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map