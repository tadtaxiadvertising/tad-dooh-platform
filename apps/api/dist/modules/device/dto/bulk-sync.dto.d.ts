export declare class BulkPlaybackDto {
    video_id: string;
    timestamp: string;
    lat?: number;
    lng?: number;
    isSimulated?: boolean;
}
export declare class BulkLocationDto {
    lat: number;
    lng: number;
    timestamp: string;
    isSimulated?: boolean;
}
export declare class BulkSyncDto {
    device_id: string;
    battery_level?: number;
    storage_free?: string;
    playbacks: BulkPlaybackDto[];
    locations: BulkLocationDto[];
    isSimulated?: boolean;
}
