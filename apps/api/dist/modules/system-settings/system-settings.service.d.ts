import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class SystemSettingsService implements OnModuleInit {
    private prisma;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    getAll(): Promise<Record<string, any>>;
    updateMany(settings: Record<string, any>): Promise<Record<string, any>>;
    private seedDefaults;
    getDriverAppVersion(): Promise<{
        latestVersion: string;
        minVersion: string;
        forceUpdate: boolean;
        downloadUrl: string;
        releaseNotes: string;
    }>;
}
