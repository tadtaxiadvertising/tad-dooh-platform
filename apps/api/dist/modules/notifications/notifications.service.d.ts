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
        id: string;
        createdAt: Date;
        type: string;
        title: string;
        message: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }>;
    findAll(): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        title: string;
        message: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }[]>;
    getUnreadCount(): Promise<number>;
    markAsRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        title: string;
        message: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }>;
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    sendPush(driverId: string, message: string): Promise<void>;
    executePushDelivery(driverId: string, message: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        title: string;
        message: string;
        category: string;
        read: boolean;
        entityId: string | null;
    }>;
    sendDriverNotification(driverId: string, type: string, payload: Record<string, unknown>): Promise<void>;
}
