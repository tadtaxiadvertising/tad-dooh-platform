import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SRE v12.1.1 — TelemetryService
 *
 * PROTOCOLO ANTI-OOM:
 * 1. Batch size capped at MAX_BATCH_SIZE (500 points)
 * 2. Uses for-loop instead of .map() chains to avoid triple memory allocation
 * 3. Chunked inserts to prevent query string from exceeding PostgreSQL limits
 */
const MAX_BATCH_SIZE = 500;
const CHUNK_SIZE = 100; // Points per INSERT statement

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  constructor(private readonly prisma: PrismaService) {}

  async sync(data: any[]) {
    if (!data || data.length === 0) return;

    // SRE: Cap input to prevent OOM on giant payloads (512MB limit)
    const safeData = data.length > MAX_BATCH_SIZE
      ? data.slice(0, MAX_BATCH_SIZE)
      : data;

    if (safeData.length < data.length) {
      this.logger.warn(
        `⚠️ [ANTI-OOM] Telemetry batch truncated: ${data.length} → ${safeData.length} points (max: ${MAX_BATCH_SIZE})`
      );
    }

    try {
      // SRE: Process in chunks to avoid PostgreSQL parameter limit (65535) and V8 string pressure
      let totalProcessed = 0;

      for (let offset = 0; offset < safeData.length; offset += CHUNK_SIZE) {
        const chunk = safeData.slice(offset, offset + CHUNK_SIZE);

        // Build parameterized VALUES using for-loop (not .map() — avoids triple array copy)
        const values: string[] = [];
        const params: any[] = [];

        for (let i = 0; i < chunk.length; i++) {
          const item = chunk[i];
          const base = i * 5;
          values.push(
            `(gen_random_uuid(), $${base + 1}, ST_SetSRID(ST_MakePoint($${base + 2}, $${base + 3}), 4326), $${base + 4}, $${base + 5})`
          );
          params.push(
            item.driverId,
            item.lng,
            item.lat,
            item.speed ?? 0,
            item.timestamp ? new Date(item.timestamp) : new Date(),
          );
        }

        await this.prisma.$executeRawUnsafe(
          `INSERT INTO telemetry (id, driver_id, coords, speed, timestamp)
           VALUES ${values.join(', ')}
           ON CONFLICT (driver_id, timestamp) DO NOTHING`,
          ...params
        );

        totalProcessed += chunk.length;
      }

      this.logger.log(`✅ Batch sync completed: ${totalProcessed} points processed in ${Math.ceil(safeData.length / CHUNK_SIZE)} chunks.`);
    } catch (err) {
      this.logger.error(`Failed to batch sync telemetry: ${err.message}`);
    }
  }

  /**
   * REVENUE SHIELD: Registra una reproducción de video (Impacto)
   */
  async recordPlayback(data: {
    deviceId: string;
    videoId: string;
    eventType: 'START' | 'END' | 'ERROR';
    lat?: number;
    lng?: number;
  }) {
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
    } catch (err) {
      this.logger.error(`Failed to record playback event for device ${data.deviceId}`, err);
      throw err;
    }
  }
}
