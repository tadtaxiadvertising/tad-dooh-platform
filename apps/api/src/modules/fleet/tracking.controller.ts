import { Controller, Get, Req } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('baseline')
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getBaseline(@Req() req: any) {
    const user = req.user;
    const advertiserId = user.role === UserRole.ADVERTISER ? user.entityId : undefined;
    return this.fleetService.getFleetMap(advertiserId);
  }
}
