import { Controller, Post, Body, HttpCode, HttpStatus, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly prisma: PrismaService,
  ) { }

  @Post('sync')
  @HttpCode(HttpStatus.CREATED)
  async sync(
    @Body() payload: { driverId: string; lat: number; lng: number; speed: number; timestamp?: string }[]
  ) {
    this.telemetryService.sync(payload)
      .catch(err => this.logger.error('Telemetry sync error', err));
    return { success: true };
  }

  @Public()
  @Post('playback')
  @HttpCode(HttpStatus.CREATED)
  async recordPlayback(
    @Body() payload: { deviceId: string; videoId: string; eventType: 'START' | 'END' | 'ERROR'; lat?: number; lng?: number }
  ) {
    if (!payload.deviceId) {
      throw new BadRequestException('deviceId is required');
    }

    const device = await this.prisma.device.findUnique({
      where: { deviceId: payload.deviceId },
      select: { id: true, status: true },
    });

    if (!device) {
      throw new NotFoundException(`Device '${payload.deviceId}' not found`);
    }

    return this.telemetryService.recordPlayback(payload);
  }
}
