import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(): Promise<{
        category: string;
        id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        entityId: string | null;
        createdAt: Date;
    }[]>;
    getUnreadCount(): Promise<number>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAsRead(id: string): Promise<{
        category: string;
        id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        entityId: string | null;
        createdAt: Date;
    }>;
    createTestAlert(body: {
        title: string;
        message: string;
        type: any;
        category: any;
    }): Promise<{
        category: string;
        id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        entityId: string | null;
        createdAt: Date;
    }>;
}
