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
            _count: {
                referrals: number;
            };
            fullName: string;
            referralCode: string;
        }[];
        totalReferrals: number;
        pendingCommissions: number;
    }>;
    getNetwork(): Promise<{
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SystemStatus;
        fullName: string;
        referredBy: string;
        referredByDriver: {
            fullName: string;
        };
    }[]>;
}
