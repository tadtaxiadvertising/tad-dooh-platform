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
const PLAYBACK_MAX_BATCH_SIZE = 200;
const PLAYBACK_RATE_LIMIT = 60;
const PLAYBACK_RATE_WINDOW = 60_000;
let TelemetryService = TelemetryService_1 = class TelemetryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(TelemetryService_1.name);
        this.playbackRateMap = new Map();
    }
    checkPlaybackRateLimit(deviceId, additionalCount = 1) {
        const now = Date.now();
        const windowStart = now - PLAYBACK_RATE_WINDOW;
        let timestamps = this.playbackRateMap.get(deviceId) || [];
        timestamps = timestamps.filter(t => t > windowStart);
        if (timestamps.length + additionalCount > PLAYBACK_RATE_LIMIT) {
            return false;
        }
        for (let i = 0; i < additionalCount; i++) {
            timestamps.push(now + i);
        }
        this.playbackRateMap.set(deviceId, timestamps);
        if (this.playbackRateMap.size > 1000) {
            for (const [key, ts] of this.playbackRateMap.entries()) {
                if (ts.filter(t => t > windowStart).length === 0) {
                    this.playbackRateMap.delete(key);
                }
            }
        }
        return true;
    }
    async validateDevice(deviceId) {
        try {
            const device = await this.prisma.device.findUnique({
                where: { deviceId },
                select: { status: true },
            });
            return device?.status === 'OPERATIVO';
        }
        catch {
            this.logger.error(`Error validating device ${deviceId}`);
            return false;
        }
    }
    async validateTabletKey(deviceId, tabletKey) {
        try {
            const device = await this.prisma.device.findUnique({
                where: { deviceId },
                select: { authToken: true },
            });
            if (!device?.authToken)
                return false;
            return device.authToken === tabletKey;
        }
        catch {
            return false;
        }
    }
    async validateVideo(videoId) {
        try {
            const video = await this.prisma.video.findUnique({
                where: { id: videoId },
                select: { campaignId: true },
            });
            if (!video)
                return false;
            const campaign = await this.prisma.campaign.findUnique({
                where: { id: video.campaignId },
                select: { active: true, status: true },
            });
            return campaign?.active === true && campaign?.status === 'ACTIVE';
        }
        catch {
            this.logger.error(`Error validating video ${videoId}`);
            return false;
        }
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
            const timestamp = data.clientTimestamp ? new Date(data.clientTimestamp) : new Date();
            const result = await this.prisma.$executeRawUnsafe(`INSERT INTO playback_events (id, device_id, event_type, video_id, lat, lng, timestamp, is_simulated, verified)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
                 date_trunc('minute', $6::timestamp),
                 false, $7)
         ON CONFLICT (device_id, video_id, timestamp) WHERE timestamp = date_trunc('minute', $6::timestamp)
         DO NOTHING`, data.deviceId, data.eventType, data.videoId, data.lat ?? null, data.lng ?? null, timestamp, data.verified ?? false);
            if (result === 0) {
                this.logger.warn(`⚠️ Duplicate playback rejected: device=${data.deviceId} video=${data.videoId}`);
                return { success: true, duplicate: true };
            }
            return { success: true, verified: data.verified ?? false };
        }
        catch (err) {
            this.logger.error(`Failed to record playback event for device ${data.deviceId}`, err);
            try {
                return await this.prisma.playbackEvent.create({
                    data: {
                        deviceId: data.deviceId,
                        videoId: data.videoId,
                        eventType: data.eventType,
                        lat: data.lat,
                        lng: data.lng,
                        timestamp: data.clientTimestamp ? new Date(data.clientTimestamp) : new Date(),
                        verified: data.verified ?? false,
                    },
                });
            }
            catch (fallbackErr) {
                this.logger.error(`Fallback playback insert also failed for device ${data.deviceId}`, fallbackErr);
                throw fallbackErr;
            }
        }
    }
    async recordPlaybackBatch(events) {
        const safeEvents = events.length > PLAYBACK_MAX_BATCH_SIZE
            ? events.slice(0, PLAYBACK_MAX_BATCH_SIZE)
            : events;
        if (safeEvents.length < events.length) {
            this.logger.warn(`⚠️ Playback batch truncated: ${events.length} → ${safeEvents.length} (max: ${PLAYBACK_MAX_BATCH_SIZE})`);
        }
        let processed = 0;
        let rejected = 0;
        for (let offset = 0; offset < safeEvents.length; offset += CHUNK_SIZE) {
            const chunk = safeEvents.slice(offset, offset + CHUNK_SIZE);
            const values = [];
            const params = [];
            for (let i = 0; i < chunk.length; i++) {
                const event = chunk[i];
                const base = i * 7;
                const ts = event.clientTimestamp ? new Date(event.clientTimestamp) : new Date();
                values.push(`(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, date_trunc('minute', $${base + 6}::timestamp), false, $${base + 7})`);
                params.push(event.deviceId, event.eventType, event.videoId, event.lat ?? null, event.lng ?? null, ts, true);
            }
            try {
                const insertResult = await this.prisma.$executeRawUnsafe(`INSERT INTO playback_events (id, device_id, event_type, video_id, lat, lng, timestamp, is_simulated, verified)
           VALUES ${values.join(', ')}
           ON CONFLICT (device_id, video_id, timestamp) WHERE timestamp = date_trunc('minute', $6::timestamp)
           DO NOTHING`, ...params);
                processed += chunk.length;
                rejected += chunk.length - insertResult;
            }
            catch (err) {
                this.logger.error(`Batch playback chunk failed at offset ${offset}: ${err.message}`);
                for (const event of chunk) {
                    try {
                        await this.prisma.playbackEvent.create({
                            data: {
                                deviceId: event.deviceId,
                                videoId: event.videoId,
                                eventType: event.eventType,
                                lat: event.lat,
                                lng: event.lng,
                                timestamp: event.clientTimestamp ? new Date(event.clientTimestamp) : new Date(),
                                verified: true,
                            },
                        });
                        processed++;
                    }
                    catch {
                        rejected++;
                    }
                }
            }
        }
        this.logger.log(`✅ Playback batch: ${processed} processed, ${rejected} rejected (duplicates/errors)`);
        return { processed, rejected };
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = TelemetryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelemetryService);
//# sourceMappingURL=telemetry.service.js.map