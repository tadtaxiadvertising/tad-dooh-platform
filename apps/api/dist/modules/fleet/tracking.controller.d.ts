import { FleetService } from './fleet.service';
export declare class TrackingController {
    private readonly fleetService;
    constructor(fleetService: FleetService);
    getBaseline(req: any): Promise<{
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
}
