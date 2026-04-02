import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GpsBatchDto } from './monitoring.dto';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Procesa un lote de coordenadas GPS enviadas por el conductor cada 5 minutos.
   * Agrupa los registros en DriverLocation y actualiza el estado del dispositivo.
   */
  async processGpsBatch(batch: GpsBatchDto) {
    const { deviceId, driverId, points } = batch;

    this.logger.log(`📥 Recibiendo lote GPS de dispositivo ${deviceId} (${points.length} puntos)`);

    try {
      // 1. Guardar todos los puntos en DriverLocation (batch insert para eficiencia)
      if (points.length > 0) {
        await this.prisma.driverLocation.createMany({
          data: points.map(p => ({
            deviceId: deviceId,
            driverId: driverId,
            latitude: p.latitude,
            longitude: p.longitude,
            speed: p.speed,
            timestamp: new Date(p.timestamp),
          })),
        });

        // 2. Extraer el punto más reciente para actualizar el estado del dispositivo
        const latestPoint = points.reduce((prev, curr) => (new Date(prev.timestamp) > new Date(curr.timestamp) ? prev : curr));

        // 3. Actualizar el dispositivo: última posición, online status y sincronización exitosa
        await this.prisma.device.update({
          where: { deviceId: deviceId },
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
   * Retorna el estado actual de los dispositivos para el dashboard.
   */
  async getFleetStatus() {
    // Buscamos dispositivos STI-001 al STI-010 para el piloto de Santiago
    return await this.prisma.device.findMany({
      where: {
        deviceId: {
          contains: 'STI',
        },
      },
      select: {
        deviceId: true,
        taxiNumber: true,
        lastLat: true,
        lastLng: true,
        isOnline: true,
        lastSeen: true,
        status: true,
      },
      orderBy: {
        deviceId: 'asc',
      },
    });
  }

  /**
   * Retorna el estado de campañas activas para el sidebar del dashboard.
   */
  async getActiveCampaignsStatus() {
    return await this.prisma.campaign.findMany({
      where: {
        active: true,
        // Eliminamos el filtro PUBLISHED (que no existía en el seed) y usamos ACTIVE
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
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
  }
}
