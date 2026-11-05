import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { PortalRequestsService } from "./portal-requests.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { TenantGuard } from "../auth/guards/tenant.guard";

@Controller("portal-requests")
export class PortalRequestsController {
  constructor(private readonly portalRequestsService: PortalRequestsService) {}

  @Post()
  @Public() // Allow advertisers to submit requests (they'll send their advertiserId)
  async create(@Body() body: Parameters<PortalRequestsService["create"]>[0]) {
    return this.portalRequestsService.create(body);
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
