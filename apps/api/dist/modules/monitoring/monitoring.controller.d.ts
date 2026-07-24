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
        status: import(".prisma/client").$Enums.SystemStatus;
        deviceId: string;
        taxiNumber: string;
        lastLat: number;
        lastLng: number;
        isOnline: boolean;
        lastSeen: Date;
    }[]>;
    getCampaignsStatus(): Promise<{
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
}
