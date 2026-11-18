// apps/api/src/modules/onboarding/onboarding.controller.ts
import {
  Controller,
  Post,
  Body,
  ForbiddenException,
  UseGuards,
} from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

import { OnboardAdvertiserDto } from "./dto/onboard-advertiser.dto";
import { OnboardAdvertiserQuoteDto } from "./dto/onboard-advertiser-quote.dto";
import { Throttle } from "@nestjs/throttler";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * Read-only public quote. The server alone resolves referral eligibility;
   * no caller-supplied discount or driver identity is accepted.
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post("advertiser/quote")
  async quote(@Body() data: OnboardAdvertiserQuoteDto) {
    return this.onboardingService.quoteAdvertiser(data);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post("advertiser")
  async onboard(@Body() data: OnboardAdvertiserDto) {
    return this.onboardingService.onboardAdvertiser(data);
  }

  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  @Post("advertiser/:id/complete")
  async complete(): Promise<never> {
    throw new ForbiddenException("La activación requiere revisión autorizada.");
  }
}
