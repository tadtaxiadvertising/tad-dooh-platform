import { TelemetryService } from './telemetry.service';
export declare class TelemetryController {
    private readonly telemetryService;
    constructor(telemetryService: TelemetryService);
    sync(payload: {
        driverId: string;
        lat: number;
        lng: number;
        speed: number;
        timestamp?: string;
    }[]): Promise<{
        success: boolean;
    }>;
    recordPlayback(payload: {
        deviceId: string;
        videoId: string;
        eventType: 'START' | 'END' | 'ERROR';
        lat?: number;
        lng?: number;
    }): Promise<{
        id: string;
        deviceId: string;
        isSimulated: boolean;
        timestamp: Date;
        lat: number | null;
        lng: number | null;
        eventType: string;
        videoId: string;
    }>;
}
