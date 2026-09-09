import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { SyncDeviceDto } from './dto/sync-device.dto';
import { BulkSyncDto } from './dto/bulk-sync.dto';
export declare class DeviceController {
    private readonly deviceService;
    constructor(deviceService: DeviceService);
    register(dto: RegisterDeviceDto): Promise<{
        success: boolean;
        device_id: string;
    }>;
    heartbeat(dto: HeartbeatDto): Promise<{
        success: boolean;
    }>;
    playback(dto: PlaybackConfirmationDto): Promise<{
        success: boolean;
    }>;
    sync(dto: SyncDeviceDto): Promise<{
        blocked: boolean;
        reason: string;
        media_assets: any[];
        update?: undefined;
        sync_hash?: undefined;
        licenseToken?: undefined;
        expiresAt?: undefined;
        campaign_version?: undefined;
        videos?: undefined;
        commands?: undefined;
    } | {
        blocked: true;
        reason: any;
        media_assets?: undefined;
        update?: undefined;
        sync_hash?: undefined;
        licenseToken?: undefined;
        expiresAt?: undefined;
        campaign_version?: undefined;
        videos?: undefined;
        commands?: undefined;
    } | {
        update: boolean;
        blocked: boolean;
        sync_hash: string;
        reason?: undefined;
        media_assets?: undefined;
        licenseToken?: undefined;
        expiresAt?: undefined;
        campaign_version?: undefined;
        videos?: undefined;
        commands?: undefined;
    } | {
        update: boolean;
        blocked: boolean;
        media_assets: any[];
        sync_hash: string;
        reason?: undefined;
        licenseToken?: undefined;
        expiresAt?: undefined;
        campaign_version?: undefined;
        videos?: undefined;
        commands?: undefined;
    } | {
        update: boolean;
        blocked: boolean;
        licenseToken: string;
        expiresAt: string;
        sync_hash: string;
        campaign_version: any;
        media_assets: any[];
        videos: any[];
        commands: {
            id: string;
            type: string;
            params: any;
        }[];
        reason?: undefined;
    }>;
    bulkSync(dto: BulkSyncDto): Promise<{
        success: boolean;
        reason: string;
        processedPlaybacks?: undefined;
        processedLocations?: undefined;
    } | {
        success: boolean;
        processedPlaybacks: number;
        processedLocations: number;
        reason?: undefined;
    }>;
    checkSlots(deviceId: string): Promise<{
        device_id: string;
        max_slots: number;
        assigned_slots: number;
        available_slots: number;
        usage_percentage: number;
    }>;
    acknowledgeCommand(commandId: string, result: any, req: any): Promise<{
        result: string | null;
        id: string;
        createdAt: Date;
        status: string;
        deviceId: string;
        commandType: string;
        commandParams: string | null;
        expiresAt: Date | null;
        executedAt: Date | null;
    }>;
}
