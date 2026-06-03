import { WalletService } from './wallet.service';
import { z } from 'zod';
export declare const BankInfoSchema: z.ZodObject<{
    banco: z.ZodString;
    cuenta: z.ZodString;
    tipo: z.ZodEnum<["AHORRO", "CORRIENTE"]>;
    cedula: z.ZodString;
    ownerName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cedula?: string;
    banco?: string;
    cuenta?: string;
    tipo?: "AHORRO" | "CORRIENTE";
    ownerName?: string;
}, {
    cedula?: string;
    banco?: string;
    cuenta?: string;
    tipo?: "AHORRO" | "CORRIENTE";
    ownerName?: string;
}>;
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getBalance(req: any): Promise<{
        driverId: string;
        adsEarnings: number;
        cpaEarnings: number;
        referralEarnings: number;
        totalEarnings: number;
        walletBalance: number;
    }>;
    withdraw(req: any, payload: any): Promise<{
        success: boolean;
        newBalance: number;
        transactionId: string;
    }>;
    updateBank(req: any, payload: any): Promise<{
        success: boolean;
        bankAccount: import("@prisma/client/runtime/library").JsonValue;
    }>;
    private extractDriverId;
}
