import { Controller, Get, Param } from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Roles(UserRole.ADMIN)
@Controller("referral")
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get("generate/:driverId")
  async generate(@Param("driverId") driverId: string) {
    return this.referralService.generate(driverId);
  }

  @Get("stats")
  async getStats() {
    return this.referralService.getStats();
  }

  @Get("network")
  async getNetwork() {
    return this.referralService.getNetwork();
  }
}
