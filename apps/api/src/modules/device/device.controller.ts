import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionGuard } from './guards/subscription.guard';
import { DeviceTokenGuard } from './guards/device-token.guard';
import { SyncDeviceDto } from './dto/sync-device.dto';
import { BulkSyncDto } from './dto/bulk-sync.dto';

@Public() // All device routes are called by tablets (no JWT)
@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) { }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDeviceDto) {
    const device = await this.deviceService.registerDevice(dto);
    return { success: true, device_id: device.deviceId };
  }

  @Post('heartbeat')
  @Throttle({ default: { limit: 500, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() dto: HeartbeatDto) {
    await this.deviceService.deviceHeartbeat(dto);
    return { success: true };
  }

  @Post('playback')
  @HttpCode(HttpStatus.OK)
  async playback(@Body() dto: PlaybackConfirmationDto) {
    await this.deviceService.recordPlayback(dto);
    return { success: true };
  }

  // REVENUE SHIELD: Subscription guard on content sync endpoints
  // SEC-03: DeviceTokenGuard validates X-Device-Token and enforces OPERATIVO status
  @UseGuards(DeviceTokenGuard, SubscriptionGuard)
  @Post('sync')
  @Throttle({ default: { limit: 500, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncDeviceDto) {
    return this.deviceService.syncDeviceCampaigns(dto);
  }

  @UseGuards(DeviceTokenGuard, SubscriptionGuard)
  @Post('bulk-sync')
  @Throttle({ default: { limit: 500, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async bulkSync(@Body() dto: BulkSyncDto) {
    return this.deviceService.processBulkSync(dto);
  }

  @Get(':id/slots')
  async checkSlots(@Param('id') deviceId: string) {
    return this.deviceService.getDeviceSlots(deviceId);
  }

  @Post('command/:id/ack')
  @HttpCode(HttpStatus.OK)
  async acknowledgeCommand(
    @Param('id') commandId: string,
    @Body() result: any
  ) {
    return this.deviceService.acknowledgeCommand(commandId, result);
  }
}
