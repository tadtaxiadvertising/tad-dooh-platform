import { PrismaService } from '../prisma/prisma.service';
export declare class TelemetryService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sync(data: any[]): Promise<void>;
    recordPlayback(data: {
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
