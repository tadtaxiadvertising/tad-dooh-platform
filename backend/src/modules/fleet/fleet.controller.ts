import { Controller, Get } from '@nestjs/common';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('devices')
  async getFleetDevices() {
    return this.fleetService.getFleetDevices();
  }

  @Get('stats')
  async getFleetStats() {
    return this.fleetService.getFleetStats();
  }

  @Get('map')
  async getFleetMap() {
    return this.fleetService.getFleetMap();
  }

  @Get('offline')
  async getOfflineDevices() {
    return this.fleetService.getOfflineDevices();
  }

  @Get('finance')
  async getFleetFinance() {
    return this.fleetService.getFleetFinance();
  }
}
