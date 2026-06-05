import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        message: string;
        title: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }[]>;
    getUnreadCount(): Promise<number>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAsRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        message: string;
        title: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }>;
    createTestAlert(body: {
        title: string;
        message: string;
        type: any;
        category: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        message: string;
        title: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }>;
}
