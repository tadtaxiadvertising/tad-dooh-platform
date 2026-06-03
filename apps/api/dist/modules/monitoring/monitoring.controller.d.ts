import { MonitoringService } from './monitoring.service';
import { GpsBatchDto } from './monitoring.dto';
export declare class MonitoringController {
    private readonly monitoringService;
    private readonly logger;
    constructor(monitoringService: MonitoringService);
    saveGpsBatch(batch: GpsBatchDto): Promise<{
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
    getCampaignsStatus(): Promise<{
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
            date: Date;
            totalImpressions: number;
            totalCompletions: number;
            totalErrors: number;
            uniqueDevices: number;
            avgCompletionRate: number | null;
        }[];
    }[]>;
}
