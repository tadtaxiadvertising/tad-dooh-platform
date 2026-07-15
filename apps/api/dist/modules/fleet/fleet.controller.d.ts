import { FleetService } from './fleet.service';
import { TrackBatchDto } from './dto/track-batch.dto';
export declare class FleetController {
    private readonly fleetService;
    constructor(fleetService: FleetService);
    getFleetDevices(): Promise<{
        id: string;
        device_id: string;
        status: string;
        last_seen: Date;
        battery_level: number;
        player_status: string;
        storage_free: string;
        storage_used: number;
        storage_total: number;
        is_online: boolean;
        driver_name: string;
        last_playback: Date;
        deviceId: string;
        city: string;
        taxiNumber: string;
        lastHeartbeat: Date;
        batteryLevel: number;
        storageUsed: bigint;
        storageTotal: bigint;
        appVersion: string;
        fleet: string;
        lastSeen: Date;
        storageFree: string;
        lastPlayback: Date;
        playerStatus: string;
        driver: {
            id: string;
            fullName: string;
        };
    }[]>;
    getFleetStats(): Promise<{
        total: number;
        online: number;
        offline: number;
        withErrors: number;
    }>;
    getFleetStatusSummary(): Promise<{
        id: string;
        device_id: string;
        deviceId: string;
        taxi_number: string;
        status: string;
        is_online: boolean;
        battery_level: number;
        occupied_slots: number;
        available_slots: number;
        max_slots: number;
        player_status: string;
        last_seen: Date;
        city: string;
        driver: {
            id: string;
            fullName: string;
            subscriptionPaid: boolean;
        };
        driver_id: string;
        driver_name: string;
        subscription_status: string;
    }[]>;
    getFleetSummary(): Promise<{
        id: string;
        device_id: string;
        deviceId: string;
        taxi_number: string;
        status: string;
        is_online: boolean;
        battery_level: number;
        occupied_slots: number;
        available_slots: number;
        max_slots: number;
        player_status: string;
        last_seen: Date;
        city: string;
        driver: {
            id: string;
            fullName: string;
            subscriptionPaid: boolean;
        };
        driver_id: string;
        driver_name: string;
        subscription_status: string;
    }[]>;
    getFleetMap(req: any): Promise<{
        driverId: string;
        deviceId: string;
        taxiNumber: string;
        city: string;
        lastSeen: Date;
        lastLat: number;
        lastLng: number;
        lat: number;
        lng: number;
        status: import(".prisma/client").$Enums.SystemStatus;
        isOnline: boolean;
        driverName: string;
        phone: string;
        plate: string;
        subscriptionStatus: string;
        subscriptionEnd: Date;
        driverStatus: import(".prisma/client").$Enums.SystemStatus;
        batteryLevel: number;
        speed: number;
    }[]>;
    getTrackingBaseline(req: any): Promise<{
        driverId: string;
        deviceId: string;
        taxiNumber: string;
        city: string;
        lastSeen: Date;
        lastLat: number;
        lastLng: number;
        lat: number;
        lng: number;
        status: import(".prisma/client").$Enums.SystemStatus;
        isOnline: boolean;
        driverName: string;
        phone: string;
        plate: string;
        subscriptionStatus: string;
        subscriptionEnd: Date;
        driverStatus: import(".prisma/client").$Enums.SystemStatus;
        batteryLevel: number;
        speed: number;
    }[]>;
    getOfflineDevices(): Promise<{
        deviceId: string;
        taxiNumber: string;
        lastSeen: Date;
    }[]>;
    getFleetFinance(): Promise<{
        period: string;
        rate_per_ad: number;
        total_revenue: number;
        total_ads_played: number;
        devices: {
            device_id: string;
            display_name: string;
            city: string;
            status: string;
            ads_played: number;
            revenue: number;
            driver: {
                name: string;
                phone: string;
                status: import(".prisma/client").$Enums.SystemStatus;
            };
            subscription: {
                plan: string;
                amount: number;
                status: string;
                paid: boolean;
                expiresAt: Date;
            };
        }[];
    }>;
    sendFleetCommand(deviceId: string, body: {
        type: string;
        params?: any;
    }): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        result: string | null;
        deviceId: string;
        commandType: string;
        commandParams: string | null;
        executedAt: Date | null;
    }>;
    broadcastFleetCommand(body: {
        type: string;
        params?: any;
    }): Promise<{
        success: boolean;
        broadcastType: string;
        deviceCount: number;
    }>;
    registerDevice(body: {
        placa: string;
        driverName: string;
        deviceId?: string;
    }): Promise<{
        success: boolean;
        device_id: string;
        driver_name: string;
        linked: boolean;
        linked_driver?: undefined;
        new_registration?: undefined;
    } | {
        success: boolean;
        device_id: string;
        driver_name: string;
        linked_driver: boolean;
        linked?: undefined;
        new_registration?: undefined;
    } | {
        success: boolean;
        device_id: string;
        driver_name: string;
        new_registration: boolean;
        linked?: undefined;
        linked_driver?: undefined;
    }>;
    getDeviceRecentPath(deviceId: string): Promise<{
        timestamp: Date;
        latitude: number;
        longitude: number;
        speed: number;
    }[]>;
    getTrackingData(): Promise<{
        id: string;
        latitude: number;
        longitude: number;
        speed: number;
        timestamp: Date;
        driver: {
            id: string;
            name: string;
            phone: string;
            taxiNumber: string;
            plate: string;
            status: import(".prisma/client").$Enums.SystemStatus;
            subscriptionPaid: boolean;
        };
        device: {
            deviceId: string;
            taxiNumber: string;
            city: string;
            status: import(".prisma/client").$Enums.SystemStatus;
            batteryLevel: number;
            lastSeen: Date;
        };
    }[]>;
    getTrackingSummary(req: any): Promise<{
        driverId: string;
        driverName: string;
        phone: string;
        taxiNumber: string;
        plate: string;
        status: import(".prisma/client").$Enums.SystemStatus;
        subscriptionPaid: boolean;
        devicesCount: number;
        device: {
            deviceId: string;
            taxiNumber: string;
            city: string;
            batteryLevel: number;
            lastSeen: Date;
        };
        tracking: {
            isActive: boolean;
            pointsToday: number;
            totalPoints: number;
            avgSpeedToday: number;
            lastPosition: {
                lat: number;
                lng: number;
                speed: number;
                timestamp: Date;
            };
        };
    }[]>;
    trackBatch(data: TrackBatchDto): Promise<{
        count: number;
        input?: undefined;
    } | {
        count: number;
        input: number;
    }>;
}
