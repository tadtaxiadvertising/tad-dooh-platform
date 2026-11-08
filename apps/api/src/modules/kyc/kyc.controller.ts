import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { KYCService } from "./kyc.service";
import type { KYCSubmission } from "./kyc.service";
import type { AuthUser } from "../auth/auth.types";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Roles(UserRole.ADMIN, UserRole.DRIVER)
@UseGuards(TenantGuard)
@Controller("kyc")
export class KYCController {
  constructor(private readonly kycService: KYCService) {}

  @Post("submit")
  async submit(@Req() req: { user?: AuthUser }, @Body() body: KYCSubmission) {
    // @Roles guards the endpoint, but body.driverId has no :id route
    // parameter for TenantGuard to compare. Always validate ownership here.
    if (!body || typeof body.driverId !== "string" || !body.driverId.trim()) {
      throw new BadRequestException("Se requiere un ID de conductor válido.");
    }

    const user = req.user;
    if (
      !user ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.DRIVER)
    ) {
      throw new ForbiddenException(
        "No tienes permisos para enviar documentos KYC.",
      );
    }

    if (
      user.role === UserRole.DRIVER &&
      (!user.entityId || user.entityId !== body.driverId)
    ) {
      throw new ForbiddenException(
        "Solo puedes enviar documentos KYC para tu propio perfil.",
      );
    }

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
