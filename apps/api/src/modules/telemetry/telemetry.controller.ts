import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('sync')
  @HttpCode(HttpStatus.CREATED)
  async sync(
    @Body() payload: { driverId: string; lat: number; lng: number; speed: number; timestamp?: string }[]
  ) {
    this.telemetryService.sync(payload).catch(err => console.error('Telemetry sync error', err));
    return { success: true };
  }

  @Public()
  @Post('playback')
  @HttpCode(HttpStatus.CREATED)
  async recordPlayback(
    @Body() payload: { deviceId: string; videoId: string; eventType: 'START' | 'END' | 'ERROR'; lat?: number; lng?: number }
  ) {
    return this.telemetryService.recordPlayback(payload);
  }
}
