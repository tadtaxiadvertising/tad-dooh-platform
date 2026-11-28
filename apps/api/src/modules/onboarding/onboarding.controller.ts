// apps/api/src/modules/onboarding/onboarding.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  ForbiddenException,
  UseGuards,
  Req,
} from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";
import { AllowAdvertiserStatuses } from "../auth/decorators/advertiser-status.decorator";

import { OnboardAdvertiserDto } from "./dto/onboard-advertiser.dto";
import { OnboardAdvertiserQuoteDto } from "./dto/onboard-advertiser-quote.dto";
import { CompleteOAuthAdvertiserProfileDto } from "./dto/complete-oauth-advertiser-profile.dto";
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
  async onboard(
    @Body() data: OnboardAdvertiserDto,
    @Headers("idempotency-key") attemptKey?: string,
  ) {
    return this.onboardingService.onboardAdvertiser(data, attemptKey);
  }

  /**
   * Completes only the logged-in OAuth user's EXISTING advertiser profile.
   * Never accepts advertiserId, status, approval or payment details from client.
   */
  @Roles(UserRole.ADVERTISER)
  @AllowAdvertiserStatuses("PENDING_ONBOARDING", "PENDING_REVIEW")
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @Post("advertiser/oauth/profile")
  async completeOAuthProfile(
    @Req()
    request: {
      user?: { role?: string; entityId?: string | null; email?: string };
    },
    @Body() data: CompleteOAuthAdvertiserProfileDto,
  ) {
    return this.onboardingService.completeOAuthAdvertiserProfile(
      request.user || {},
      data,
    );
  }

  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  @Post("advertiser/:id/complete")
  async complete(): Promise<never> {
    throw new ForbiddenException("La activación requiere revisión autorizada.");
  }
}
