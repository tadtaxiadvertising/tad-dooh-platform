import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class SyncService {
    private prisma;
    private notifications;
    private readonly logger;
    private readonly JWT_SECRET;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    getDeviceManifest(deviceId: string): Promise<{
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
        killSwitch?: undefined;
        killSwitchReason?: undefined;
    }>;
    refreshManifestView(): Promise<void>;
}
