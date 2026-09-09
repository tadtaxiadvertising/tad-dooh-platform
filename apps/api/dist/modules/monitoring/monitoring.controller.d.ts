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
        taxiNumber: string;
        deviceId: string;
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
            createdAt: Date;
            deviceId: string | null;
            city: string | null;
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
