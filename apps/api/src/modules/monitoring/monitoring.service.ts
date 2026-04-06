import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { GpsBatchDto } from './monitoring.dto';

// Los 10 dispositivos del Piloto de Santiago (Fase 1)
const PILOT_DEVICE_IDS = [
  'STI0001', 'STI0002', 'STI0003', 'STI0004', 'STI0005',
  'STI0006', 'STI0007', 'STI0008', 'STI0009', 'STI0010',
];

// Teléfono del administrador del piloto (para alertas críticas)
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_PHONE || '18098001234';
const OFFLINE_THRESHOLD_MINUTES = 15;

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Procesa un lote de coordenadas GPS enviadas por el conductor cada 5 minutos.
   * Agrupa los registros en DriverLocation y actualiza el estado del dispositivo.
   */
  async processGpsBatch(batch: GpsBatchDto) {
    const { deviceId, driverId, points } = batch;

    this.logger.log(`📥 Recibiendo lote GPS de dispositivo ${deviceId} (${points.length} puntos)`);

    try {
      if (points.length > 0) {
        await this.prisma.driverLocation.createMany({
          data: points.map(p => ({
            deviceId,
            driverId,
            latitude: p.latitude,
            longitude: p.longitude,
            speed: p.speed,
            timestamp: new Date(p.timestamp),
          })),
        });

        const latestPoint = points.reduce((prev, curr) =>
          new Date(prev.timestamp) > new Date(curr.timestamp) ? prev : curr,
        );

        await this.prisma.device.update({
          where: { deviceId },
          data: {
            lastLat: latestPoint.latitude,
            lastLng: latestPoint.longitude,
            isOnline: true,
            lastSeen: new Date(),
            lastSyncAt: new Date(),
            lastSyncSuccess: true,
          },
        });
      }

      return {
        status: 'success',
        processedPoints: points.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Error procesando lote GPS para ${deviceId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retorna el estado completo de todos los dispositivos STI (para el mapa).
   */
  async getFleetStatus() {
    return await this.prisma.device.findMany({
      where: { deviceId: { contains: 'STI' } },
      select: {
        deviceId: true,
        taxiNumber: true,
        lastLat: true,
        lastLng: true,
        isOnline: true,
        lastSeen: true,
        status: true,
      },
      orderBy: { deviceId: 'asc' },
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
      orderBy: { deviceId: 'asc' },
    });

    const onlineCount = devices.filter(d => d.isOnline).length;

    return {
      summary: {
        total: PILOT_DEVICE_IDS.length,
        online: onlineCount,
        offline: PILOT_DEVICE_IDS.length - onlineCount,
        healthPercentage: Math.round((onlineCount / PILOT_DEVICE_IDS.length) * 100),
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
        status: { in: ['ACTIVE', 'PUBLISHED'] },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        advertiser: true,
        targetImpressions: true,
        metrics: {
          take: 1,
          orderBy: { date: 'desc' },
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
    this.logger.log('🔍 [CRON] Verificando dispositivos offline del piloto...');

    const thresholdTime = new Date(Date.now() - OFFLINE_THRESHOLD_MINUTES * 60 * 1000);

    try {
      const offlineDevices = await this.prisma.device.findMany({
        where: {
          deviceId: { in: PILOT_DEVICE_IDS },
          OR: [
            { lastSeen: { lt: thresholdTime } },
            { lastSeen: null },
          ],
          isOnline: true,
        },
        select: { deviceId: true, taxiNumber: true, lastSeen: true },
      });

      if (offlineDevices.length === 0) {
        this.logger.log('✅ [CRON] Todos los dispositivos piloto están activos.');
        return;
      }

      // Marcar como offline en BD
      await this.prisma.device.updateMany({
        where: { deviceId: { in: offlineDevices.map(d => d.deviceId) } },
        data: { isOnline: false, status: 'OFFLINE' },
      });

      const deviceList = offlineDevices
        .map(d =>
          `• ${d.deviceId} — última señal: ${
            d.lastSeen
              ? new Date(d.lastSeen).toLocaleTimeString('es-DO')
              : 'nunca'
          }`,
        )
        .join('\n');

      const alertMessage =
        `🚨 *ALERTA TAD PILOTO SANTIAGO*\n\n` +
        `${offlineDevices.length} pantalla(s) sin GPS:\n\n${deviceList}\n\n` +
        `⏰ Sin señal por más de ${OFFLINE_THRESHOLD_MINUTES} min.\n` +
        `🔗 https://proyecto-ia-tad-dashboard.rewvid.easypanel.host/dashboard/realtime`;

      await this.whatsapp.sendMessage(ADMIN_PHONE, alertMessage);

      this.logger.warn(`⚠️ [CRON] ${offlineDevices.length} dispositivos offline. Alerta enviada.`);
    } catch (err) {
      this.logger.error(`❌ [CRON] Error en checkOfflineDevices: ${err.message}`);
    }
  }
}
