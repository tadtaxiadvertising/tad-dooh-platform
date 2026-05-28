import { PrismaService } from '../prisma/prisma.service';
export declare class PayrollAuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    runMonthlyAudit(): Promise<void>;
    applyPenaltyLogic(driverId: string, amount: number): Promise<{
        amount: number;
        penaltyApplied: boolean;
        penaltyAmount: number;
    }>;
}
