import { PrismaService } from '../prisma/prisma.service';
import { OnboardAdvertiserDto } from './dto/onboard-advertiser.dto';
export declare class OnboardingService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onboardAdvertiser(data: OnboardAdvertiserDto): Promise<{
        advertiserId: string;
        campaignId: string;
        companyName: string;
    }>;
}
