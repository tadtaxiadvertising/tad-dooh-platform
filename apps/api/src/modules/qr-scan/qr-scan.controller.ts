import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  BadRequestException,
  ForbiddenException,
  Req,
  UseInterceptors,
  Logger,
} from "@nestjs/common";
import { QrScanService } from "./qr-scan.service";
import type { RecordQrScanInput } from "./qr-scan.service";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import type { AuthUser } from "../auth/auth.types";

@Controller("qr-scans")
export class QrScanController {
  private readonly logger = new Logger(QrScanController.name);

  constructor(private readonly qrScanService: QrScanService) {}

  /**
   * POST /api/qr-scans — Registrar escaneo de QR
   * Público (tablets, móviles) — no requiere auth
   * Body: { qrCode, referrerCode?, ipAddress?, userAgent?, deviceId?, driverId? }
   * Idempotente por Idempotency-Key + deduplicación IP+QR 24h
   */
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async recordScan(@Body() body: RecordQrScanInput) {
    if (!body.qrCode) {
      throw new BadRequestException("qrCode es requerido");
    }

    const result = await this.qrScanService.recordScan(body);
    return { success: true, ...result };
  }

  /**
   * PUT /api/qr-scans/:id/convert — Marcar escaneo como convertido
   * Solo ADMIN/WEBHOOK
   */
  @Put(":id/convert")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async markConverted(
    @Param("id") id: string,
    @Body() body: { leadId: string },
  ) {
    if (!body.leadId) {
      throw new BadRequestException("leadId es requerido");
    }

    const scan = await this.qrScanService.markConverted(id, body.leadId);
    return { success: true, scan };
  }

  /**
   * GET /api/qr-scans/stats/:qrCode — Estadísticas de un QR
   */
  @Get("stats/:qrCode")
  @Roles(UserRole.ADMIN)
  async getStats(
    @Param("qrCode") qrCode: string,
    @Query("days") days?: string,
  ) {
    const d = days ? parseInt(days, 10) : 30;
    if (isNaN(d) || d < 1 || d > 365) {
      throw new BadRequestException("days debe ser entre 1 y 365");
    }

    const stats = await this.qrScanService.getStatsByQrCode(qrCode, d);
    return { success: true, stats };
  }

  /**
   * GET /api/qr-scans/referral/:referrerCode — Estadísticas de referidos
   */
  @Get("referral/:referrerCode")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  async getReferralStats(
    @Param("referrerCode") referrerCode: string,
    @Query("days") days: string | undefined,
    @Req() req: { user?: AuthUser },
  ) {
    const d = days ? parseInt(days, 10) : 30;
    if (isNaN(d) || d < 1 || d > 365) {
      throw new BadRequestException("days debe ser entre 1 y 365");
    }

    // The route contains a referral code, not a driver ID, so TenantGuard
    // cannot bind it to req.user.entityId. Check DB ownership before querying
    // referral conversions; a caller-supplied code is not authorization.
    const user = req?.user;
    let stats;
    if (user?.role === UserRole.ADMIN) {
      stats = await this.qrScanService.getReferralStats(referrerCode, d);
    } else if (
      user?.role === UserRole.DRIVER &&
      typeof user.entityId === "string" &&
      user.entityId.trim()
    ) {
      stats = await this.qrScanService.getDriverReferralStats(
        referrerCode,
        user.entityId,
        d,
      );
    } else {
      throw new ForbiddenException("No tienes acceso a estas estadísticas.");
    }
    return { success: true, stats };
  }
}
