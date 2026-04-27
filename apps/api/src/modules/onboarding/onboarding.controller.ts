// apps/api/src/modules/onboarding/onboarding.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { Public } from '../auth/decorators/public.decorator';

import { OnboardAdvertiserDto } from './dto/onboard-advertiser.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post('advertiser')
  async onboard(@Body() data: OnboardAdvertiserDto) {
    return this.onboardingService.onboardAdvertiser(data);
  }
}
