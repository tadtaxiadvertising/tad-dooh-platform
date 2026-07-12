import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    private initializeSreViews;
    private splitSqlStatements;
    onModuleDestroy(): Promise<void>;
    refreshActiveCampaignsView(): Promise<void>;
    getHealthMetrics(): Promise<{
        connected: boolean;
        activeConnections?: number;
    }>;
}
