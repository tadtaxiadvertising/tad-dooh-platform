import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

export type CampaignExpirationResult = {
  processed: number;
  notificationsSent: number;
  campaignsChecked: number;
};

@Injectable()
export class CampaignExpirationService {
  private readonly logger = new Logger(CampaignExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Busca campañas que expirarán en los próximos 30 días y encolan
   * notificaciones de caducidad (sin enviar aún).
   */
  async queueExpiringCampaigns(daysThreshold: number = 30) {
    const now = new Date();
    const thresholdDate = new Date(
      now.getTime() + daysThreshold * 24 * 60 * 60 * 1000,
    );

    const campaigns = (await this.prisma.campaign.findMany({
      where: {
        endDate: {
          gte: now,
          lte: thresholdDate,
        },
        status: "ACTIVE",
      },
      select: {
        id: true,
        advertiserId: true,
        name: true,
        endDate: true,
      },
    })) as Array<{
      id: string;
      advertiserId: string;
      name: string;
      endDate: Date;
    }>;

    const queued = [];

    for (const campaign of campaigns) {
      const remainingDays = Math.ceil(
        (campaign.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Insertar en la cola de notificaciones (con deduplication)
      const row = await this.prisma.notificationQueue.upsert({
        where: {
          notification_queue_unique: {
            type: "CAMPAIGN_EXPIRATION",
            category: "FINANCE",
            entityId: campaign.id,
          },
        },
        update: {
          title: `Campaña "${campaign.name || campaign.id}" próxima a caducar`,
          message: `La campaña ${campaign.id} caducará en ${remainingDays} días (${campaign.endDate.toISOString()}).`,
          sent: false,
          createdAt: new Date(),
        },
        create: {
          type: "CAMPAIGN_EXPIRATION",
          category: "FINANCE",
          entityId: campaign.id,
          title: `Campaña "${campaign.name || campaign.id}" próxima a caducar`,
          message: `La campaña ${campaign.id} caducará en ${remainingDays} días (${campaign.endDate.toISOString()}).`,
          sent: false,
          createdAt: new Date(),
        },
      });

      queued.push(row);
    }

    return queued;
  }

  /**
   * Procesa la cola de notificaciones de caducidad y envía las no enviadas.
   * Usado por el cron: ejecuta cada noche.
   */
  async processExpirationQueue() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Encontrar notificaciones pendientes en la cola (no enviadas)
    const queued = await this.prisma.notificationQueue.findMany({
      where: {
        sent: false,
        createdAt: {
          lt: yesterday, // Notificaciones antiguas (en cola por más de 24h)
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const notified = [];

    for (const item of queued) {
      try {
        // Crear la notificación real para el anunciante
        const notification = await this.notifications.createAlert({
          title: item.title,
          message: item.message,
          type: "WARNING",
          category: "FINANCE",
          entityId: item.entityId,
        });

        // Marcar como enviada en la cola
        await this.prisma.notificationQueue.update({
          where: { id: item.id },
          data: { sent: true, sentAt: new Date() },
        });

        notified.push(notification);
      } catch (err) {
        this.logger.error(
          `Error enviando notificación de caducidad para ${item.entityId}: ${err.message}`,
        );
      }
    }

    return {
      processed: queued.length,
      notificationsSent: notified.length,
    };
  }

  /**
   * Verifica campañas que expiran pronto y envía notificaciones inmediatas
   * a los anunciantes correspondientes.
   */
  async checkAndNotifyExpiringCampaigns(daysThreshold: number = 7) {
    const now = new Date();
    const result = {
      processed: 0,
      notificationsSent: 0,
      campaignsChecked: 0,
    };

    try {
      // 1. Buscar campañas que expiran en el umbral
      const campaigns = (await this.prisma.campaign.findMany({
        where: {
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000),
          },
          status: "ACTIVE",
        },
        select: {
          id: true,
          advertiserId: true,
          name: true,
          endDate: true,
        },
      })) as Array<{
        id: string;
        advertiserId: string;
        name: string;
        endDate: Date;
      }>;

      result.campaignsChecked = campaigns.length;

      // 2. Encolar notificaciones para cada campaña
      for (const campaign of campaigns) {
        const remainingDays = Math.ceil(
          (campaign.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        await this.prisma.notificationQueue.upsert({
          where: {
            notification_queue_unique: {
              type: "CAMPAIGN_EXPIRATION",
              category: "FINANCE",
              entityId: campaign.id,
            },
          },
          update: {
            title: `⚠️ Cuidado: Campaña "${campaign.name || campaign.id}" vence en ${remainingDays} días`,
            message: `La campaña ${campaign.id} caducará el ${campaign.endDate.toLocaleDateString("es-ES")}.`,
            sent: false,
            createdAt: new Date(),
          },
          create: {
            type: "CAMPAIGN_EXPIRATION",
            category: "FINANCE",
            entityId: campaign.id,
            title: `⚠️ Cuidado: Campaña "${campaign.name || campaign.id}" vence en ${remainingDays} días`,
            message: `La campaña ${campaign.id} caducará el ${campaign.endDate.toLocaleDateString("es-ES")}.`,
            sent: false,
            createdAt: new Date(),
          },
        });
      }

      result.processed = campaigns.length;
    } catch (err) {
      this.logger.error("Error verificando campañas que expiran:", err.message);
      return result;
    }

    // 3. Procesar la cola de notificaciones
    const queueResult = await this.processExpirationQueue();
    result.notificationsSent = queueResult.notificationsSent;

    this.logger.log(
      `📅 Caducidad: ${result.campaignsChecked} campañas revisadas, ${result.notificationsSent} notificaciones enviadas`,
    );

    return result;
  }

  async cleanupProcessedQueue() {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.notificationQueue.deleteMany({
      where: {
        sent: true,
        sentAt: {
          lt: twoWeeksAgo,
        },
      },
    });

    return result;
  }
}
