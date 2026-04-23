import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

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
}
