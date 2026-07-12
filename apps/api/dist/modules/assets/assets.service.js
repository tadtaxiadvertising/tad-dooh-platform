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
var AssetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../supabase/supabase.service");
const rxjs_1 = require("rxjs");
const mediaAssetSafeSelect = {
    id: true,
    campaignId: true,
    type: true,
    filename: true,
    url: true,
    fileSize: true,
    checksum: true,
    duration: true,
    version: true,
    createdAt: true,
    qrUrl: true,
    weight: true,
};
let AssetsService = AssetsService_1 = class AssetsService {
    constructor(prisma, supabase, http) {
        this.prisma = prisma;
        this.supabase = supabase;
        this.http = http;
        this.logger = new common_1.Logger(AssetsService_1.name);
        this.REMOTION_URL = process.env.REMOTION_SERVICE_URL || 'http://tad-remotion:8000';
    }
    async getAssetManifest(deviceId) {
        const now = new Date();
        const activeCampaigns = await this.prisma.campaign.findMany({
            where: {
                active: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                mediaAssets: { select: mediaAssetSafeSelect },
            },
            orderBy: {
                updatedAt: 'desc',
            }
        });
        const manifest = {};
        for (const campaign of activeCampaigns) {
            for (const asset of campaign.mediaAssets) {
                manifest[asset.id] = {
                    url: asset.url,
                    checksum: asset.checksum,
                    size: asset.fileSize,
                    type: asset.type,
                    filename: asset.filename
                };
            }
        }
        return {
            manifest,
            version: activeCampaigns.length > 0 ? activeCampaigns[0].updatedAt.getTime() : 0
        };
    }
    async handleAssetWebhook(payload) {
        this.logger.log(`📥 Webhook recibido: ${JSON.stringify(payload)}`);
        if (payload.type === 'INVALID_ASSET' || payload.record?.status === 'INVALID_ASSET') {
            const assetId = payload.record?.id || payload.assetId;
            this.logger.warn(`⚠️ Asset inválido detectado (ID: ${assetId}). Iniciando recuperación automática...`);
            if (assetId) {
                await this.prisma.mediaAsset.update({
                    where: { id: assetId },
                    data: {
                        processingStatus: 'FAILED',
                        validationError: 'Asset no cumple con requisitos H.264 o excedió el límite.'
                    }
                }).catch(e => this.logger.error(`Error actualizando asset: ${e.message}`));
            }
            this.triggerFallbackRender(assetId, payload).catch(err => {
                this.logger.error(`❌ Recuperación automática falló para asset ${assetId}: ${err.message}`);
            });
        }
        return { received: true };
    }
    async triggerFallbackRender(assetId, webhookPayload) {
        const startTime = Date.now();
        const asset = await this.prisma.mediaAsset.findUnique({
            where: { id: assetId },
            include: { campaign: true },
        });
        if (!asset || !asset.campaign) {
            this.logger.error(`Asset ${assetId} no encontrado o sin campaña asociada. Abortando fallback.`);
            return;
        }
        const campaign = asset.campaign;
        this.logger.log(`🔄 Generando fallback para campaña "${campaign.name}" (ID: ${campaign.id})`);
        const fallbackFileName = `fallback-${campaign.id}-${Date.now()}.mp4`;
        const storagePath = `campaigns/${campaign.id}/${fallbackFileName}`;
        const bucket = 'campaign-videos';
        const client = this.supabase.getClient();
        const { data: signedData, error: signedError } = await client.storage
            .from(bucket)
            .createSignedUploadUrl(storagePath);
        if (signedError || !signedData) {
            this.logger.error(`Error generando Signed Upload URL: ${signedError?.message}`);
            throw new Error(`Signed URL generation failed: ${signedError?.message}`);
        }
        this.logger.log(`📝 Signed Upload URL generada para: ${storagePath}`);
        const fallbackPayload = {
            campaignId: campaign.id,
            uploadUrl: signedData.signedUrl,
            uploadToken: signedData.token,
            props: {
                primaryText: campaign.name || 'Tu Anuncio Aquí',
                brandColor: '#e51636',
                secondaryText: 'Anuncio generado automáticamente por TAD',
                logoUrl: '',
                bgUrl: '',
            },
        };
        this.logger.log(`🚀 Enviando solicitud de fallback render a ${this.REMOTION_URL}/api/process-fallback`);
        const response = await (0, rxjs_1.firstValueFrom)(this.http.post(`${this.REMOTION_URL}/api/process-fallback`, fallbackPayload, {
            timeout: 120_000,
            headers: { 'Content-Type': 'application/json' },
        }));
        if (!response.data?.success) {
            throw new Error(`tad-remotion respondió sin éxito: ${JSON.stringify(response.data)}`);
        }
        const publicUrl = this.supabase.getPublicUrl(storagePath, bucket);
        await this.prisma.mediaAsset.update({
            where: { id: assetId },
            data: {
                url: publicUrl,
                filename: fallbackFileName,
                processingStatus: 'ACTIVE',
                validationError: null,
            },
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        this.logger.log(`✅ Recuperación automática completada en ${duration}s. Nuevo asset: ${publicUrl}`);
        await this.supabase.broadcastEvent(`campaign-${campaign.id}`, 'ASSET_RECOVERED', {
            assetId,
            campaignId: campaign.id,
            newUrl: publicUrl,
            message: 'Se generó un anuncio de respaldo automáticamente.',
        }).catch(err => this.logger.warn(`Broadcast falló (no crítico): ${err.message}`));
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = AssetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService,
        axios_1.HttpService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map