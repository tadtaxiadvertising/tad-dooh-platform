declare class GPSPointDto {
    lat: number;
    lng: number;
    speed: number;
    timestamp: number;
}
export declare class TrackBatchDto {
    driverId: string;
    deviceId: string;
    points: GPSPointDto[];
}
export {};
