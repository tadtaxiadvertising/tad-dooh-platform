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
        category: string;
        id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        entityId: string | null;
        createdAt: Date;
    }>;
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
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    sendPush(driverId: string, message: string): Promise<void>;
    executePushDelivery(driverId: string, message: string): Promise<{
        category: string;
        id: string;
        title: string;
        message: string;
        type: string;
        read: boolean;
        entityId: string | null;
        createdAt: Date;
    }>;
    sendDriverNotification(driverId: string, type: string, payload: Record<string, unknown>): Promise<void>;
}
