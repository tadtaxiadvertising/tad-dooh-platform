import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { TelemetryService } from "./telemetry.service";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("telemetry")
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /telemetry/sync — Ingesta masiva de telemetría GPS.
   *
   * B9 PATCH (v12.1.3): endurecimiento mínimo.
   * Antes: @Public() sin validación → cualquiera podía inyectar filas en
   * `telemetry` para cualquier driverId. Ahora valida:
   *   1. Payload no vacío.
   *   2. Primer `driverId` presente.
   *   3. Driver existe (1 query pre-flight, O(1) por el index del PK).
   *
   * El tamaño del batch ya está capeado aguas abajo por `MAX_BATCH_SIZE`
   * en `TelemetryService.sync()` → no se duplica aquí deliberadamente.
   *
   * NOTA: Este endpoint NO es la ruta oficial de la PWA (la oficial va por
   * PostgREST RPC `bulk_insert_telemetry`, ver regla #4). Se conserva público
   * (no requiere JWT) para mantener compatibilidad con gateways legados.
   */
  @Post("sync")
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
  ) {
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new BadRequestException("EMPTY_PAYLOAD");
    }

    // Pre-flight: validar que el primer driverId existe (asumimos batch homogéneo).
    // El servicio ya capa `MAX_BATCH_SIZE` arriba, no duplicamos la verificación.
    const headDriverId = payload[0]?.driverId;
    if (!headDriverId) {
      throw new BadRequestException("MISSING_DRIVER_ID");
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: headDriverId },
      select: { id: true },
    });
    if (!driver) {
      throw new BadRequestException("DRIVER_NOT_FOUND");
    }

    this.telemetryService
      .sync(payload)
      .catch((err) =>
        this.logger.error(`Telemetry sync error: ${err.message}`),
      );
    return { success: true };
  }

  /**
   * REVENUE SHIELD v12.2.5: Playback endpoint with deviceId + timestamp validation.
   * - Validates deviceId against registered devices (must be OPERATIVO)
   * - Validates videoId against active campaigns
   * - Rate-limited per deviceId (60 events/min max)
   * - Optional X-Tablet-Key header for shared-secret verification
   */
  @Public()
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
    @Headers("x-tablet-key") tabletKey?: string,
  ) {
    // Rate limiting: check per-deviceId burst
    const rateLimitOk = this.telemetryService.checkPlaybackRateLimit(
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

    // Optional: validate X-Tablet-Key if configured
    if (tabletKey) {
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
    if (ts < fiveMinAgo || ts > oneMinFuture) {
      this.logger.warn(
        `⚠️ Timestamp out of window for deviceId=${payload.deviceId}: ${ts.toISOString()}`,
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
   */
  @Public()
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
    @Headers("x-tablet-key") tabletKey?: string,
  ) {
    if (!payload || payload.length === 0) {
      return { success: false, reason: "EMPTY_PAYLOAD" };
    }

    // Validate deviceId for the batch (all events assumed from same device)
    const deviceId = payload[0]?.deviceId;
    if (!deviceId) {
      return { success: false, reason: "MISSING_DEVICE_ID" };
    }

    const deviceValid = await this.telemetryService.validateDevice(deviceId);
    if (!deviceValid) {
      return {
        success: false,
        reason: "DEVICE_INVALID",
        message: "Device not registered or not OPERATIVO",
      };
    }

    const videoIds = [...new Set(payload.map((e) => e.videoId))];
    for (const videoId of videoIds) {
      const videoValid = await this.telemetryService.validateVideo(videoId);
      if (!videoValid) {
        this.logger.warn(`⚠️ Invalid videoId=${videoId} in batch`);
      }
    }

    // Rate limit check for the batch
    const rateLimitOk = this.telemetryService.checkPlaybackRateLimit(
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

    const result = await this.telemetryService.recordPlaybackBatch(payload);
    return {
      success: true,
      processed: result.processed,
      rejected: result.rejected,
    };
  }
}
