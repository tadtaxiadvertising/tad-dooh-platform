import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SyncService } from './sync.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Public()
  @Get(':deviceId')
  async getDeviceManifest(@Param('deviceId') deviceId: string) {
    if (!deviceId) {
      throw new HttpException('DEVICE_ID_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    return this.syncService.getDeviceManifest(deviceId);
  }
}
