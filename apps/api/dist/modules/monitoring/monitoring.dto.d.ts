export declare class GpsPointDto {
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: string;
    lat?: number;
    lng?: number;
}
export declare class GpsBatchDto {
    deviceId: string;
    driverId: string;
    points?: GpsPointDto[];
    locations?: GpsPointDto[];
}
