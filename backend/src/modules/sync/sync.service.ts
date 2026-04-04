import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'tad-default-secret-2026';

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
    // Filtro inteligente (Ghost Kill Switch):
    // - Si hay suscripción + driver: recibe TODO (Global + Segmentado + Directo)
    // - Si NO hay driver o pago: recibe solo campañas GLOBALES (demo/promociones internas)
    const now = new Date();
    this.logger.log(`🕒 Sync [V5] Clock: ${now.toISOString()} | Device: ${deviceId}`);

    let campaignFilter: any = { isGlobal: true }; // Fallback playlist por defecto

    if (hasValidSubscription) {
      campaignFilter = {
        OR: [
          // 1. Canal Global (Nacional)
          { targetAll: true, targetCity: 'Global' },
          
          // 2. Canal Geofencing (Ciudad)
          { targetAll: true, targetCity: device.city || 'Santiago' }, // Compatibilidad v1
          
          // 3. Canal Selectivo (Cities Array - v2): only when city is known
          ...(device.city ? [{ 
            targetCities: { contains: `"${device.city}"` } 
          }] : []),

          // 3b. Canal Ciudad Directa (v1 string match)
          ...(device.city ? [{ targetCity: device.city }] : []),

          // 4. Canal de Flota (v2)
          ...(device.fleet ? [{
            targetFleets: { contains: `"${device.fleet}"` }
          }] : []),

          // 5. Canal Directo (v2 UUID)
          { devices: { some: { device_id: device.id } } },

          // 6. Canal Legacy (v1 Hardware ID)
          { targets: { some: { deviceId } } },

          // 7. Canal Segmentado (v2 Segmentación por Conductor)
          ...(isDriverActive ? [
            { targetDrivers: { some: { id: driver.id } } }
          ] : []),
        ]
      };
    } else {
      this.logger.warn(`⚠️ [KILL_SWITCH] Device ${deviceId} no tiene suscripción activa. Enviando Fallback Playlist (Global only).`);
    }

    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
        ...campaignFilter
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
          url: m.cdnUrl || m.url || '',
          checksum: m.hashMd5 || m.hash || m.checksum || 'no-checksum',
          hashMd5: m.hashMd5 || m.hash || m.checksum || null,
          duration: m.duration || m.durationSeconds || 30,
          version: new Date(c.updatedAt || new Date()).getTime() 
        });
      });
    });

    // 4. Generar License Token (Kill-Switch)
    // El dispositivo solo puede reproducir contenido offline SI tiene este token válido.
    // Expiración: 48 horas (Tiempo suficiente para superar zonas de sombra o desconexión nocturna, pero corta fraude mensual)
    const licenseToken = jwt.sign(
      { 
        deviceId, 
        taxi: device.taxiNumber,
        type: 'OFFLINE_LICENSE',
        iat: Math.floor(Date.now() / 1000)
      }, 
      this.JWT_SECRET, 
      { expiresIn: '48h' }
    );

    // 5. Formatear manifiesto
    return {
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      licenseToken,
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
