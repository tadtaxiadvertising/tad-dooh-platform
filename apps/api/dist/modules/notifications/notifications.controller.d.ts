import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(): Promise<{
        entityId: string | null;
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        title: string;
        read: boolean;
    }[]>;
    getUnreadCount(): Promise<number>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAsRead(id: string): Promise<{
        entityId: string | null;
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        title: string;
        read: boolean;
    }>;
    createTestAlert(body: {
        title: string;
        message: string;
        type: any;
        category: any;
    }): Promise<{
        entityId: string | null;
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        title: string;
        read: boolean;
    }>;
}
