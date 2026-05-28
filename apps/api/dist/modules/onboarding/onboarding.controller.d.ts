import { OnboardingService } from './onboarding.service';
import { OnboardAdvertiserDto } from './dto/onboard-advertiser.dto';
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    onboard(data: OnboardAdvertiserDto): Promise<{
        advertiserId: string;
        campaignId: string;
        companyName: string;
    }>;
}
