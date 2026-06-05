import { BiService } from './bi.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class BiScheduler {
    private readonly biService;
    private readonly prisma;
    private readonly logger;
    constructor(biService: BiService, prisma: PrismaService);
    handleDailySnapshot(): Promise<void>;
    handleReconciliation(): Promise<void>;
    handleIdempotencyCleanup(): Promise<void>;
}
