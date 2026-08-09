"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var VideoGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const prisma_service_1 = require("../prisma/prisma.service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const axios_1 = __importDefault(require("axios"));
let VideoGeneratorService = VideoGeneratorService_1 = class VideoGeneratorService {
    constructor(supabaseService, prisma) {
        this.supabaseService = supabaseService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(VideoGeneratorService_1.name);
    }
    async generateAdVideo(campaignId, props) {
        const outputDir = path.join(os.tmpdir(), 'tad-videos');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputLocation = path.join(outputDir, `ad-${campaignId}-${Date.now()}.mp4`);
        this.logger.log(`🎬 Solicitando renderizado de video al microservicio Remotion para campaña: ${campaignId}`);
        try {
            const remotionServiceUrl = process.env.REMOTION_SERVICE_URL || 'http://localhost:8000/api/render';
            const response = await axios_1.default.post(remotionServiceUrl, {
                campaignId,
                props
            }, {
                responseType: 'arraybuffer',
                timeout: 120000,
            });
            const fileBuffer = Buffer.from(response.data);
            fs.writeFileSync(outputLocation, fileBuffer);
            const fileName = `ads/${campaignId}/${path.basename(outputLocation)}`;
            const supabase = this.supabaseService.getClient();
            const { data, error } = await supabase.storage
                .from('campaign-videos')
                .upload(fileName, fileBuffer, {
                contentType: 'video/mp4',
                upsert: true,
            });
            if (error)
                throw error;
            const publicUrl = this.supabaseService.getPublicUrl(fileName, 'campaign-videos');
            const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
            const asset = await this.prisma.mediaAsset.create({
                data: {
                    campaignId,
                    type: 'VIDEO',
                    filename: path.basename(outputLocation),
                    url: publicUrl,
                    fileSize: fileBuffer.length,
                    checksum: checksum,
                    duration: 10,
                    version: 1,
                },
            });
            if (fs.existsSync(outputLocation)) {
                fs.unlinkSync(outputLocation);
            }
            this.logger.log(`🚀 Video generado y subido exitosamente: ${publicUrl}`);
            return {
                success: true,
                url: publicUrl,
                assetId: asset.id
            };
        }
        catch (err) {
            this.logger.error(`❌ Fallo en generación de video: ${err.message}`);
            throw err;
        }
    }
};
exports.VideoGeneratorService = VideoGeneratorService;
exports.VideoGeneratorService = VideoGeneratorService = VideoGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        prisma_service_1.PrismaService])
], VideoGeneratorService);
//# sourceMappingURL=video-generator.service.js.map