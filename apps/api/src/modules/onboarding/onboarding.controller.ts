// apps/api/src/modules/onboarding/onboarding.controller.ts
import { Controller, Post, Body, Param } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { Public } from "../auth/decorators/public.decorator";

import { OnboardAdvertiserDto } from "./dto/onboard-advertiser.dto";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post("advertiser")
  async onboard(@Body() data: OnboardAdvertiserDto) {
    return this.onboardingService.onboardAdvertiser(data);
  }

  @Public()
  @Post("advertiser/:id/complete")
  async complete(@Param("id") id: string) {
    return this.onboardingService.completeOnboarding(id);
  }
}
