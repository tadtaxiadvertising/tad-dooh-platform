import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Crear una alerta y disparar transmisión en tiempo real
   */
  async createAlert(data: {
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
    category: 'SYSTEM' | 'DEVICE' | 'CAMPAIGN' | 'FINANCE';
    entityId?: string;
  }) {
    this.logger.log(`📢 Nueva Alerta: ${data.title} - ${data.type}`);

    const notification = await this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        entityId: data.entityId,
      },
    });

    // Real-time broadcast vía Supabase
    try {
      const supabase = this.supabaseService.getClient();
      await supabase.channel('system_alerts').send({
        type: 'broadcast',
        event: 'NEW_ALERT',
        payload: notification,
      });
    } catch (err) {
      this.logger.error('Error broadcasting alert:', err);
    }

    return notification;
  }

  async findAll() {
    return this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount() {
    return this.prisma.notification.count({
      where: { read: false },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead() {
    return this.prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  }

  /**
   * Enviar una notificación push (fire-and-forget directo)
   * TODO: Migrar a BullMQ cuando Redis esté provisionado en EasyPanel
   */
  async sendPush(driverId: string, message: string) {
    this.logger.log(`📱 Procesando PUSH para Chofer ${driverId}`);
    // Fire-and-forget: no bloqueamos la respuesta al llamador
    this.executePushDelivery(driverId, message).catch((err) =>
      this.logger.error(`[PUSH] Error entregando a ${driverId}: ${err.message}`),
    );
  }

  /**
   * Ejecución real del delivery
   */
  async executePushDelivery(driverId: string, message: string) {
    this.logger.log(`🚀 [PUSH DELIVERY] Entregando a ${driverId}: ${message}`);

    // Mirror as system alert for auditability
    return this.createAlert({
      title: 'Notificación Mobile (Push)',
      message: message,
      type: 'WARNING',
      category: 'DEVICE',
      entityId: driverId,
    });
  }

  /**
   * Publica una notificación dirigida a un conductor por canal privado Realtime.
   * No lanza: si el canal falla, solo registra el error para no romper el flujo.
   */
  async sendDriverNotification(driverId: string, type: string, payload: Record<string, unknown>) {
    const channel = `driver_notifications_${driverId}`;
    this.logger.log(`📣 [NOTIFY] ${type} -> ${channel}`);

    try {
      const supabase = this.supabaseService.getClient();
      await supabase.channel(channel).send({
        type: 'broadcast',
        event: type,
        payload,
      });
    } catch (err) {
      this.logger.error(`[NOTIFY] Error enviando ${type} a ${driverId}: ${(err as Error).message}`);
    }
  }
}
