import { TelemetryService } from './telemetry.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class TelemetryController {
    private readonly telemetryService;
    private readonly prisma;
    private readonly logger;
    constructor(telemetryService: TelemetryService, prisma: PrismaService);
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
        clientTimestamp?: string;
    }, tabletKey?: string): Promise<{
        id: string;
        deviceId: string;
        eventType: string;
        videoId: string;
        lat: number | null;
        lng: number | null;
        timestamp: Date;
        isSimulated: boolean;
        verified: boolean;
    } | {
        success: boolean;
        duplicate: boolean;
        verified?: undefined;
    } | {
        success: boolean;
        verified: boolean;
        duplicate?: undefined;
    } | {
        success: boolean;
        reason: string;
        message: string;
    }>;
    recordPlaybackBatch(payload: {
        deviceId: string;
        videoId: string;
        eventType: 'START' | 'END' | 'ERROR';
        lat?: number;
        lng?: number;
        clientTimestamp?: string;
    }[], tabletKey?: string): Promise<{
        success: boolean;
        reason: string;
        message?: undefined;
        processed?: undefined;
        rejected?: undefined;
    } | {
        success: boolean;
        reason: string;
        message: string;
        processed?: undefined;
        rejected?: undefined;
    } | {
        success: boolean;
        processed: number;
        rejected: number;
        reason?: undefined;
        message?: undefined;
    }>;
}
