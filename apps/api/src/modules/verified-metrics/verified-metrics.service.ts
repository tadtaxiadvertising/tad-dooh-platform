import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "../auth/decorators/roles.decorator";

export type CampaignMetricsAccess =
  | { role: UserRole.ADMIN }
  | { role: UserRole.ADVERTISER; advertiserId: string };

export interface VerifiedPlaybackStats {
  campaignId: string;
  campaignName: string;
  mediaAssetId: string;
  mediaAssetFilename: string;
  verifiedPlays: number;
  estimatedPlays: number;
  uniqueDevices: number;
  dateFrom: Date;
  dateTo: Date;
}

export interface DriverPlaybackStats {
  driverId: string;
  driverName: string;
  taxiNumber: string;
  totalVerifiedPlays: number;
  campaignsPlayed: number;
  uniqueDates: number;
  dateFrom: Date;
  dateTo: Date;
}

export interface CampaignVerifiedReport {
  campaignId: string;
  campaignName: string;
  status: string;
  totalVerifiedPlays: number;
  totalEstimatedPlays: number;
  verificationRate: number; // verified/estimated * 100
  byMediaAsset: Array<{
    mediaAssetId: string;
    filename: string;
    verifiedPlays: number;
    estimatedPlays: number;
  }>;
  byDevice: Array<{
    deviceId: string;
    taxiNumber: string;
    driverId: string;
    driverName: string;
    verifiedPlays: number;
  }>;
  dateFrom: Date;
  dateTo: Date;
}

