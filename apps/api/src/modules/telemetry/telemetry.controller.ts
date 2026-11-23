import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
  BadRequestException,
  ForbiddenException,
  Req,
} from "@nestjs/common";
import {
  TelemetryService,
  TELEMETRY_GPS_BATCH_LIMIT,
  PLAYBACK_MAX_BATCH_SIZE,
} from "./telemetry.service";

import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.types";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Controller("telemetry")
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /telemetry/sync — Legacy JWT-protected GPS batch ingestion.
   *
   * This route is NOT @Public; the global SupabaseAuthGuard requires a user
   * session. It is not the official driver PWA upload path (PostgREST RPC).
   *
   * Bounded, homogeneous batches are committed atomically and acknowledged
   * only after PostgreSQL confirms the transaction. The first driver must
   * exist. ADMIN may upload for an existing driver; DRIVER may upload only
   * their own GPS points using the verified session entityId. Neither user
   * roles nor the driver identity are trusted from the request body.
   */
  @Post("sync")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @HttpCode(HttpStatus.CREATED)
  async sync(
    @Body()
    payload: {
      driverId: string;
      lat: number;
      lng: number;
      speed: number;
      timestamp?: string;
    }[],
    @Req() req: { user?: AuthUser },
  ) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new BadRequestException("EMPTY_PAYLOAD");
    }

    // Acknowledging an oversized batch while silently dropping its tail
    // destroys offline GPS data. Require the client to keep/split the batch.
    if (payload.length > TELEMETRY_GPS_BATCH_LIMIT) {
      throw new BadRequestException("TELEMETRY_BATCH_TOO_LARGE");
    }

    const headDriverId = payload[0]?.driverId;
    if (!headDriverId) {
      throw new BadRequestException("MISSING_DRIVER_ID");
    }
    // This route is JWT-protected by the global auth guard, but a caller
    // must not smuggle another driver's GPS points behind the first ID.
    if (payload.some((point) => !point || point.driverId !== headDriverId)) {
      throw new BadRequestException("DRIVER_MISMATCH");
    }

    const actor = req?.user;
    if (
      !actor ||
      (actor.role !== UserRole.ADMIN && actor.role !== UserRole.DRIVER) ||
      (actor.role === UserRole.DRIVER &&
        (!actor.entityId || actor.entityId !== headDriverId))
    ) {
      throw new ForbiddenException("TELEMETRY_DRIVER_FORBIDDEN");
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: headDriverId },
      select: { id: true },
    });
    if (!driver) {
      throw new BadRequestException("DRIVER_NOT_FOUND");
    }

    // The DB transaction must commit before a success receipt is returned.
    // A rejected transaction propagates to Nest's failure response.
    await this.telemetryService.sync(payload);
    return { success: true };
  }

  /**
   * REVENUE SHIELD v12.2.5: Playback endpoint with deviceId + timestamp validation.
   * - Validates deviceId against registered devices (must be OPERATIVO)
   * - Validates videoId against active campaigns
   * - Rate-limited per deviceId (60 events/min max)
   * - REQUIRES X-Tablet-Key header for shared-secret verification
   */
  @Post("playback")
  @HttpCode(HttpStatus.CREATED)
  async recordPlayback(
    @Body()
    payload: {
      deviceId: string;
      videoId: string;
      eventType: "START" | "END" | "ERROR";
      lat?: number;
      lng?: number;
      clientTimestamp?: string;
    },
    @Headers("x-tablet-key") tabletKey: string,
  ) {
    // TypeScript payload types are erased for HTTP JSON. A forged
    // "play_confirm" must never be persisted with verified=true.
    if (!payload || !["START", "END", "ERROR"].includes(payload.eventType)) {
      return { success: false, reason: "EVENT_TYPE_INVALID" };
    }

    // X-Tablet-Key is REQUIRED for playback events
    if (!tabletKey) {
      this.logger.warn(
        `⚠️ Playback rejected: missing X-Tablet-Key for deviceId=${payload.deviceId}`,
      );
      return {
        success: false,
        reason: "TABLET_KEY_MISSING",
        message: "X-Tablet-Key header is required for playback events",
      };
    }

    // Rate limiting: check per-deviceId burst
    const rateLimitOk = await this.telemetryService.checkPlaybackRateLimit(
      payload.deviceId,
    );
    if (!rateLimitOk) {
      this.logger.warn(
        `⚠️ Rate limit exceeded for deviceId=${payload.deviceId}`,
      );
      return {
        success: false,
        reason: "RATE_LIMITED",
        message: "Max 60 playback events per minute per device",
      };
    }

    // Validate deviceId exists and is OPERATIVO
    const deviceValid = await this.telemetryService.validateDevice(
      payload.deviceId,
    );
    if (!deviceValid) {
      this.logger.warn(`⚠️ Invalid or inactive deviceId=${payload.deviceId}`);
      return {
        success: false,
        reason: "DEVICE_INVALID",
        message: "Device not registered or not OPERATIVO",
      };
    }

    // Validate X-Tablet-Key matches registered device
    const keyValid = await this.telemetryService.validateTabletKey(
      payload.deviceId,
      tabletKey,
    );
    if (!keyValid) {
      this.logger.warn(
        `⚠️ Invalid tablet key for deviceId=${payload.deviceId}`,
      );
      return {
        success: false,
        reason: "TABLET_KEY_INVALID",
        message: "X-Tablet-Key does not match registered device",
      };
    }

    // Validate videoId belongs to an active campaign
    const videoValid = await this.telemetryService.validateVideo(
      payload.videoId,
    );
    if (!videoValid) {
      this.logger.warn(
        `⚠️ Invalid videoId=${payload.videoId} (no active campaign)`,
      );
      return {
        success: false,
        reason: "VIDEO_INVALID",
        message: "Video not found or campaign not active",
      };
    }

    // Timestamp validation: reject events older than 5 minutes or more than 1 minute in the future
    const ts = payload.clientTimestamp
      ? new Date(payload.clientTimestamp)
      : new Date();
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneMinFuture = new Date(now.getTime() + 60 * 1000);
    if (
      !Number.isFinite(ts.getTime()) ||
      ts < fiveMinAgo ||
      ts > oneMinFuture
    ) {
      this.logger.warn(
        `⚠️ Timestamp out of window for deviceId=${payload.deviceId}: ${Number.isFinite(ts.getTime()) ? ts.toISOString() : "INVALID_DATE"}`,
      );
      return {
        success: false,
        reason: "TIMESTAMP_INVALID",
        message: "Event timestamp outside 5-minute acceptance window",
      };
    }

    return this.telemetryService.recordPlayback({
      ...payload,
      verified: true,
      clientTimestamp: payload.clientTimestamp,
    });
  }

  /**
   * Bulk playback endpoint for batch submissions from tablets.
   * REQUIRES X-Tablet-Key header for shared-secret verification.
   * Validates each event in the batch.
   */
  @Post("playback-batch")
  @HttpCode(HttpStatus.CREATED)
  async recordPlaybackBatch(
    @Body()
    payload: {
      deviceId: string;
      videoId: string;
      eventType: "START" | "END" | "ERROR";
      lat?: number;
      lng?: number;
      clientTimestamp?: string;
    }[],
    @Headers("x-tablet-key") tabletKey: string,
  ) {
    if (!Array.isArray(payload) || payload.length === 0) {
      return { success: false, reason: "EMPTY_PAYLOAD" };
    }

    // Never let a direct caller trigger partial batch persistence.
    if (payload.length > PLAYBACK_MAX_BATCH_SIZE) {
      throw new BadRequestException("PLAYBACK_BATCH_TOO_LARGE");
    }

    // X-Tablet-Key is REQUIRED for playback-batch events
    if (!tabletKey) {
      this.logger.warn(`⚠️ Playback-batch rejected: missing X-Tablet-Key`);
      return {
        success: false,
        reason: "TABLET_KEY_MISSING",
        message: "X-Tablet-Key header is required for playback-batch events",
      };
    }

    // Validate deviceId for the batch (all events assumed from same device)
    const deviceId = payload[0]?.deviceId;
    if (!deviceId) {
      return { success: false, reason: "MISSING_DEVICE_ID" };
    }

    // A tablet key is scoped to ONE device. An attacker with a valid key
    // must not submit verified PoP for another device inside the same batch.
    // Validate all events BEFORE rate limit, DB checks or any writes.
    if (payload.some((event) => !event || event.deviceId !== deviceId)) {
      return { success: false, reason: "DEVICE_MISMATCH" };
    }
    if (
      payload.some(
        (event) => !["START", "END", "ERROR"].includes(event.eventType),
      )
    ) {
      return { success: false, reason: "EVENT_TYPE_INVALID" };
    }

    const deviceValid = await this.telemetryService.validateDevice(deviceId);
    if (!deviceValid) {
      return {
        success: false,
        reason: "DEVICE_INVALID",
        message: "Device not registered or not OPERATIVO",
      };
    }

    // Validate X-Tablet-Key matches registered device
    const keyValid = await this.telemetryService.validateTabletKey(
      deviceId,
      tabletKey,
    );
    if (!keyValid) {
      this.logger.warn(`⚠️ Invalid tablet key for deviceId=${deviceId}`);
      return {
        success: false,
        reason: "TABLET_KEY_INVALID",
        message: "X-Tablet-Key does not match registered device",
      };
    }

    const videoIds = [...new Set(payload.map((e) => e.videoId))];
    for (const videoId of videoIds) {
      const videoValid = await this.telemetryService.validateVideo(videoId);
      if (!videoValid) {
        this.logger.warn(`⚠️ Invalid videoId=${videoId} in batch`);
        return {
          success: false,
          reason: "VIDEO_INVALID",
          message: `Video ${videoId} not found or campaign not active`,
        };
      }
    }

    // Rate limit check for the batch
    const rateLimitOk = await this.telemetryService.checkPlaybackRateLimit(
      deviceId,
      payload.length,
    );
    if (!rateLimitOk) {
      return {
        success: false,
        reason: "RATE_LIMITED",
        message: "Max 60 playback events per minute per device",
      };
    }

    // Validate timestamps for each event in batch
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneMinFuture = new Date(now.getTime() + 60 * 1000);
    for (const event of payload) {
      const ts = event.clientTimestamp
        ? new Date(event.clientTimestamp)
        : new Date();
      if (
        !Number.isFinite(ts.getTime()) ||
        ts < fiveMinAgo ||
        ts > oneMinFuture
      ) {
        this.logger.warn(
          `⚠️ Timestamp out of window for deviceId=${deviceId}: ${Number.isFinite(ts.getTime()) ? ts.toISOString() : "INVALID_DATE"}`,
        );
        return {
          success: false,
          reason: "TIMESTAMP_INVALID",
          message: "Event timestamp outside 5-minute acceptance window",
        };
      }
    }

    const result = await this.telemetryService.recordPlaybackBatch(payload);
    return {
      success: true,
      processed: result.processed,
      rejected: result.rejected,
    };
  }
}
