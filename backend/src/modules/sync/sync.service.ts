import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async getDeviceManifest(deviceId: string) {
    // 1. Validar conductor y regla estricta de suscripción (RD$6,000)
    const driver = await this.prisma.driver.findUnique({
      where: { deviceId },
      select: { id: true, status: true, subscriptionPaid: true }
    });

    if (!driver || driver.status !== 'ACTIVE') {
      throw new HttpException('DEVICE_NOT_ACTIVE', HttpStatus.FORBIDDEN);
    }

    if (!driver.subscriptionPaid) {
      // Si no ha pagado, devolvemos un playlist vacío o un video por defecto de "Pantalla Suspendida"
      throw new HttpException('SUBSCRIPTION_PAYMENT_REQUIRED', HttpStatus.PAYMENT_REQUIRED);
    }

    // 2. Obtener campañas activas (Globales o Específicas del conductor)
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { targetAll: true },
          { isGlobal: true },
          { targetDrivers: { some: { id: driver.id } } },
          { devices: { some: { device: { deviceId } } } }
        ],
        // Optimización: Solo traer campañas vigentes en fecha
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        media: true
      }
    });

    const playlist = [];
    activeCampaigns.forEach(c => {
      if (c.media && c.media.length > 0) {
        c.media.forEach(m => {
          playlist.push({
            campaignId: c.id,
            url: m.url || m.cdnUrl || '',
            checksum: m.hashMd5 || m.hash || 'no-checksum',
            duration: m.durationSeconds || 30, // 30s por defecto según reglas TAD
            version: new Date(c.updatedAt).getTime() 
          });
        });
      }
    });

    // 3. Formatear manifiesto determinístico
    return {
      timestamp: new Date().toISOString(),
      count: playlist.length,
      playlist
    };
  }
}