@Injectable()
export class VerifiedMetricsService {
  private readonly logger = new Logger(VerifiedMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene reproducciones VERIFICADAS (play_confirm + verified=true) por campaña.
   * Separa claramente de las estimaciones basadas en campañas activas.
   */
  async getCampaignVerifiedStats(
    campaignId: string,
    dateFrom: Date,
    dateTo: Date,
    access: CampaignMetricsAccess,
  ): Promise<CampaignVerifiedReport> {
    const advertiserId =
      access?.role === UserRole.ADVERTISER
        ? access.advertiserId?.trim()
        : undefined;
    if (
      access?.role !== UserRole.ADMIN &&
      (access?.role !== UserRole.ADVERTISER || !advertiserId)
    ) {
      throw new ForbiddenException("CAMPAIGN_METRICS_ACCESS_DENIED");
    }

    this.logger.log(
      `[VERIFIED_METRICS] Campaign ${campaignId} verified stats ${dateFrom.toISOString()} - ${dateTo.toISOString()}`,
    );

    const campaign = await this.prisma.campaign.findUnique({
      // Enforce ownership in the same DB query (no check/read race).
      where: advertiserId
        ? { id: campaignId, advertiserId }
        : { id: campaignId },
      include: {
        mediaAssets: true,
        devices: {
          include: {
            device: {
              include: {
                driver: {
                  select: { id: true, fullName: true, taxiNumber: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign || (advertiserId && campaign.advertiserId !== advertiserId)) {
      // Unknown and other-tenant campaign must produce the same response.
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Reproducciones VERIFICADAS (play_confirm + verified=true)
    const mediaAssetIds = campaign.mediaAssets.map((m) => m.id);
    const verifiedEvents = await this.prisma.playbackEvent.findMany({
      where: {
        videoId: { in: mediaAssetIds },
        eventType: "play_confirm",
        verified: true,
        timestamp: { gte: dateFrom, lte: dateTo },
      },
      select: {
        videoId: true,
        deviceId: true,
        timestamp: true,
      },
    });

    // Reproducciones ESTIMADAS (basadas en dispositivos asignados y días activos)
    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const estimatedPerDevicePerDay = 120; // 24h * 60min / 30s slot = 2880, pero real ~120 por operación
    const deviceCount = campaign.devices.length;
    const estimatedTotal =
      deviceCount * daysInPeriod * estimatedPerDevicePerDay;

    // Agrupar por media asset
    const byMediaAsset = campaign.mediaAssets.map((m) => {
      const verified = verifiedEvents.filter((e) => e.videoId === m.id).length;
      const estimated =
        deviceCount *
        daysInPeriod *
        (m.weight || 1) *
        (estimatedPerDevicePerDay / campaign.mediaAssets.length);
      return {
        mediaAssetId: m.id,
        filename: m.filename,
        verifiedPlays: verified,
        estimatedPlays: Math.round(estimated),
      };
    });

    // Agrupar por dispositivo
    const byDevice = campaign.devices.map((dc) => {
      const d = dc.device;
      // Event deviceId is the hardware identifier, not the Device.id UUID.
      const verified = verifiedEvents.filter(
        (e) => e.deviceId === d.deviceId,
      ).length;
      return {
        deviceId: d.id,
        taxiNumber: d.taxiNumber ?? "",
        driverId: d.driver?.id || "",
        driverName: d.driver?.fullName || "Unknown",
        verifiedPlays: verified,
      };
    });

    const totalVerified = verifiedEvents.length;
    const verificationRate =
      estimatedTotal > 0 ? (totalVerified / estimatedTotal) * 100 : 0;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      totalVerifiedPlays: totalVerified,
      totalEstimatedPlays: estimatedTotal,
      verificationRate: Math.round(verificationRate * 100) / 100,
      byMediaAsset,
      byDevice,
      dateFrom,
      dateTo,
    };
  }

  /**
   * Obtiene estadísticas de reproducción VERIFICADA por conductor.
   * Usado para cálculo de nómina real (no estimado).
   */
  async getDriverVerifiedStats(
    driverId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<DriverPlaybackStats> {
    this.logger.log(
      `[VERIFIED_METRICS] Driver ${driverId} verified stats ${dateFrom.toISOString()} - ${dateTo.toISOString()}`,
    );

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        fullName: true,
        taxiNumber: true,
        // PlaybackEvent.deviceId references Device.deviceId (hardware ID), not Device.id (UUID).
        devices: { select: { deviceId: true } },
      },
    });

    if (!driver) {
      throw new Error(`Driver ${driverId} not found`);
    }

    const deviceIds = driver.devices.map((d) => d.deviceId);

    const verifiedEvents = await this.prisma.playbackEvent.findMany({
      where: {
        deviceId: { in: deviceIds },
        eventType: "play_confirm",
        verified: true,
        timestamp: { gte: dateFrom, lte: dateTo },
      },
      select: {
        deviceId: true,
        videoId: true,
        timestamp: true,
      },
    });

    // Campañas únicas reproducidas
    const campaignIds = new Set<string>();
    const videoIds = new Set(verifiedEvents.map((e) => e.videoId));

    // Resolver campañas desde media assets
    const mediaAssets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: Array.from(videoIds) } },
      select: { campaignId: true },
    });
    mediaAssets.forEach((m) => campaignIds.add(m.campaignId));

    // Fechas únicas con actividad
    const uniqueDates = new Set(
      verifiedEvents.map((e) => e.timestamp.toISOString().split("T")[0]),
    ).size;

    return {
      driverId: driver.id,
      driverName: driver.fullName || "Unknown",
      taxiNumber: driver.taxiNumber || "S/N",
      totalVerifiedPlays: verifiedEvents.length,
      campaignsPlayed: campaignIds.size,
      uniqueDates,
      dateFrom,
      dateTo,
    };
  }

  /**
   * Obtiene resumen de verificación global (todas las campañas).
   */
  async getGlobalVerificationSummary(dateFrom: Date, dateTo: Date) {
    this.logger.log(
      `[VERIFIED_METRICS] Global summary ${dateFrom.toISOString()} - ${dateTo.toISOString()}`,
    );

    // Total eventos verificados
    const totalVerified = await this.prisma.playbackEvent.count({
      where: {
        eventType: "play_confirm",
        verified: true,
        timestamp: { gte: dateFrom, lte: dateTo },
      },
    });

    // Total campañas activas en el periodo
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: dateTo },
        endDate: { gte: dateFrom },
      },
      include: { mediaAssets: true, devices: true },
    });

