import { PrismaService } from '../prisma/prisma.service';
export declare class ReferralService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    generate(driverId: string): Promise<{
        driverId: string;
        referralCode: string;
        url: string;
        qrPayload: string;
    }>;
    getStats(): Promise<{
        topRecruiters: {
            id: string;
            fullName: string;
            referralCode: string;
            _count: {
                referrals: number;
            };
        }[];
        totalReferrals: number;
        pendingCommissions: number;
    }>;
    getNetwork(): Promise<{
        id: string;
        fullName: string;
        status: import(".prisma/client").$Enums.SystemStatus;
        createdAt: Date;
        referredBy: string;
        referredByDriver: {
            fullName: string;
        };
    }[]>;
}
