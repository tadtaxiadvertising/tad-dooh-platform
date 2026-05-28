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
var TelemetryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_BATCH_SIZE = 500;
const CHUNK_SIZE = 100;
let TelemetryService = TelemetryService_1 = class TelemetryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TelemetryService_1.name);
    }
    async sync(data) {
        if (!data || data.length === 0)
            return;
        const safeData = data.length > MAX_BATCH_SIZE
            ? data.slice(0, MAX_BATCH_SIZE)
            : data;
        if (safeData.length < data.length) {
            this.logger.warn(`⚠️ [ANTI-OOM] Telemetry batch truncated: ${data.length} → ${safeData.length} points (max: ${MAX_BATCH_SIZE})`);
        }
        try {
            let totalProcessed = 0;
            for (let offset = 0; offset < safeData.length; offset += CHUNK_SIZE) {
                const chunk = safeData.slice(offset, offset + CHUNK_SIZE);
                const values = [];
                const params = [];
                for (let i = 0; i < chunk.length; i++) {
                    const item = chunk[i];
                    const base = i * 5;
                    values.push(`(gen_random_uuid(), $${base + 1}, ST_SetSRID(ST_MakePoint($${base + 2}, $${base + 3}), 4326), $${base + 4}, $${base + 5})`);
                    params.push(item.driverId, item.lng, item.lat, item.speed ?? 0, item.timestamp ? new Date(item.timestamp) : new Date());
                }
                await this.prisma.$executeRawUnsafe(`INSERT INTO telemetry (id, driver_id, coords, speed, timestamp)
           VALUES ${values.join(', ')}
           ON CONFLICT (driver_id, timestamp) DO NOTHING`, ...params);
                totalProcessed += chunk.length;
            }
            this.logger.log(`✅ Batch sync completed: ${totalProcessed} points processed in ${Math.ceil(safeData.length / CHUNK_SIZE)} chunks.`);
        }
        catch (err) {
            this.logger.error(`Failed to batch sync telemetry: ${err.message}`);
        }
    }
    async recordPlayback(data) {
        try {
            return await this.prisma.playbackEvent.create({
                data: {
                    deviceId: data.deviceId,
                    videoId: data.videoId,
                    eventType: data.eventType,
                    lat: data.lat,
                    lng: data.lng,
                    timestamp: new Date(),
                },
            });
        }
        catch (err) {
            this.logger.error(`Failed to record playback event for device ${data.deviceId}`, err);
            throw err;
        }
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = TelemetryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelemetryService);
//# sourceMappingURL=telemetry.service.js.map