import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
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
      const sub = await this.prisma.subscription.findFirst({
        where: { deviceId }
      });
      hasValidSubscription = sub && sub.status === 'ACTIVE' && (!sub.validUntil || new Date() <= sub.validUntil);
    }

    // 3. Obtener campañas activas
    // Filtro inteligente: 
    // - Si hay suscripción + driver: recibe TODO (Global + Segmentado)
    // - Si NO hay driver o pago: recibe solo campañas GLOBALES (demo/promociones internas)
    const now = new Date();
    this.logger.log(`🕒 Sync [V5] Clock: ${now.toISOString()} | Device: ${deviceId}`);

    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { targetAll: true },
          { isGlobal: true },
          // Canal Directo (v2 UUID) - ALWAYS CHECKED
          { devices: { some: { device_id: device.id } } },
          // Canal Legacy (v1 Hardware ID) - ALWAYS CHECKED
          { targets: { some: { deviceId } } },
          // Canal Segmentado (v2 Segmentación por Conductor)
          ...(isDriverActive ? [
            { targetDrivers: { some: { id: driver.id } } }
          ] : []),
        ]
      },
      include: {
        media: true,
        mediaAssets: true,
        videos: true
      }
    });

    this.logger.log(`📊 Campaigns found (V5): ${activeCampaigns.length}`);
    activeCampaigns.forEach(c => {
      const assetsCount = (c.media?.length || 0) + (c.mediaAssets?.length || 0) + ((c as any).videos?.length || 0);
      this.logger.log(`   📂 Campaign "${c.name}" [${c.id}] | assets=${assetsCount} | dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`);
    });

    const playlist = [];
    activeCampaigns.forEach(c => {
      // Unificar Media, MediaAssets y Videos (v1, v2 y Hub)
      const mediaList = [
        ...(c.media || []), 
        ...(c.mediaAssets || []),
        ...((c as any).videos || [])
      ];
      
      mediaList.forEach((m: any) => {
        playlist.push({
          id: m.id,
          campaignId: c.id,
          filename: m.filename || m.name || m.title || 'video.mp4',
          url: m.url || m.cdnUrl || '',
          checksum: m.hashMd5 || m.hash || m.checksum || 'no-checksum',
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
