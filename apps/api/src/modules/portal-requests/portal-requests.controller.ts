import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { PortalRequestsService } from "./portal-requests.service";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { Throttle } from "@nestjs/throttler";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Controller("portal-requests")
export class PortalRequestsController {
  constructor(private readonly portalRequestsService: PortalRequestsService) {}

  /**
   * Authenticated request creation. Identity/tenant are sourced only from
   * the verified API session, never from untrusted advertiserId/driverId.
   * Admins retain the existing ability to create requests on any tenant.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER, UserRole.DRIVER)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: Parameters<PortalRequestsService["create"]>[0],
  ) {
    const user = req.user;
    if (!user || !body) {
      throw new ForbiddenException("Sesión de portal inválida.");
    }
    if (user.role === UserRole.ADMIN) {
      return this.portalRequestsService.create(body);
    }

    if (typeof user.entityId !== "string" || !user.entityId.trim()) {
      throw new ForbiddenException("Perfil del portal inválido.");
    }

    if (user.role === UserRole.ADVERTISER) {
      if (
        body.driverId ||
        (body.advertiserId && body.advertiserId !== user.entityId) ||
        (body.campaignId &&
          !(await this.portalRequestsService.advertiserOwnsCampaign(
            body.campaignId,
            user.entityId,
          )))
      ) {
        throw new ForbiddenException(
          "No puedes crear solicitudes para otra cuenta.",
        );
      }
      return this.portalRequestsService.create({
        ...body,
        advertiserId: user.entityId,
        driverId: undefined,
      });
    }

    if (user.role === UserRole.DRIVER) {
      if (
        body.advertiserId ||
        body.campaignId ||
        (body.driverId && body.driverId !== user.entityId)
      ) {
        throw new ForbiddenException(
          "No puedes crear solicitudes para otra cuenta.",
        );
      }
      return this.portalRequestsService.create({
        ...body,
        driverId: user.entityId,
        advertiserId: undefined,
        campaignId: undefined,
      });
    }

    throw new ForbiddenException("Rol de portal no autorizado.");
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.portalRequestsService.findAll();
  }

  @Get("advertiser/:advertiserId")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async findByAdvertiser(@Param("advertiserId") advertiserId: string) {
    return this.portalRequestsService.findByAdvertiser(advertiserId);
  }

  @Get("driver/:driverId")
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @UseGuards(TenantGuard)
  async findByDriver(@Param("driverId") driverId: string) {
    return this.portalRequestsService.findByDriver(driverId);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id") id: string) {
    return this.portalRequestsService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body() body: Parameters<PortalRequestsService["update"]>[1],
  ) {
    return this.portalRequestsService.update(id, body);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async delete(@Param("id") id: string) {
    return this.portalRequestsService.remove(id);
  }
}
