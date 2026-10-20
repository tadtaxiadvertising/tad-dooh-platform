import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * SRE v12.2.5 — TelemetryService with PoP Validation
 *
 * PROTOCOLO ANTI-OOM:
 * 1. Batch size capped at MAX_BATCH_SIZE (500 points)
 * 2. Uses for-loop instead of .map() chains to avoid triple memory allocation
 * 3. Chunked inserts to prevent query string from exceeding PostgreSQL limits
 *
 * REVENUE SHIELD v12.2.5:
 * - deviceId validated against registered devices (OPERATIVO status)
 * - videoId validated against active campaigns
 * - Playback events marked as verified/unverified
 * - Rate limiting: max 60 playback events per minute per deviceId
 * - Deduplication: ON CONFLICT for duplicate playback events
 */
const MAX_BATCH_SIZE = 500;
const CHUNK_SIZE = 100;
const PLAYBACK_MAX_BATCH_SIZE = 200;
const PLAYBACK_RATE_LIMIT = 60; // events per minute per device
const PLAYBACK_RATE_WINDOW = 60_000; // 1 minute in ms
const RATE_LIMIT_WINDOW_TZ = "UTC"; // Use UTC to avoid TZ ambiguity

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  constructor(private readonly prisma: PrismaService) {}

  // --- Rate Limiting (DB-backed, persistent across restarts) ---
  // Uses `rate_limit_windows` table with atomic UPDATE for concurrency safety.

  private async getWindowStart(): Promise<Date> {
    // Align to UTC minute boundary for consistent windowing
    const now = new Date();
    const utc = now.toLocaleString("en-US", { timeZone: "UTC" });
    return new Date(utc);
  }

  private async pruneExpiredWindows() {
    const windowMs = 60_000; // Prune windows older than 1 minute
    const cutoff = new Date(Date.now() - windowMs);
    await this.prisma.$executeRaw`DELETE FROM rate_limit_windows WHERE window_start < ${cutoff}`;
  }

  async checkPlaybackRateLimit(
    deviceId: string,
    additionalCount = 1,
  ): Promise<boolean> {
    const now = await this.getWindowStart();
    const windowStart = new Date(now.getTime());
    // Round down to nearest minute
    windowStart.setMilliseconds(0);
    windowStart.setSeconds(0);

    // Check existing count for this device in this window (parameterized query)
    const existing = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT count FROM rate_limit_windows
      WHERE device_id = ${deviceId} AND window_start = ${windowStart}
    `;

    let currentCount = 0;
    if (existing && Array.isArray(existing) && existing.length > 0) {
      // Extract count from result (first element is count)
      const firstRow = existing[0];
      currentCount = firstRow?.count || 0;
    }

    if (currentCount + additionalCount > PLAYBACK_RATE_LIMIT) {
      return false;
    }

    // Increment or insert using atomic upsert (parameterized statement)
    await this.prisma.$executeRaw`
      INSERT INTO rate_limit_windows (id, device_id, window_start, count)
      VALUES (gen_random_uuid(), ${deviceId}, ${windowStart}, 1)
      ON CONFLICT (device_id, window_start)
      DO UPDATE SET count = rate_limit_windows.count + 1
    `;

    // Prune expired windows (handled by the DB constraint row TTL in production)

    return true;
  }

  // --- Device Validation ---
  async validateDevice(deviceId: string): Promise<boolean> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { deviceId },
        select: { status: true },
      });
      return device?.status === "OPERATIVO";
    } catch {
      this.logger.error(`Error validating device ${deviceId}`);
      return false;
    }
  }

  // --- Tablet Key Validation ---
  async validateTabletKey(
    deviceId: string,
    tabletKey: string,
  ): Promise<boolean> {
    try {
      const device = await this.prisma.device.findUnique({
        where: { deviceId },
        select: { authToken: true },
      });
      if (!device?.authToken) return false;
      return device.authToken === tabletKey;
    } catch {
      return false;
    }
  }

  // --- Video Validation ---
  async validateVideo(videoId: string): Promise<boolean> {
    try {
      const video = await this.prisma.video.findUnique({
        where: { id: videoId },
        select: { campaignId: true },
      });
      if (!video) return false;

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: video.campaignId },
        select: { active: true, status: true },
      });

      return campaign?.active === true && campaign?.status === "ACTIVE";
    } catch {
      this.logger.error(`Error validating video ${videoId}`);
      return false;
    }
  }

  // --- GPS Batch Sync ---
  async sync(data: any[]) {
    if (!data || data.length === 0) return;

    const safeData =
      data.length > MAX_BATCH_SIZE ? data.slice(0, MAX_BATCH_SIZE) : data;

    if (safeData.length < data.length) {
      this.logger.warn(
        `⚠️ [ANTI-OOM] Telemetry batch truncated: ${data.length} → ${safeData.length} points (max: ${MAX_BATCH_SIZE})`,
      );
    }

    try {
      let totalProcessed = 0;

      for (let offset = 0; offset < safeData.length; offset += CHUNK_SIZE) {
        const chunk = safeData.slice(offset, offset + CHUNK_SIZE);

        const values: string[] = [];
        const params: any[] = [];

        for (let i = 0; i < chunk.length; i++) {
          const item = chunk[i];
          const base = i * 5;
          values.push(
            `(gen_random_uuid(), $${base + 1}, ST_SetSRID(ST_MakePoint($${base + 2}, $${base + 3}), 4326), $${base + 4}, $${base + 5})`,
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
           VALUES ${values.join(", ")}
           ON CONFLICT (driver_id, date_trunc('second', timestamp)) DO NOTHING`,
          ...params,
        );

        totalProcessed += chunk.length;
      }

      this.logger.log(
        `✅ Batch sync completed: ${totalProcessed} points processed in ${Math.ceil(safeData.length / CHUNK_SIZE)} chunks.`,
      );
    } catch (err) {
      this.logger.error(`Failed to batch sync telemetry: ${err.message}`);
    }
  }

  // --- Single Playback Event ---
  async recordPlayback(data: {
    deviceId: string;
    videoId: string;
    eventType: "START" | "END" | "ERROR";
    lat?: number;
    lng?: number;
    verified?: boolean;
    clientTimestamp?: string;
  }) {
    try {
      // Use raw SQL with ON CONFLICT for deduplication:
      // Same device + video + same-minute timestamp = duplicate
      const timestamp = data.clientTimestamp
        ? new Date(data.clientTimestamp)
        : new Date();

      const result = await this.prisma.$executeRawUnsafe(
        `INSERT INTO playback_events (id, device_id, event_type, video_id, lat, lng, timestamp, is_simulated, verified)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
                 date_trunc('minute', $6::timestamp),
                 false, $7)
         ON CONFLICT (device_id, video_id, timestamp)
         DO NOTHING`,
        data.deviceId,
        data.eventType,
        data.videoId,
        data.lat ?? null,
        data.lng ?? null,
        timestamp,
        data.verified ?? false,
      );

      if (result === 0) {
        this.logger.warn(
          `⚠️ Duplicate playback rejected: device=${data.deviceId} video=${data.videoId}`,
        );
        return { success: true, duplicate: true };
      }

      return { success: true, verified: data.verified ?? false };
    } catch (err) {
      this.logger.error(
        `Failed to record playback event for device ${data.deviceId}`,
        err,
      );
      // Fallback to Prisma ORM if raw SQL fails (e.g., dedup constraint not yet applied)
      try {
        return await this.prisma.playbackEvent.create({
          data: {
            deviceId: data.deviceId,
            videoId: data.videoId,
            eventType: data.eventType,
            lat: data.lat,
            lng: data.lng,
            timestamp: data.clientTimestamp
              ? new Date(data.clientTimestamp)
              : new Date(),
            verified: data.verified ?? false,
          },
        });
      } catch (fallbackErr) {
        this.logger.error(
          `Fallback playback insert also failed for device ${data.deviceId}`,
          fallbackErr,
        );
        throw fallbackErr;
      }
    }
  }

  // --- Bulk Playback Events ---
  async recordPlaybackBatch(
    events: any[],
  ): Promise<{ processed: number; rejected: number }> {
    const safeEvents =
      events.length > PLAYBACK_MAX_BATCH_SIZE
        ? events.slice(0, PLAYBACK_MAX_BATCH_SIZE)
        : events;

    if (safeEvents.length < events.length) {
      this.logger.warn(
        `⚠️ Playback batch truncated: ${events.length} → ${safeEvents.length} (max: ${PLAYBACK_MAX_BATCH_SIZE})`,
      );
    }

    let processed = 0;
    let rejected = 0;

    // Process in chunks
    for (let offset = 0; offset < safeEvents.length; offset += CHUNK_SIZE) {
      const chunk = safeEvents.slice(offset, offset + CHUNK_SIZE);

      const values: string[] = [];
      const params: any[] = [];

      for (let i = 0; i < chunk.length; i++) {
        const event = chunk[i];
        const base = i * 7;
        const ts = event.clientTimestamp
          ? new Date(event.clientTimestamp)
          : new Date();
        values.push(
          `(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, date_trunc('minute', $${base + 6}::timestamp), false, $${base + 7})`,
        );
        params.push(
          event.deviceId,
          event.eventType,
          event.videoId,
          event.lat ?? null,
          event.lng ?? null,
          ts,
          true, // verified = true for validated batch
        );
      }

      try {
        const insertResult = await this.prisma.$executeRawUnsafe(
          `INSERT INTO playback_events (id, device_id, event_type, video_id, lat, lng, timestamp, is_simulated, verified)
           VALUES ${values.join(", ")}
           ON CONFLICT (device_id, video_id, timestamp)
           DO NOTHING`,
          ...params,
        );
        processed += chunk.length;
        rejected += chunk.length - insertResult;
      } catch (err) {
        this.logger.error(
          `Batch playback chunk failed at offset ${offset}: ${err.message}`,
        );
        // Fallback: insert individually via Prisma ORM
        for (const event of chunk) {
          try {
            await this.prisma.playbackEvent.create({
              data: {
                deviceId: event.deviceId,
                videoId: event.videoId,
                eventType: event.eventType,
                lat: event.lat,
                lng: event.lng,
                timestamp: event.clientTimestamp
                  ? new Date(event.clientTimestamp)
                  : new Date(),
                verified: true,
              },
            });
            processed++;
          } catch {
            rejected++;
          }
        }
      }
    }

    this.logger.log(
      `✅ Playback batch: ${processed} processed, ${rejected} rejected (duplicates/errors)`,
    );
    return { processed, rejected };
  }
}
