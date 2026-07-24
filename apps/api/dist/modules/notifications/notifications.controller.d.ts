import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(): Promise<{
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        category: string;
        title: string;
        entityId: string | null;
        read: boolean;
    }[]>;
    getUnreadCount(): Promise<number>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAsRead(id: string): Promise<{
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        category: string;
        title: string;
        entityId: string | null;
        read: boolean;
    }>;
    createTestAlert(body: {
        title: string;
        message: string;
        type: any;
        category: any;
    }): Promise<{
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        category: string;
        title: string;
        entityId: string | null;
        read: boolean;
    }>;
}
