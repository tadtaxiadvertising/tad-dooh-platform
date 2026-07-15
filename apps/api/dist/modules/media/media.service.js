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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const uuid_1 = require("uuid");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../supabase/supabase.service");
const business_rules_1 = require("../../common/constants/business-rules");
let MediaService = MediaService_1 = class MediaService {
    constructor(config, prisma, supabaseService) {
        this.config = config;
        this.prisma = prisma;
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(MediaService_1.name);
        this.supabase = this.supabaseService.getClient();
    }
    generateHash(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(buffer).digest('hex');
    }
    async generateUploadUrl(fileName, fileType) {
        try {
            const { error: bucketError } = await this.supabase.storage.createBucket('ads-videos', { public: true }).catch(err => ({ error: err }));
            if (bucketError && bucketError.message !== 'The resource already exists') {
                this.logger.warn(`Potential issue creating bucket ads-videos: ${bucketError.message}`);
            }
            const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const path = `advertiser-uploads/${Date.now()}-${sanitized}`;
            this.logger.log(`Generando URL firmada para: ${path} (${fileType})`);
            const { data, error } = await this.supabase.storage
                .from('ads-videos')
                .createSignedUploadUrl(path);
            if (error) {
                this.logger.error(`Error de Supabase creando URL firmada: ${JSON.stringify(error)}`);
                throw new Error(`Supabase error: ${error.message} (Bucket: ads-videos, Path: ${path})`);
            }
            if (!data || !data.signedUrl) {
                throw new Error('Supabase returned no signed URL');
            }
            const basePrefix = this.config.get('CDN_URL_PREFIX') || this.config.get('SUPABASE_URL');
            const publicUrl = `${basePrefix}/storage/v1/object/public/ads-videos/${path}`;
            return {
                uploadUrl: data.signedUrl,
                path: path,
                publicUrl,
            };
        }
        catch (e) {
            this.logger.error(`Falla en generateUploadUrl: ${e.message}`);
            throw new common_1.BadRequestException(`${e.message}`);
        }
    }
    async registerBypassedMedia(data) {
        if (data.size && Number(data.size) > business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES) {
            throw new common_1.BadRequestException(`El archivo registro excede el límite permitido de ${business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`);
        }
        try {
            const cdnPrefix = this.config.get('CDN_URL_PREFIX');
            let finalCdnUrl = data.publicUrl;
            if (cdnPrefix && data.publicUrl.includes(this.config.get('SUPABASE_URL'))) {
                finalCdnUrl = data.publicUrl.replace(this.config.get('SUPABASE_URL'), cdnPrefix);
            }
            const media = await this.prisma.media.create({
                data: {
                    filename: data.filename,
                    originalFilename: data.filename,
                    url: data.publicUrl,
                    cdnUrl: finalCdnUrl,
                    storageKey: data.storageKey,
                    campaign_id: data.campaignId !== 'general' ? data.campaignId : null,
                    mimeType: data.contentType,
                    fileSize: BigInt(data.size || 0),
                    status: 'READY',
                    qrUrl: data.qrUrl,
                    hashMd5: data.hashMd5 || 'bypassed',
                }
            });
            return {
                ...media,
                fileSize: Number(media.fileSize)
            };
        }
        catch (dbError) {
            this.logger.error("Database Insert Error on bypass: ", dbError);
            throw new common_1.BadRequestException(`Error guardando metadata: ${dbError.message}`);
        }
    }
    async registerFileMock(dto) {
        if (dto.size > business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES) {
            throw new common_1.BadRequestException(`El mock excede el límite permitido de ${business_rules_1.BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`);
        }
        const fileExt = (0, path_1.extname)(dto.originalname);
        const fileId = (0, uuid_1.v4)();
        const fileName = `videos/mock-${fileId}${fileExt}`;
        const cdnUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#mock-${fileId}`;
        try {
            const media = await this.prisma.media.create({
                data: {
                    id: fileId,
                    filename: fileName,
                    originalFilename: dto.originalname,
                    mimeType: dto.mimetype,
                    fileSize: BigInt(dto.size),
                    storageKey: fileName,
                    cdnUrl: cdnUrl,
                    status: 'READY',
                    hashMd5: 'pending',
                    hashSha256: 'pending',
                }
            });
            return {
                id: media.id,
                url: media.cdnUrl,
                size: Number(media.fileSize),
                mime: media.mimeType,
            };
        }
        catch (dbError) {
            this.logger.error(`DB Error saving mock media: ${dbError.message}`);
            throw new common_1.BadRequestException('Failed to save mock metadata to database');
        }
    }
    async listFiles() {
        try {
            const mediaList = await this.prisma.media.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return mediaList.map(m => ({
                id: m.id,
                url: m.cdnUrl,
                filename: m.filename,
                originalFilename: m.originalFilename,
                size: Number(m.fileSize),
                mime: m.mimeType,
                qrUrl: m.qrUrl,
                createdAt: m.createdAt,
            }));
        }
        catch (error) {
            this.logger.error(`Error listing files from DB: ${error.message}`);
            return [];
        }
    }
    async getMediaStatus(mediaId) {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const activePlays = await this.prisma.playbackEvent.findMany({
            where: {
                videoId: mediaId,
                timestamp: {
                    gte: tenMinAgo,
                },
            },
            select: {
                deviceId: true,
                timestamp: true,
            },
            distinct: ['deviceId'],
            orderBy: {
                timestamp: 'desc',
            },
        });
        return {
            media_id: mediaId,
            active_devices_count: activePlays.length,
            active_devices: activePlays.map(p => p.deviceId),
            last_activity: activePlays[0]?.timestamp || null,
        };
    }
    async updateMedia(id, data) {
        try {
            const media = await this.prisma.media.update({
                where: { id },
                data: {
                    qrUrl: data.qrUrl
                }
            });
            return {
                ...media,
                fileSize: Number(media.fileSize)
            };
        }
        catch (error) {
            this.logger.error(`Error updating media ${id}: ${error.message}`);
            throw new common_1.BadRequestException(`Falla al actualizar metadata: ${error.message}`);
        }
    }
    async deleteFile(id) {
        try {
            const media = await this.prisma.media.findUnique({ where: { id } });
            if (!media)
                throw new common_1.BadRequestException('Media no encontrada');
            if (media.storageKey && !media.storageKey.startsWith('videos/mock-')) {
                await this.supabase.storage
                    .from('campaign-videos')
                    .remove([media.storageKey])
                    .catch(() => { });
            }
            await this.prisma.media.delete({ where: { id } });
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Error deleting file: ${error.message}`);
            throw new common_1.BadRequestException(`Error al eliminar archivo: ${error.message}`);
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService])
], MediaService);
//# sourceMappingURL=media.service.js.map