import { PrismaService } from '../prisma/prisma.service';
export declare class TelemetryService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private playbackRateMap;
    checkPlaybackRateLimit(deviceId: string, additionalCount?: number): boolean;
    validateDevice(deviceId: string): Promise<boolean>;
    validateTabletKey(deviceId: string, tabletKey: string): Promise<boolean>;
    validateVideo(videoId: string): Promise<boolean>;
    sync(data: any[]): Promise<void>;
    recordPlayback(data: {
        deviceId: string;
        videoId: string;
        eventType: 'START' | 'END' | 'ERROR';
        lat?: number;
        lng?: number;
        verified?: boolean;
        clientTimestamp?: string;
    }): Promise<{
        id: string;
        deviceId: string;
        isSimulated: boolean;
        timestamp: Date;
        eventType: string;
        videoId: string;
        lat: number | null;
        lng: number | null;
        verified: boolean;
    } | {
        success: boolean;
        duplicate: boolean;
        verified?: undefined;
    } | {
        success: boolean;
        verified: boolean;
        duplicate?: undefined;
    }>;
    recordPlaybackBatch(events: any[]): Promise<{
        processed: number;
        rejected: number;
    }>;
}
