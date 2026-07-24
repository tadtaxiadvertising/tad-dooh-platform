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
        status: import(".prisma/client").$Enums.SystemStatus;
        deviceId: string;
        taxiNumber: string;
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
            status: import(".prisma/client").$Enums.SystemStatus;
            deviceId: string;
            taxiNumber: string;
            lastLat: number;
            lastLng: number;
            isOnline: boolean;
            lastSeen: Date;
            driver: {
                phone: string;
                fullName: string;
                subscriptionPaid: boolean;
            };
        }[];
    }>;
    getActiveCampaignsStatus(): Promise<{
        name: string;
        id: string;
        advertiser: string;
        targetImpressions: number;
        metrics: {
            id: bigint;
            createdAt: Date;
            campaignId: string;
            totalImpressions: number;
            totalCompletions: number;
            totalErrors: number;
            uniqueDevices: number;
            avgCompletionRate: number | null;
            deviceId: string | null;
            date: Date;
            city: string | null;
        }[];
    }[]>;
    checkOfflineDevices(): Promise<void>;
    dataRetentionCleanup(): Promise<void>;
}
