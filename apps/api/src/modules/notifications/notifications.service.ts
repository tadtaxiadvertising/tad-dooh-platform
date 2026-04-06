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
}
