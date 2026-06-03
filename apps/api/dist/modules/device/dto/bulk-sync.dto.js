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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkSyncDto = exports.BulkLocationDto = exports.BulkPlaybackDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class BulkPlaybackDto {
}
exports.BulkPlaybackDto = BulkPlaybackDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_\-]+$/, { message: 'video_id contains invalid characters' }),
    __metadata("design:type", String)
], BulkPlaybackDto.prototype, "video_id", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BulkPlaybackDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BulkPlaybackDto.prototype, "lat", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BulkPlaybackDto.prototype, "lng", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkPlaybackDto.prototype, "isSimulated", void 0);
class BulkLocationDto {
}
exports.BulkLocationDto = BulkLocationDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BulkLocationDto.prototype, "lat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BulkLocationDto.prototype, "lng", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BulkLocationDto.prototype, "timestamp", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkLocationDto.prototype, "isSimulated", void 0);
class BulkSyncDto {
}
exports.BulkSyncDto = BulkSyncDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_\-]+$/, { message: 'device_id contains invalid characters' }),
    __metadata("design:type", String)
], BulkSyncDto.prototype, "device_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], BulkSyncDto.prototype, "battery_level", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(16),
    (0, class_validator_1.Matches)(/^[0-9.]+\s?[GMBKmbk]+$/, { message: 'storage_free format is invalid (e.g. 1.2GB)' }),
    __metadata("design:type", String)
], BulkSyncDto.prototype, "storage_free", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(200),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkPlaybackDto),
    __metadata("design:type", Array)
], BulkSyncDto.prototype, "playbacks", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(200),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BulkLocationDto),
    __metadata("design:type", Array)
], BulkSyncDto.prototype, "locations", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], BulkSyncDto.prototype, "isSimulated", void 0);
//# sourceMappingURL=bulk-sync.dto.js.map