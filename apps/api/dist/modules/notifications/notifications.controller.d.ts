import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        entityId: string | null;
        title: string;
        read: boolean;
    }[]>;
    getUnreadCount(): Promise<number>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAsRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        entityId: string | null;
        title: string;
        read: boolean;
    }>;
    createTestAlert(body: {
        title: string;
        message: string;
        type: any;
        category: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        entityId: string | null;
        title: string;
        read: boolean;
    }>;
}
