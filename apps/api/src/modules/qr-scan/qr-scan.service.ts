import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface RecordQrScanInput {
  qrCode: string;
  referrerCode?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  driverId?: string;
}

export interface QrScanResult {
  scan: import("@prisma/client").QrScan;
  isDuplicate: boolean;
  converted: boolean;
}

@Injectable()
export class QrScanService {
  private readonly logger = new Logger(QrScanService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un escaneo de QR con deduplicación por IP+QR en ventana de 24h.
   * Si ya existe un escaneo similar reciente, no crea duplicado.
   */
  async recordScan(input: RecordQrScanInput): Promise<QrScanResult> {
    this.logger.log(
      `[QR_SCAN] Recording scan: ${input.qrCode} from ${input.ipAddress}`,
    );

    // Ventana de deduplicación: 24 horas
    const dedupeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Buscar escaneo duplicado reciente (mismo QR + misma IP)
    const existing = await this.prisma.qrScan.findFirst({
      where: {
        qrCode: input.qrCode,
        ipAddress: input.ipAddress || undefined,
        scannedAt: { gte: dedupeWindow },
      },
      orderBy: { scannedAt: "desc" },
    });

    if (existing) {
      this.logger.log(
        `[QR_SCAN] Duplicate scan detected for ${input.qrCode} from ${input.ipAddress}, returning existing`,
      );
      return {
        scan: existing,
        isDuplicate: true,
        converted: existing.converted,
      };
    }

    // Crear nuevo escaneo
    const scan = await this.prisma.qrScan.create({
      data: {
        qrCode: input.qrCode,
        referrerCode: input.referrerCode,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        deviceId: input.deviceId,
        driverId: input.driverId,
        converted: false,
      },
    });

    this.logger.log(
      `[QR_SCAN] Created new scan ${scan.id} for ${input.qrCode}`,
    );
    return { scan, isDuplicate: false, converted: false };
  }

  /**
   * Marca un escaneo como convertido (generó lead/conversión).
   * Idempotente: si ya está convertido, no hace nada.
   */
  async markConverted(scanId: string, leadId: string) {
    const scan = await this.prisma.qrScan.findUnique({ where: { id: scanId } });
    if (!scan) {
      throw new Error(`QR Scan ${scanId} not found`);
    }

    if (scan.converted) {
      this.logger.log(`[QR_SCAN] Scan ${scanId} already converted, skipping`);
      return scan;
    }

    return this.prisma.qrScan.update({
      where: { id: scanId },
      data: { converted: true, leadId },
    });
  }

  /**
   * Obtiene estadísticas de escaneos por código QR.
   */
  async getStatsByQrCode(qrCode: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [total, uniqueIPs, converted] = await Promise.all([
      this.prisma.qrScan.count({
        where: { qrCode, scannedAt: { gte: since } },
      }),
      this.prisma.qrScan.groupBy({
        by: ["ipAddress"],
        where: { qrCode, scannedAt: { gte: since } },
        _count: { id: true },
      }),
      this.prisma.qrScan.count({
        where: { qrCode, converted: true, scannedAt: { gte: since } },
      }),
    ]);

    return {
      qrCode,
      periodDays: days,
      totalScans: total,
      uniqueVisitors: uniqueIPs.length,
      conversions: converted,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
    };
  }

  /**
   * Driver-only referral metrics. Resolve ownership against the trusted
   * Driver.referralCode, never a client-supplied driver ID or scan.driverId.
   * A missing driver/code and another driver's code have the same 403 result.
   */
  async getDriverReferralStats(
    referrerCode: string,
    driverId: string,
    days: number = 30,
  ) {
    if (!referrerCode?.trim() || !driverId?.trim()) {
      throw new ForbiddenException("No tienes acceso a estas estadísticas.");
    }

    const owner = await this.prisma.driver.findFirst({
      where: { id: driverId, referralCode: referrerCode },
      select: { id: true },
    });
    if (!owner) {
      throw new ForbiddenException("No tienes acceso a estas estadísticas.");
    }
    return this.getReferralStats(referrerCode, days);
  }

  /**
   * Obtiene estadísticas de referidos por código de referente.
   */
  async getReferralStats(referrerCode: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scans = await this.prisma.qrScan.findMany({
      where: { referrerCode, scannedAt: { gte: since } },
      select: { id: true, converted: true, leadId: true, driverId: true },
    });

    const total = scans.length;
    const converted = scans.filter((s) => s.converted).length;
    const uniqueDrivers = new Set(scans.map((s) => s.driverId).filter(Boolean))
      .size;

    return {
      referrerCode,
      periodDays: days,
      totalScans: total,
      conversions: converted,
      uniqueDrivers,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
    };
  }
}
