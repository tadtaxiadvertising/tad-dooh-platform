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
