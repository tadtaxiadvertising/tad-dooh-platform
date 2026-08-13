import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
export declare class NotificationsService {
    private readonly prisma;
    private readonly supabaseService;
    private readonly logger;
    constructor(prisma: PrismaService, supabaseService: SupabaseService);
    createAlert(data: {
        title: string;
        message: string;
        type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
        category: 'SYSTEM' | 'DEVICE' | 'CAMPAIGN' | 'FINANCE';
        entityId?: string;
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
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    sendPush(driverId: string, message: string): Promise<void>;
    executePushDelivery(driverId: string, message: string): Promise<{
        entityId: string | null;
        id: string;
        createdAt: Date;
        category: string;
        type: string;
        message: string;
        title: string;
        read: boolean;
    }>;
    sendDriverNotification(driverId: string, type: string, payload: Record<string, unknown>): Promise<void>;
}
