import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async getDeviceManifest(deviceId: string) {
    // 1. Validar hardware primero (Device)
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { driver: true }
    });

    if (!device) {
      throw new HttpException('DEVICE_NOT_FOUND_IN_CLUSTER', HttpStatus.NOT_FOUND);
    }

    if (device.status !== 'ACTIVE') {
      throw new HttpException('DEVICE_DEACTIVATED', HttpStatus.FORBIDDEN);
    }

    // 2. Validar suscripción vía Driver o via Subscription entity
    const driver = device.driver;
    
    // Si no hay driver, verificamos si hay campañas globales al menos
    // pero usualmente requerimos un driver activo para auditoría
    if (!driver || driver.status !== 'ACTIVE') {
      // Fallback: Permitir solo si hay campañas globales y device está activo
      // Pero por ahora seguimos la regla estricta de conductor
      throw new HttpException('DEVICE_NOT_LINKED_TO_ACTIVE_DRIVER', HttpStatus.FORBIDDEN);
    }

    if (!driver.subscriptionPaid) {
      // Intentar ver si tiene suscripción activa en tabla subscriptions
      const sub = await this.prisma.subscription.findUnique({
        where: { deviceId }
      });
      const isSubActive = sub && sub.status === 'ACTIVE' && (!sub.validUntil || new Date() <= sub.validUntil);
      
      if (!isSubActive) {
        throw new HttpException('SUBSCRIPTION_PAYMENT_REQUIRED', HttpStatus.PAYMENT_REQUIRED);
      }
    }

    // 3. Obtener campañas activas
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        active: true, // Usar active: true en lugar de status: 'ACTIVE' si es el campo correcto
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        OR: [
          { targetAll: true },
          { isGlobal: true },
          { targetDrivers: { some: { id: driver.id } } },
          { devices: { some: { device_id: device.id } } }
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
