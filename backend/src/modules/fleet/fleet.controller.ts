import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FleetService } from './fleet.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('fleet')
@Roles(UserRole.ADMIN)
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

  @Get('status-summary')
  async getFleetStatusSummary() {
    return this.fleetService.getFleetStatusSummary();
  }

  // TAREA A: Backend Refactor - Batch Fetching API Endpoint
  @Get('summary')
  async getFleetSummary() {
    return this.fleetService.getFleetStatusSummary(); // Alies to the optimized query
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
  async registerDevice(@Body() body: { placa: string; driverName: string; deviceId?: string }) {
    if (!body.placa || !body.driverName) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('placa y driverName son obligatorios');
    }
    return this.fleetService.registerDeviceByAdmin(body.placa, body.driverName, body.deviceId);
  }

  @Get('devices/:id/recent-path')
  async getDeviceRecentPath(@Param('id') deviceId: string) {
    return this.fleetService.getDeviceRecentPath(deviceId);
  }

  @Get('tracking')
  async getTrackingData() {
    return this.fleetService.getTrackingData();
  }

  @Get('tracking/summary')
  async getTrackingSummary() {
    return this.fleetService.getTrackingSummary();
  }

  @Public()
  @Post('track-batch')
  async handleBatchTracking(@Body() data: { 
    driverId?: string; 
    deviceId: string; 
    locations: any[];
  }) {
    return this.fleetService.trackBatch(data);
  }
}
