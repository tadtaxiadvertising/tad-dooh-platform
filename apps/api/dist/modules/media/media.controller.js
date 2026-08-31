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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const media_service_1 = require("./media.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let MediaController = class MediaController {
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async getUploadUrl(fileName, fileType) {
        if (!fileName || !fileType) {
            throw new common_1.BadRequestException('fileName and fileType are required query parameters');
        }
        return this.mediaService.generateUploadUrl(fileName, fileType);
    }
    async registerBypassed(body) {
        if (!body.filename || !body.storageKey || !body.publicUrl) {
            throw new common_1.BadRequestException('Faltan campos (filename, storageKey, publicUrl)');
        }
        return this.mediaService.registerBypassedMedia(body);
    }
    async getMedia() {
        return this.mediaService.listFiles();
    }
    async getStatus(id) {
        return this.mediaService.getMediaStatus(id);
    }
    async registerMockMedia(dto) {
        if (!dto.filename || !dto.mimetype || !dto.size) {
            throw new common_1.BadRequestException('filename, mimetype, and size are required');
        }
        return this.mediaService.registerFileMock({
            originalname: dto.filename,
            mimetype: dto.mimetype,
            size: dto.size
        });
    }
    async deleteMedia(id) {
        return this.mediaService.deleteFile(id);
    }
    async deleteMediaAlt(id) {
        return this.mediaService.deleteFile(id);
    }
    async deleteMediaPost(id) {
        return this.mediaService.deleteFile(id);
    }
    async updateMedia(id, dto) {
        return this.mediaService.updateMedia(id, dto);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Get)('upload-url'),
    __param(0, (0, common_1.Query)('fileName')),
    __param(1, (0, common_1.Query)('fileType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getUploadUrl", null);
__decorate([
    (0, common_1.Post)('register-bypassed'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "registerBypassed", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getMedia", null);
__decorate([
    (0, common_1.Get)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('register-mock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "registerMockMedia", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteMedia", null);
__decorate([
    (0, common_1.Post)(':id/delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteMediaAlt", null);
__decorate([
    (0, common_1.Post)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "deleteMediaPost", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "updateMedia", null);
exports.MediaController = MediaController = __decorate([
    (0, roles_decorator_1.Roles)(roles_decorator_1.UserRole.ADMIN),
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map