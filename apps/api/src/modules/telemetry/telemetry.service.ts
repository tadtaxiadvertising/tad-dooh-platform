import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * SRE v12.2.5 — TelemetryService with PoP Validation
 *
 * PROTOCOLO ANTI-OOM:
 * 1. GPS batches above TELEMETRY_GPS_BATCH_LIMIT (500) rejected before persistence
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
export const TELEMETRY_GPS_BATCH_LIMIT = 500;
const CHUNK_SIZE = 100;
export const PLAYBACK_MAX_BATCH_SIZE = 200;
const PLAYBACK_RATE_LIMIT = 60; // events per minute per device

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
    await this.prisma
      .$executeRaw`DELETE FROM rate_limit_windows WHERE window_start < ${cutoff}`;
  }

  async checkPlaybackRateLimit(
    deviceId: string,
    additionalCount = 1,
  ): Promise<boolean> {
    // A batch is charged by its event count, not by one request. Reject
    // invalid/oversized values before touching the database.
    if (
      !Number.isSafeInteger(additionalCount) ||
      additionalCount < 1 ||
      additionalCount > PLAYBACK_RATE_LIMIT
    ) {
      return false;
    }

    const now = await this.getWindowStart();
    const windowStart = new Date(now.getTime());
    windowStart.setMilliseconds(0);
    windowStart.setSeconds(0);

    // One atomic PostgreSQL UPSERT is needed: a SELECT then UPDATE permits
    // concurrent calls to both pass the limit. The conflict predicate is
    // evaluated under the row lock and returns no row if quota is exhausted.
    const accepted = await this.prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO rate_limit_windows (id, device_id, window_start, count)
      VALUES (gen_random_uuid(), ${deviceId}, ${windowStart}, ${additionalCount})
      ON CONFLICT (device_id, window_start)
      DO UPDATE SET count = rate_limit_windows.count + EXCLUDED.count
      WHERE rate_limit_windows.count + EXCLUDED.count <= ${PLAYBACK_RATE_LIMIT}
      RETURNING count
    `;

    return accepted.length === 1;
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
  async sync(
    data: Array<{
      driverId: string;
      lng: number;
      lat: number;
      speed?: number;
      timestamp?: string | number | Date;
    }>,
  ): Promise<void> {
    if (!data || data.length === 0) return;
    if (data.length > TELEMETRY_GPS_BATCH_LIMIT) {
      // Never truncate offline telemetry while reporting success.
      // The caller must split the retained queue into smaller batches.
      throw new Error("TELEMETRY_BATCH_TOO_LARGE");
    }

    try {
      // A later chunk can fail after earlier inserts. Keep the entire upload
      // atomic so the client can safely retry without a partial success.
      await this.prisma.$transaction(async (tx) => {
        for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
          const chunk = data.slice(offset, offset + CHUNK_SIZE);
          const values: string[] = [];
          const params: Array<string | number | Date> = [];

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

          await tx.$executeRawUnsafe(
            `INSERT INTO telemetry (id, driver_id_text_217, coords, speed, timestamp)
             VALUES ${values.join(", ")}
             ON CONFLICT (driver_id_text_217, date_trunc('second', timestamp)) DO NOTHING`,
            ...params,
          );
        }
      });

      this.logger.log(
        `✅ Batch sync completed: ${data.length} points committed in ${Math.ceil(data.length / CHUNK_SIZE)} chunks.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to batch sync telemetry: ${message}`);
      throw err; // Must not return 201/"success" after an unknown DB outcome.
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
    // The fallback catch block must use the same trusted normalization.
    const eventType =
      data.eventType === "END" ? "play_confirm" : data.eventType;
    try {
      // Use raw SQL with ON CONFLICT for deduplication:
      // Same device + video + same-minute timestamp = duplicate
      const timestamp = data.clientTimestamp
        ? new Date(data.clientTimestamp)
        : new Date();
      // Persist authenticated playback completion in the canonical form
      // queried by finance, verified metrics and advertiser reports.
      const result = await this.prisma.$executeRawUnsafe(
        `INSERT INTO playback_events (id, device_id, event_type, video_id, lat, lng, timestamp, is_simulated, verified)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
                 date_trunc('minute', $6::timestamp),
                 false, $7)
         ON CONFLICT (device_id, video_id, timestamp)
         DO UPDATE SET
           event_type = EXCLUDED.event_type,
           verified = EXCLUDED.verified
         WHERE EXCLUDED.event_type = 'play_confirm'
           AND (playback_events.event_type <> 'play_confirm'
             OR playback_events.verified = false)`,
        data.deviceId,
        eventType,
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
            eventType,
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
    events: Array<Parameters<TelemetryService["recordPlayback"]>[0]>,
  ): Promise<{ processed: number; rejected: number }> {
    // A partially persisted batch must never receive a success-shaped ACK.
    // Reject before any database call; callers can split and retry safely.
    if (!Array.isArray(events) || events.length === 0) {
      throw new BadRequestException("EMPTY_PAYLOAD");
    }
    if (events.length > PLAYBACK_MAX_BATCH_SIZE) {
      throw new BadRequestException("PLAYBACK_BATCH_TOO_LARGE");
    }

    let processed = 0;
    let rejected = 0;

    // Process in chunks
    for (let offset = 0; offset < events.length; offset += CHUNK_SIZE) {
      const chunk = events.slice(offset, offset + CHUNK_SIZE);

      // PostgreSQL cannot update the same unique key twice within one
      // INSERT ... ON CONFLICT statement. Collapse START + END in the same
      // minute, giving authenticated END (the billable completion) priority.
      // All original events are acknowledged when their canonical minute
      // slot is handled or is already present (idempotent retry).
      const canonical = new Map<
        string,
        { event: (typeof chunk)[number]; timestamp: Date; eventType: string }
      >();
      for (const event of chunk) {
        const timestamp = event.clientTimestamp
          ? new Date(event.clientTimestamp)
          : new Date();
        const eventType =
          event.eventType === "END" ? "play_confirm" : event.eventType;
        const minuteKey = JSON.stringify([
          event.deviceId,
          event.videoId,
          Math.floor(timestamp.getTime() / 60_000),
        ]);
        const previous = canonical.get(minuteKey);
        if (
          !previous ||
          (eventType === "play_confirm" &&
            previous.eventType !== "play_confirm")
        ) {
          canonical.set(minuteKey, { event, timestamp, eventType });
        }
      }

      const values: string[] = [];
      const params: Array<string | number | Date | boolean | null> = [];
      for (const { event, timestamp, eventType } of canonical.values()) {
        const base = params.length;
        values.push(
          `(gen_random_uuid(), $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, date_trunc('minute', $${base + 6}::timestamp), false, $${base + 7})`,
        );
        params.push(
          event.deviceId,
          eventType,
          event.videoId,
          event.lat ?? null,
          event.lng ?? null,
          timestamp,
          true, // END is only canonicalized after the controller validates the tablet key.
        );
      }

      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO playback_events (id, device_id, event_type, video_id, lat, lng, timestamp, is_simulated, verified)
           VALUES ${values.join(", ")}
           ON CONFLICT (device_id, video_id, timestamp)
           DO UPDATE SET
             event_type = EXCLUDED.event_type,
             verified = EXCLUDED.verified
           WHERE EXCLUDED.event_type = 'play_confirm'
             AND (playback_events.event_type <> 'play_confirm'
               OR playback_events.verified = false)`,
          ...params,
        );
        // A successful statement handled every unique slot, including
        // already-recorded duplicates. Do not leave legitimate offline
        // retries stuck just because no new row was inserted.
        processed += chunk.length;
      } catch (err) {
        this.logger.error(
          `Batch playback chunk failed at offset ${offset}: ${err.message}`,
        );
        // Fallback: insert individually via Prisma ORM
        for (const { event, timestamp, eventType } of canonical.values()) {
          try {
            await this.prisma.playbackEvent.create({
              data: {
                deviceId: event.deviceId,
                videoId: event.videoId,
                eventType,
                lat: event.lat,
                lng: event.lng,
                timestamp,
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
