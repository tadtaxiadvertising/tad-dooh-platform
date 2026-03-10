import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Post(':id/command')
  async sendFleetCommand(
    @Param('id') deviceId: string,
    @Body() body: { type: string; params?: any }
  ) {
    return this.fleetService.sendCommand(deviceId, body.type, body.params);
  }

  @Post('register')
  async registerDevice(@Body() body: { placa: string; driverName: string }) {
    if (!body.placa || !body.driverName) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('placa y driverName son obligatorios');
    }
    return this.fleetService.registerDeviceByAdmin(body.placa, body.driverName);
  }
}
