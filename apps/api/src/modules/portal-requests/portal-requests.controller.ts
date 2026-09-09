import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PortalRequestsService } from "./portal-requests.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Controller("portal-requests")
export class PortalRequestsController {
  constructor(private readonly portalRequestsService: PortalRequestsService) {}

  @Post()
  @Public() // Allow advertisers to submit requests (they'll send their advertiserId)
  async create(@Body() body: any) {
    return this.portalRequestsService.create(body);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.portalRequestsService.findAll();
  }

  @Get("advertiser/:advertiserId")
  @Public() // Allow advertisers to see their own requests
  async findByAdvertiser(@Param("advertiserId") advertiserId: string) {
    return this.portalRequestsService.findByAdvertiser(advertiserId);
  }

  @Get("driver/:driverId")
  @Public() // Allow drivers to see their own requests
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
  async update(@Param("id") id: string, @Body() body: any) {
    return this.portalRequestsService.update(id, body);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async delete(@Param("id") id: string) {
    return this.portalRequestsService.remove(id);
  }
}