    // Estimación global
    const daysInPeriod = Math.max(
      1,
      Math.ceil(
        (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    let estimatedTotal = 0;
    for (const c of activeCampaigns) {
      estimatedTotal += c.devices.length * daysInPeriod * 120;
    }

    // Top dispositivos por verificación
    const topDevices = await this.prisma.playbackEvent.groupBy({
      by: ["deviceId"],
      where: {
        eventType: "play_confirm",
        verified: true,
        timestamp: { gte: dateFrom, lte: dateTo },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Enriquecer con info de dispositivo
    const deviceIds = topDevices.map((d) => d.deviceId);
    const devices = await this.prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: {
        id: true,
        taxiNumber: true,
        driver: { select: { id: true, fullName: true } },
      },
    });

    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    return {
      period: { from: dateFrom, to: dateTo },
      totalVerifiedPlays: totalVerified,
      totalEstimatedPlays: estimatedTotal,
      globalVerificationRate:
        estimatedTotal > 0
          ? Math.round((totalVerified / estimatedTotal) * 10000) / 100
          : 0,
      activeCampaignsCount: activeCampaigns.length,
      topDevices: topDevices.map((d) => ({
        deviceId: d.deviceId,
        taxiNumber: deviceMap.get(d.deviceId)?.taxiNumber || "Unknown",
        driverName: deviceMap.get(d.deviceId)?.driver?.fullName || "Unknown",
        verifiedPlays: d._count.id,
      })),
    };
  }

  /**
   * Marca eventos de reproducción como VERIFICADOS tras validación manual/automática.
   * Idempotente por deviceId + videoId + timestamp (unique constraint).
   */
  async verifyPlaybackEvents(eventIds: string[], verifiedBy: string) {
    this.logger.log(
      `[VERIFIED_METRICS] Verifying ${eventIds.length} playback events by ${verifiedBy}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.playbackEvent.updateMany({
        where: { id: { in: eventIds } },
        data: { verified: true },
      });

      this.logger.log(`[VERIFIED_METRICS] Verified ${updated.count} events`);
      return { updated: updated.count };
    });
  }

  /**
   * Detecta anomalías: dispositivos con 0 verificaciones pero asignados a campañas activas.
   * Útil para alertas operativas.
   */
  async detectAnomalies(dateFrom: Date, dateTo: Date) {
    this.logger.log(
      `[VERIFIED_METRICS] Detecting anomalies ${dateFrom.toISOString()} - ${dateTo.toISOString()}`,
    );

    // Dispositivos asignados a campañas activas
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: dateTo },
        endDate: { gte: dateFrom },
      },
      include: {
        devices: {
          include: {
            device: {
              include: { driver: { select: { id: true, fullName: true } } },
            },
          },
        },
      },
    });

    const allDeviceIds = new Set<string>();
    const deviceInfo = new Map<
      string,
      {
        taxiNumber: string | null;
        driver: { id: string; fullName: string } | null;
      }
    >();
    for (const c of activeCampaigns) {
      for (const dc of c.devices) {
        const devId =
          dc.device_id ||
          (dc as typeof dc & { deviceId?: string }).deviceId ||
          dc.device?.id;
        if (devId) {
          allDeviceIds.add(devId);
          deviceInfo.set(devId, {
            taxiNumber: dc.device?.taxiNumber,
            driver: dc.device?.driver,
          });
        }
      }
    }

    // Dispositivos con al menos 1 evento verificado
    const devicesWithVerified = await this.prisma.playbackEvent.findMany({
      where: {
        deviceId: { in: Array.from(allDeviceIds) },
        eventType: "play_confirm",
        verified: true,
        timestamp: { gte: dateFrom, lte: dateTo },
      },
      select: { deviceId: true },
      distinct: ["deviceId"],
    });

    const verifiedDeviceIds = new Set(
      devicesWithVerified.map((d) => d.deviceId),
    );
    const silentDevices = Array.from(allDeviceIds).filter(
      (id) => !verifiedDeviceIds.has(id),
    );

    return {
      period: { from: dateFrom, to: dateTo },
      totalAssignedDevices: allDeviceIds.size,
      devicesWithVerifiedPlays: verifiedDeviceIds.size,
      silentDevicesCount: silentDevices.length,
      silentDevices: silentDevices.map((id) => ({
        deviceId: id,
        taxiNumber: deviceInfo.get(id)?.taxiNumber,
        driverName: deviceInfo.get(id)?.driver?.fullName,
      })),
    };
  }
}
