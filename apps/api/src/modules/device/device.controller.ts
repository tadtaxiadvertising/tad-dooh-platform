import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { DeviceService } from "./device.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { HeartbeatDto } from "./dto/heartbeat.dto";
import { PlaybackConfirmationDto } from "./dto/playback-confirmation.dto";
import { Public } from "../auth/decorators/public.decorator";
import { SubscriptionGuard } from "./guards/subscription.guard";
import { DeviceTokenGuard } from "./guards/device-token.guard";
import { SyncDeviceDto } from "./dto/sync-device.dto";
import { BulkSyncDto } from "./dto/bulk-sync.dto";

@Public() // All device routes are called by tablets (no JWT)
@Controller("device")
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDeviceDto) {
    const device = await this.deviceService.registerDevice(dto);
    return { success: true, device_id: device.deviceId };
  }

  // R1: Debounce GPS 300s + rate limit 20/10s
  @Post("heartbeat")
  @Throttle({ default: { limit: 20, ttl: 10_000 } })
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() dto: HeartbeatDto) {
    await this.deviceService.deviceHeartbeat(dto);
    return { success: true };
  }

  // R1: Debounce GPS 300s + playback 10/min per device
  @Post("playback")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async playback(@Body() dto: PlaybackConfirmationDto) {
    await this.deviceService.recordPlayback(dto);
    return { success: true };
  }

  // REVENUE SHIELD: Subscription guard on content sync endpoints
  // SEC-03: DeviceTokenGuard validates X-Device-Token and enforces OPERATIVO status
  @UseGuards(DeviceTokenGuard, SubscriptionGuard)
  @Post("sync")
  @Throttle({ default: { limit: 30, ttl: 10_000 } })
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncDeviceDto) {
    return this.deviceService.syncDeviceCampaigns(dto);
  }

  @UseGuards(DeviceTokenGuard, SubscriptionGuard)
  @Post("bulk-sync")
  @Throttle({ default: { limit: 30, ttl: 10_000 } })
  @HttpCode(HttpStatus.OK)
  async bulkSync(@Body() dto: BulkSyncDto) {
    return this.deviceService.processBulkSync(dto);
  }

  @Get(":id/slots")
  async checkSlots(@Param("id") deviceId: string) {
    return this.deviceService.getDeviceSlots(deviceId);
  }

  @UseGuards(DeviceTokenGuard)
  @Post("command/:id/ack")
  @HttpCode(HttpStatus.OK)
  async acknowledgeCommand(
    @Param("id") commandId: string,
    @Body() result: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    // M9: validar que el comando pertenezca al dispositivo autenticado (X-Device-Token).
    // Antes cualquier tercero podía marcar comandos ajenos como EXECUTED.
    if (!req.authenticatedDeviceId) {
      throw new ForbiddenException("Dispositivo no autenticado");
    }
    const command = await this.deviceService.getCommandForDevice(
      commandId,
      req.authenticatedDeviceId,
    );
    if (!command) {
      throw new ForbiddenException(
        "No tienes permisos para confirmar este comando",
      );
    }
    return this.deviceService.acknowledgeCommand(commandId, result);
  }
}
