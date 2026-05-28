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
var MediaScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../supabase/supabase.service");
let MediaScheduler = MediaScheduler_1 = class MediaScheduler {
    constructor(prisma, supabaseService) {
        this.prisma = prisma;
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(MediaScheduler_1.name);
    }
    async handleOrphanCleanup() {
        this.logger.log('🧹 Iniciando limpieza de archivos huérfanos en Storage...');
        try {
            const buckets = ['campaign-videos', 'ads-videos'];
            let deletedCount = 0;
            for (const bucket of buckets) {
                const { data: files, error } = await this.supabaseService.getClient().storage.from(bucket).list('', {
                    limit: 1000,
                    sortBy: { column: 'created_at', order: 'desc' },
                });
                if (error || !files) {
                    this.logger.warn(`No se pudo listar archivos en bucket ${bucket}: ${error?.message}`);
                    continue;
                }
                const mediaKeys = await this.prisma.media.findMany({
                    where: { storageKey: { not: null } },
                    select: { storageKey: true }
                });
                const assetUrls = await this.prisma.mediaAsset.findMany({
                    select: { url: true }
                });
                const activeKeys = new Set([
                    ...mediaKeys.map(m => m.storageKey),
                    ...assetUrls.map(a => {
                        const parts = a.url.split(`/${bucket}/`);
                        return parts.length > 1 ? parts[1] : null;
                    }).filter(Boolean)
                ]);
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const orphans = files.filter(f => {
                    if (!f.id && !f.metadata)
                        return false;
                    const isOlderThanADay = f.created_at ? new Date(f.created_at) < dayAgo : false;
                    return !activeKeys.has(f.name) && isOlderThanADay;
                });
                if (orphans.length > 0) {
                    const keysToDelete = orphans.map(o => o.name);
                    const { error: delError } = await this.supabaseService.getClient().storage
                        .from(bucket)
                        .remove(keysToDelete);
                    if (delError) {
                        this.logger.error(`Error borrando huérfanos en ${bucket}: ${delError.message}`);
                    }
                    else {
                        deletedCount += keysToDelete.length;
                        this.logger.log(`✅ Borrados ${keysToDelete.length} archivos huérfanos en ${bucket}.`);
                    }
                }
            }
            this.logger.log(`🏁 Resumen de limpieza: ${deletedCount} archivos eliminados.`);
        }
        catch (error) {
            this.logger.error(`❌ Fallo crítico en MediaScheduler: ${error.message}`);
        }
    }
};
exports.MediaScheduler = MediaScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MediaScheduler.prototype, "handleOrphanCleanup", null);
exports.MediaScheduler = MediaScheduler = MediaScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService])
], MediaScheduler);
//# sourceMappingURL=media.scheduler.js.map