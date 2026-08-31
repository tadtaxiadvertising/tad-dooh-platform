import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { GpsBatchDto } from './monitoring.dto';
export declare class MonitoringService {
    private readonly prisma;
    private readonly whatsapp;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, whatsapp: WhatsAppService, notifications: NotificationsService);
    onModuleInit(): Promise<void>;
    processGpsBatch(batch: GpsBatchDto): Promise<{
        status: string;
        reason: string;
        processedPoints?: undefined;
        timestamp?: undefined;
    } | {
        status: string;
        processedPoints: number;
        timestamp: string;
        reason?: undefined;
    }>;
    getFleetStatus(): Promise<{
        deviceId: string;
        taxiNumber: string;
        status: import(".prisma/client").$Enums.SystemStatus;
        lastLat: number;
        lastLng: number;
        isOnline: boolean;
        lastSeen: Date;
    }[]>;
    getPilotFleetStatus(): Promise<{
        summary: {
            total: number;
            online: number;
            offline: number;
            healthPercentage: number;
        };
        devices: {
            deviceId: string;
            taxiNumber: string;
            status: import(".prisma/client").$Enums.SystemStatus;
            lastLat: number;
            lastLng: number;
            isOnline: boolean;
            lastSeen: Date;
            driver: {
                fullName: string;
                phone: string;
                subscriptionPaid: boolean;
            };
        }[];
    }>;
    getActiveCampaignsStatus(): Promise<{
        id: string;
        name: string;
        advertiser: string;
        targetImpressions: number;
        metrics: {
            id: bigint;
            deviceId: string | null;
            city: string | null;
            createdAt: Date;
            campaignId: string;
            totalImpressions: number;
            date: Date;
            totalCompletions: number;
            totalErrors: number;
            uniqueDevices: number;
            avgCompletionRate: number | null;
        }[];
    }[]>;
    checkOfflineDevices(): Promise<void>;
    dataRetentionCleanup(): Promise<void>;
}
