import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { WhatsAppService } from "../notifications/whatsapp.service";
import { GpsBatchDto } from "./monitoring.dto";
import { throttledMap } from "../../utils/throttler.util";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

// Los 10 dispositivos del Piloto de Santiago (Fase 1)
const PILOT_DEVICE_IDS = [
  "STI0001",
  "STI0002",
  "STI0003",
  "STI0004",
  "STI0005",
  "STI0006",
  "STI0007",
  "STI0008",
  "STI0009",
  "STI0010",
];

// Teléfono del administrador del piloto (para alertas críticas)
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_PHONE || "18098001234";
const OFFLINE_THRESHOLD_MINUTES = 15;
const PUSH_NOTIFICATION_HOURS = 12;

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * RECOVERY: Check for offline devices on startup to ensure telemetry integrity
   * SRE FIX: No usamos await para evitar bloquear el listen(3000) de NestJS (TAD-BOOT-FAST)
   */
  async onModuleInit() {
    this.logger.log(
      "🔄 [RECOVERY] Running startup connectivity scan in background...",
    );
    this.checkOfflineDevices().catch((err) =>
      this.logger.error(`❌ Startup connectivity scan failed: ${err.message}`),
    );
  }

  /**
   * Procesa un lote de coordenadas GPS enviadas por el conductor cada 5 minutos.
   * Agrupa los registros en DriverLocation y actualiza el estado del dispositivo.
   */
  async processGpsBatch(batch: GpsBatchDto) {
    const { deviceId } = batch;
    const points = batch.points || batch.locations || [];

    this.logger.log(
      `📥 Recibiendo lote GPS de dispositivo ${deviceId} (${points.length} puntos)`,
    );

    try {
      // 1. Resolver el Driver ID ligado al dispositivo (fuente de verdad).
      // FASE 2 (Item 8, A5): se ignora el driverId enviado por el cliente para
      // evitar spoofing (atribuir puntos GPS a otro chofer) y se omite el
      // status OPERATIVO: un device BLOQUEADO no debe reactivarse por GPS.
      const device = await this.prisma.device.findUnique({
        where: { deviceId },
        include: { driver: true },
      });

      const resolvedDriverId = device?.driverId ?? null;

      if (!resolvedDriverId || !device) {
        this.logger.warn(
          `⚠️ Batch recibido para ${deviceId} sin chofer vinculado. Descartando.`,
        );
        return { status: "ignored", reason: "no_driver_linked" };
      }

      if (points.length > 0) {
        await this.prisma.driverLocation.createMany({
          data: points.map((p) => ({
            deviceId: device.id,
            driverId: resolvedDriverId,
            latitude: p.latitude ?? p.lat,
            longitude: p.longitude ?? p.lng,
            speed: p.speed || 0,
            timestamp: new Date(p.timestamp),
          })),
        });

        const latestPoint = points.reduce((prev, curr) =>
          new Date(prev.timestamp) > new Date(curr.timestamp) ? prev : curr,
        );

        await this.prisma.device.update({
          where: { deviceId },
          data: {
            lastLat: latestPoint.latitude ?? latestPoint.lat,
            lastLng: latestPoint.longitude ?? latestPoint.lng,
            isOnline: true,
            lastSeen: new Date(),
            lastSyncAt: new Date(),
            lastSyncSuccess: true,
            connectivityStatus: "ONLINE",
          },
        });
      }

      return {
        status: "success",
        processedPoints: points.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `❌ Error procesando lote GPS para ${deviceId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Retorna el estado completo de todos los dispositivos STI (para el mapa).
   */
  async getFleetStatus() {
    return await this.prisma.device.findMany({
      where: { deviceId: { contains: "STI" } },
      select: {
        deviceId: true,
        taxiNumber: true,
        lastLat: true,
        lastLng: true,
        isOnline: true,
        lastSeen: true,
        status: true,
      },
      orderBy: { deviceId: "asc" },
    });
  }

  /**
   * Retorna SOLO los 10 dispositivos del Piloto Santiago con estadísticas completas.
   */
  async getPilotFleetStatus() {
    const devices = await this.prisma.device.findMany({
      where: { deviceId: { in: PILOT_DEVICE_IDS } },
      select: {
        deviceId: true,
        taxiNumber: true,
        lastLat: true,
        lastLng: true,
        isOnline: true,
        lastSeen: true,
        status: true,
        driver: {
          select: {
            fullName: true,
            phone: true,
            subscriptionPaid: true,
          },
        },
      },
      orderBy: { deviceId: "asc" },
    });

    const onlineCount = devices.filter((d) => d.isOnline).length;

    return {
      summary: {
        total: PILOT_DEVICE_IDS.length,
        online: onlineCount,
        offline: PILOT_DEVICE_IDS.length - onlineCount,
        healthPercentage: Math.round(
          (onlineCount / PILOT_DEVICE_IDS.length) * 100,
        ),
      },
      devices,
    };
  }

  /**
   * Retorna el estado de campañas activas para el sidebar del dashboard.
   */
  async getActiveCampaignsStatus() {
    return await this.prisma.campaign.findMany({
      where: {
        active: true,
        status: { in: ["ACTIVE", "PUBLISHED"] },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        advertiser: true,
        targetImpressions: true,
        metrics: {
          take: 1,
          orderBy: { date: "desc" },
        },
      },
    });
  }

  /**
   * CRON: Cada 30 minutos verifica si algún dispositivo piloto está offline
   * y envía alerta por WhatsApp al administrador.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkOfflineDevices() {
    this.logger.log(
      "🔍 [CRON] Verificando dispositivos offline y conectividad...",
    );

    const now = new Date();
    const offlineThreshold = new Date(
      now.getTime() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000,
    );
    const criticalThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 Horas
    const pushThreshold = new Date(
      now.getTime() - PUSH_NOTIFICATION_HOURS * 60 * 60 * 1000,
    ); // 12 Horas

    try {
      // 1. Marcar como OFFLINE (isOnline = false) los que pasen el threshold de 15 min
      await this.prisma.device.updateMany({
        where: {
          lastSeen: { lt: offlineThreshold },
          isOnline: true,
        },
        data: {
          isOnline: false,
          status: BUSINESS_RULES.STATUS.DEVICE.SUSPENDED,
        },
      });

      // 2. Marcar como connectivity_issue si llevan +48h sin reporte
      const criticalCount = await this.prisma.device.updateMany({
        where: {
          OR: [{ lastSeen: { lt: criticalThreshold } }, { lastSeen: null }],
          connectivityStatus: { not: "connectivity_issue" },
        },
        data: { connectivityStatus: "connectivity_issue" },
      });

      if (criticalCount.count > 0) {
        this.logger.warn(
          `🚨 [FLEET] ${criticalCount.count} dispositivos marcados con connectivity_issue (+48h offline).`,
        );
      }

      // 3. Notificaciones PUSH a choferes cada 12h offline
      const offlineDrivers = await this.prisma.device.findMany({
        where: {
          lastSeen: { lt: pushThreshold },
          driverId: { not: null },
        },
        select: { driverId: true, deviceId: true },
      });

      await throttledMap(
        offlineDrivers,
        async (d) => {
          if (d.driverId) {
            await this.notifications
              .sendPush(
                d.driverId,
                `⚠️ TAD: Tu equipo ${d.deviceId} lleva +12h sin conexión. Verifica el encendido de la tablet para no afectar tu nómina.`,
              )
              .catch((e) =>
                this.logger.error(
                  `Error enviando push a ${d.driverId}: ${e.message}`,
                ),
              );
          }
        },
        5,
      );

      // 4. Alerta por WhatsApp solo para el PILOTO (STI)
      const offlinePilotDevices = await this.prisma.device.findMany({
        where: {
          deviceId: { in: PILOT_DEVICE_IDS },
          lastSeen: { lt: offlineThreshold },
          status: BUSINESS_RULES.STATUS.DEVICE.SUSPENDED,
        },
        select: { deviceId: true, taxiNumber: true, lastSeen: true },
      });

      if (offlinePilotDevices.length > 0) {
        const deviceList = offlinePilotDevices
          .map(
            (d) =>
              `• ${d.deviceId} (${d.taxiNumber || "S/N"}) — última: ${d.lastSeen ? d.lastSeen.toLocaleTimeString() : "nunca"}`,
          )
          .join("\n");

        const alertMessage =
          `🚨 *ALERTA TAD PILOTO SANTIAGO*\n\n` +
          `${offlinePilotDevices.length} pantalla(s) sin señal:\n\n${deviceList}\n\n` +
          `⏰ Umbral: ${OFFLINE_THRESHOLD_MINUTES} min.`;

        await this.whatsapp.sendMessage(ADMIN_PHONE, alertMessage);
      }
    } catch (err) {
      this.logger.error(
        `❌ [CRON] Error en checkOfflineDevices: ${err.message}`,
      );
    }
  }

  /**
   * CRON: Limpieza de datos antiguos (Data Retention)
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async dataRetentionCleanup() {
    this.logger.log("🧹 [CRON] Ejecutando limpieza de retención de datos...");
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const hbResult = await this.prisma.deviceHeartbeat.deleteMany({
        where: { timestamp: { lt: thirtyDaysAgo } },
      });

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const anResult = await this.prisma.analyticsEvent.deleteMany({
        where: {
          processed: true,
          occurredAt: { lt: ninetyDaysAgo },
        },
      });

      this.logger.log(
        `✅ [CRON] Limpieza completada: ${hbResult.count} heartbeats, ${anResult.count} analytics events eliminados.`,
      );
    } catch (err) {
      this.logger.error(
        `❌ [CRON] Error en dataRetentionCleanup: ${err.message}`,
      );
    }
  }
}
