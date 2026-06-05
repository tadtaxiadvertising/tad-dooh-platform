import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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
        reference: string;
    }>;
    updateBank(driverId: string, bankData: any): Promise<{
        success: boolean;
        bankAccount: Prisma.JsonValue;
    }>;
    private logFinancialAnomaly;
}
