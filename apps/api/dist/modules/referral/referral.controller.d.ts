import { ReferralService } from './referral.service';
export declare class ReferralController {
    private readonly referralService;
    constructor(referralService: ReferralService);
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
        status: import(".prisma/client").$Enums.SystemStatus;
        createdAt: Date;
        fullName: string;
        referredBy: string;
        referredByDriver: {
            fullName: string;
        };
    }[]>;
}
