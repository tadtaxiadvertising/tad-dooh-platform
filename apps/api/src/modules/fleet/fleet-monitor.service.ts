import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BUSINESS_RULES } from '../../common/constants/business-rules';

@Injectable()
export class FleetMonitorService {
  private readonly logger = new Logger(FleetMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async checkFleetConnectivity() {
    this.logger.log('Iniciando auditoría de conectividad de flota...');
    const now = new Date();
    const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const threshold12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // 1. Marcar connectivity_issue para > 48h
    const devicesToUpdate = await this.prisma.device.updateMany({
      where: {
        lastHeartbeat: { lt: threshold48h },
        connectivityStatus: 'ONLINE'
      },
      data: { connectivityStatus: 'CONNECTIVITY_ISSUE' }
    });

    if (devicesToUpdate.count > 0) {
      this.logger.warn(`🛑 ${devicesToUpdate.count} dispositivos marcados con 'connectivity_issue' (offline > 48h).`);
    }

    // 2. Notificaciones push cada 12h sin conexión
    const offlineDevices = await this.prisma.device.findMany({
      where: { 
        lastHeartbeat: { lt: threshold12h },
        status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE
      },
      include: { driver: true }
    });

    for (const device of offlineDevices) {
      if (device.driverId) {
        await this.notifications.sendPush(
          device.driverId,
          `⚠️ Alerta de Conexión: Su pantalla no ha reportado actividad en más de 12 horas. Asegúrese de que el GPS y el Internet estén activos.`
        ).catch(err => this.logger.error(`Error enviando push a ${device.driverId}: ${err.message}`));
      }
    }
    
    this.logger.log(`Auditoría de conectividad completada. Dispositivos offline > 12h: ${offlineDevices.length}`);
  }
}
