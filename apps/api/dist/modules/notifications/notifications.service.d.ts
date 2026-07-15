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
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        category: string;
        title: string;
        entityId: string | null;
        read: boolean;
    }>;
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
    markAllAsRead(): Promise<import(".prisma/client").Prisma.BatchPayload>;
    sendPush(driverId: string, message: string): Promise<void>;
    executePushDelivery(driverId: string, message: string): Promise<{
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        category: string;
        title: string;
        entityId: string | null;
        read: boolean;
    }>;
    sendDriverNotification(driverId: string, type: string, payload: Record<string, unknown>): Promise<void>;
}
