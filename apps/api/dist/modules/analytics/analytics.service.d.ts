import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly notifications;
    private readonly logger;
    private cache;
    private deviceExistsCache;
    private readonly CACHE_TTL;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    clearCache(): void;
    ingestEvent(dto: IngestEventDto): Promise<{
        id: string;
        isSimulated: boolean;
        campaignId: string | null;
        deviceId: string;
        eventType: string;
        lat: number | null;
        lng: number | null;
        timestamp: Date;
        processed: boolean;
        mediaId: string | null;
        eventData: string | null;
        occurredAt: Date;
        receivedAt: Date;
    }>;
    ingestBatchEvents(dtos: IngestEventDto[]): Promise<{
        count: number;
    }>;
    getCampaignAnalytics(campaignId: string): Promise<{
        campaignId: string;
        totalEvents: number;
    }>;
    getDeviceAnalytics(deviceId: string): Promise<{
        deviceId: string;
        totalEvents: number;
    }>;
    getAnalyticsSummary(advertiserId?: string): Promise<any>;
    private getAdvertiserVideoIds;
    getTotalImpressions(advertiserId?: string): Promise<any>;
    getAntiFraudMetrics(advertiserId?: string): Promise<any>;
    getTopTaxis(advertiserId?: string): Promise<any>;
    getHourlyAnalytics(advertiserId?: string): Promise<{
        hour: string;
        plays: number;
    }[]>;
    getRecentPlays(advertiserId?: string): Promise<{
        deviceId: string;
        videoId: string;
        timestamp: Date;
        taxiNumber: string;
    }[]>;
    getPlaybackHeatmap(advertiserId?: string): Promise<{
        lat: number;
        lng: number;
        weight: number;
    }[]>;
    registerQrScan(campaignId: string, deviceId: string): Promise<string>;
    updateDeviceLocationFromMobile(data: {
        deviceId: string;
        lat: number;
        lng: number;
        speed?: number;
    }): Promise<{
        id: string;
        taxiNumber: string | null;
        status: import(".prisma/client").$Enums.SystemStatus;
        createdAt: Date;
        updatedAt: Date;
        isSimulated: boolean;
        name: string | null;
        fleet: string | null;
        deviceId: string;
        city: string | null;
        lastSync: Date | null;
        lastHeartbeat: Date | null;
        batteryLevel: number | null;
        lastLat: number | null;
        lastLng: number | null;
        isOnline: boolean;
        storageUsed: bigint | null;
        storageTotal: bigint | null;
        appVersion: string | null;
        authToken: string | null;
        lastSeen: Date | null;
        storageFree: string | null;
        lastPlayback: Date | null;
        playerStatus: string | null;
        lastSyncHash: string | null;
        lastSyncAt: Date | null;
        lastOnline: Date | null;
        lastSyncSuccess: boolean | null;
        driverId: string | null;
        connectivityStatus: string;
    }>;
    getWeeklyCampaignMetrics(campaignId: string): Promise<{
        day: string;
        impressions: number;
        scans: number;
        ctr: number;
    }[]>;
    getExternalWebStats(websiteId: string): Promise<any>;
}
export interface AnalyticsSummary {
    totalImpressions: number;
    activeNodes: number;
    totalScans: number;
    ctr: number;
    hourlyAverage: number;
}
export interface TopTaxi {
    device_id: string;
    plays: number;
}
export interface HourlyData {
    hour: string;
    plays: number;
}
export interface AntiFraudData {
    rawImpressions: number;
    gpsValidations: number;
    validPercentage: number;
    status: string;
}
export interface IngestEventDto {
    deviceId: string;
    campaignId?: string;
    eventType: string;
    type?: string;
    timestamp?: string | Date;
    occurredAt?: string | Date;
    lat?: number;
    lng?: number;
}
