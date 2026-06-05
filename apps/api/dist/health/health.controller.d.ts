import { PrismaService } from '../modules/prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    check(): {
        status: string;
        timestamp: string;
        service: string;
        node_env: string;
    };
    dbMetrics(): Promise<{
        connected: boolean;
        activeConnections?: number;
    }>;
}
