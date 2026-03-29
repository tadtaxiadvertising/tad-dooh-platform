import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { PlaybackConfirmationDto } from './dto/playback-confirmation.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionGuard } from '../drivers/guards/subscription.guard';
import { SyncDeviceDto } from './dto/sync-device.dto';

@Public() // All device routes are called by tablets (no JWT)
@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDeviceDto) {
    const device = await this.deviceService.registerDevice(dto);
    return { success: true, device_id: device.deviceId };
  }

  @Post('heartbeat')
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

  @Public()
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync(@Body() dto: SyncDeviceDto) {
    return this.deviceService.syncDeviceCampaigns(dto);
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
