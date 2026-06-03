import { SyncService } from './sync.service';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    getDeviceManifest(deviceId: string): Promise<{
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
    }>;
}
