import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { FleetService } from "./fleet.service";
import { Public } from "../auth/decorators/public.decorator";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/decorators/roles.decorator";

import { TrackBatchDto } from "./dto/track-batch.dto";

@Controller("fleet")
@Roles(UserRole.ADMIN)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get("devices")
  async getFleetDevices() {
    return this.fleetService.getFleetDevices();
  }

  @Get("stats")
  async getFleetStats() {
    return this.fleetService.getFleetStats();
  }

  @Get("status-summary")
  async getFleetStatusSummary() {
    return this.fleetService.getFleetStatusSummary();
  }

  // TAREA A: Backend Refactor - Batch Fetching API Endpoint
  @Get("summary")
  async getFleetSummary() {
    return this.fleetService.getFleetStatusSummary(); // Alies to the optimized query
  }

  @Get("map")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getFleetMap(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    const advertiserId =
      user.role === UserRole.ADVERTISER ? user.entityId : undefined;
    return this.fleetService.getFleetMap(advertiserId);
  }

  @Get("tracking/baseline")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getTrackingBaseline(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    const advertiserId =
      user.role === UserRole.ADVERTISER ? user.entityId : undefined;
    return this.fleetService.getFleetMap(advertiserId);
  }

  @Get("offline")
  async getOfflineDevices() {
    return this.fleetService.getOfflineDevices();
  }

  @Get("finance")
  async getFleetFinance() {
    return this.fleetService.getFleetFinance();
  }

  @Post(":id/command")
  async sendFleetCommand(
    @Param("id") deviceId: string,
    @Body() body: { type: string; params?: Record<string, unknown> },
  ) {
    return this.fleetService.sendCommand(deviceId, body.type, body.params);
  }

  @Post("broadcast-command")
  async broadcastFleetCommand(
    @Body() body: { type: string; params?: Record<string, unknown> },
  ) {
    return this.fleetService.broadcastCommand(body.type, body.params);
  }

  @Post("register")
  async registerDevice(
    @Body() body: { placa: string; driverName: string; deviceId?: string },
  ) {
    if (!body.placa || !body.driverName) {
      const { BadRequestException } = require("@nestjs/common");
      throw new BadRequestException("placa y driverName son obligatorios");
    }
    return this.fleetService.registerDeviceByAdmin(
      body.placa,
      body.driverName,
      body.deviceId,
    );
  }

  @Get("devices/:id/recent-path")
  async getDeviceRecentPath(@Param("id") deviceId: string) {
    return this.fleetService.getDeviceRecentPath(deviceId);
  }

  @Get("tracking")
  async getTrackingData() {
    return this.fleetService.getTrackingData();
  }

  @Get("tracking/summary")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getTrackingSummary(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    const advertiserId =
      user.role === UserRole.ADVERTISER ? user.entityId : undefined;
    return this.fleetService.getTrackingSummary(advertiserId);
  }

  // Public to the portal JWT guard, but never anonymous: only provisioned
  // hardware with a purpose-bound DEVICE_AUTH credential may upload GPS.
  @Public()
  @UseGuards(DeviceTokenGuard)
  @Post("track-batch")
  async trackBatch(@Body() data: TrackBatchDto) {
    return this.fleetService.ingestTelemetryBatch(data);
  }
}
