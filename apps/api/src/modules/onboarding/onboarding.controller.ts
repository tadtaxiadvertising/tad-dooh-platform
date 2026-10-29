// apps/api/src/modules/onboarding/onboarding.controller.ts
import { Controller, Post, Body, Param, UseGuards } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

import { OnboardAdvertiserDto } from "./dto/onboard-advertiser.dto";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post("advertiser")
  async onboard(@Body() data: OnboardAdvertiserDto) {
    return this.onboardingService.onboardAdvertiser(data);
  }

  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  @Post("advertiser/:id/complete")
  async complete(@Param("id") id: string) {
    return this.onboardingService.completeOnboarding(id);
  }
}
