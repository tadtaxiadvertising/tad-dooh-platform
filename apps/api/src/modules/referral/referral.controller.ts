import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { ReferralService } from "./referral.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthUser } from "../auth/auth.types";

@Controller("referral")
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // Admin endpoints (keep existing behavior)
  @Roles(UserRole.ADMIN)
  @Get("generate/:driverId")
  async generate(@Param("driverId") driverId: string) {
    return this.referralService.generate(driverId);
  }

  @Roles(UserRole.ADMIN)
  @Get("stats")
  async getStats() {
    return this.referralService.getStats();
  }

  @Roles(UserRole.ADMIN)
  @Get("network")
  async getNetwork() {
    return this.referralService.getNetwork();
  }

  // Driver self-service: obtener su propio código real + URL + QR payload
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.DRIVER)
  @Get("me")
  async getMyCode(@Req() req: { user?: AuthUser }) {
    const entityId = req?.user?.entityId;
    if (!entityId) {
      throw new ForbiddenException(
        "Perfil de conductor no asociado a la sesión",
      );
    }
    return this.referralService.getMyCode(entityId);
  }

  // Driver self-service: obtener lista de anunciantes referidos por este driver
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.DRIVER)
  @Get("advertisers/me")
  async getMyAdvertiserReferrals(@Req() req: { user?: AuthUser }) {
    const entityId = req?.user?.entityId;
    if (!entityId) {
      throw new ForbiddenException(
        "Perfil de conductor no asociado a la sesión",
      );
    }
    return this.referralService.getMyAdvertiserReferrals(entityId);
  }
}
