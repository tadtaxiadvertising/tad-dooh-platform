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
        status: import(".prisma/client").$Enums.SystemStatus;
        taxiNumber: string;
        lastLat: number;
        lastLng: number;
        isOnline: boolean;
        lastSeen: Date;
    }[]>;
    getCampaignsStatus(): Promise<{
        advertiser: string;
        name: string;
        id: string;
        targetImpressions: number;
        metrics: {
            deviceId: string | null;
            id: bigint;
            createdAt: Date;
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
