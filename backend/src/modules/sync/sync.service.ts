import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SyncService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async getDeviceManifest(deviceId: string) {
    // 1. Validar hardware primero (Device)
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { driver: true }
    });

    if (!device) {
      await this.notifications.createAlert({
        title: 'Intento de Sincronización Fallido',
        message: `Un dispositivo desconocido (${deviceId}) intentó sincronizar contenido.`,
        type: 'WARNING',
        category: 'DEVICE',
        entityId: deviceId
      });
      throw new HttpException('DEVICE_NOT_FOUND_IN_CLUSTER', HttpStatus.NOT_FOUND);
    }

    if (device.status !== 'ACTIVE') {
      await this.notifications.createAlert({
        title: 'Dispositivo Inactivo',
        message: `El dispositivo ${device.taxiNumber || deviceId} está intentando sincronizar pero su estado es ${device.status}.`,
        type: 'CRITICAL',
        category: 'DEVICE',
        entityId: deviceId
      });
      throw new HttpException('DEVICE_DEACTIVATED', HttpStatus.FORBIDDEN);
    }

    // 2. Validar suscripción vía Driver o via Subscription entity
    const driver = device.driver;
    
    // Si no hay driver, permitimos solo campañas GLOBALES (no segmentadas)
    // Esto es vital para el primer encendido (Out-of-the-box experience)
    const isDriverActive = driver && driver.status === 'ACTIVE';
    const isDriverPaid = (driver && driver.subscriptionPaid);
    
    let hasValidSubscription = isDriverPaid;

    if (!hasValidSubscription) {
      // Intentar ver si tiene suscripción activa en tabla subscriptions (independiente del driver)
      const sub = await this.prisma.subscription.findUnique({
        where: { deviceId }
      });
      hasValidSubscription = sub && sub.status === 'ACTIVE' && (!sub.validUntil || new Date() <= sub.validUntil);
    }

    // 3. Obtener campañas activas
    // Filtro inteligente: 
    // - Si hay suscripción + driver: recibe TODO (Global + Segmentado)
    // - Si NO hay driver o pago: recibe solo campañas GLOBALES (demo/promociones internas)
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        active: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        OR: [
          { targetAll: true },
          { isGlobal: true },
          // Solo si hay driver, traemos lo segmentado para ese driver/device
          ...(isDriverActive ? [
            { targetDrivers: { some: { id: driver.id } } },
            { devices: { some: { device_id: device.id } } }
          ] : []),
          // Si el device está asignado directamente a una campaña v1
          { targets: { some: { deviceId } } }
        ]
      },
      include: {
        media: true,
        mediaAssets: true
      }
    });

    const playlist = [];
    activeCampaigns.forEach(c => {
      // Unificar Media y MediaAssets (v1 y v2)
      const mediaList = [...(c.media || []), ...(c.mediaAssets || [])];
      
      mediaList.forEach((m: any) => {
        playlist.push({
          id: m.id,
          campaignId: c.id,
          url: m.url || m.cdnUrl || '',
          checksum: m.hashMd5 || m.hash || 'no-checksum',
          duration: m.duration || m.durationSeconds || 30,
          version: new Date(c.updatedAt || new Date()).getTime() 
        });
      });
    });

    // 4. Formatear manifiesto
    return {
      timestamp: new Date().toISOString(),
      device: {
        id: device.id,
        deviceId: device.deviceId,
        taxi: device.taxiNumber
      },
      count: playlist.length,
      playlist
    };
  }
}
