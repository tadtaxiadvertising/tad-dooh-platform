import { SyncService } from './sync.service';
import { Response } from 'express';
export declare class SyncController {
    private readonly syncService;
    private readonly etagCache;
    private readonly ttlMs;
    constructor(syncService: SyncService);
    private resolveCachedEtag;
    private cacheEtag;
    getDeviceManifest(deviceId: string, ifNoneMatch: string, res: Response): Promise<{
        timestamp: string;
        expiresAt: string;
        etag: string;
        killSwitch: boolean;
        killSwitchReason: string;
        licenseToken: string;
        device: {
            id: string;
            deviceId: string;
            taxi: string;
        };
        count: number;
        playlist: any[];
        schedules?: undefined;
    } | {
        timestamp: string;
        expiresAt: string;
        etag: string;
        licenseToken: string;
        device: {
            id: string;
            deviceId: string;
            taxi: string;
        };
        count: number;
        playlist: any[];
        schedules: {
            campaignId: string;
            scheduleDays: string[];
            scheduleHours: string[];
            frequencyCap: number;
        }[];
        killSwitch?: undefined;
        killSwitchReason?: undefined;
    }>;
}
