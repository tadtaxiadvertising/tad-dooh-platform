import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { KYCService, KYCSubmission } from "./kyc.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Roles(UserRole.ADMIN, UserRole.DRIVER)
@UseGuards(TenantGuard)
@Controller("kyc")
export class KYCController {
  constructor(private readonly kycService: KYCService) {}

  @Post("submit")
  @Public()
  async submit(@Body() body: KYCSubmission) {
    return this.kycService.submit(body);
  }

  @Get("pending")
  @Roles(UserRole.ADMIN)
  async pending() {
    return this.kycService.getPendingReviews();
  }

  @Post(":id/approve")
  @Roles(UserRole.ADMIN)
  async approve(@Param("id") id: string) {
    return this.kycService.approve(id);
  }

  @Post(":id/reject")
  @Roles(UserRole.ADMIN)
  async reject(@Param("id") id: string, @Body("reason") reason: string) {
    return this.kycService.reject(id, reason);
  }

  @Get(":id/status")
  async status(@Param("id") id: string) {
    return this.kycService.getStatus(id);
  }
}
