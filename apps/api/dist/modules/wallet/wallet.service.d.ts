import { PrismaService } from '../prisma/prisma.service';
export declare class WalletService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getBalance(driverId: string): Promise<{
        driverId: string;
        adsEarnings: number;
        cpaEarnings: number;
        referralEarnings: number;
        totalEarnings: number;
        walletBalance: number;
    }>;
    withdraw(driverId: string, amount: number): Promise<{
        success: boolean;
        newBalance: number;
        transactionId: string;
    }>;
    updateBank(driverId: string, bankData: any): Promise<{
        success: boolean;
        bankAccount: import("@prisma/client/runtime/library").JsonValue;
    }>;
    private logFinancialAnomaly;
}
