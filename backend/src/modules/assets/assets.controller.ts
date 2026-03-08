import { Controller, Get, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('manifest')
  async getAssetManifest(@Query('device_id') deviceId: string) {
    return this.assetsService.getAssetManifest(deviceId);
  }
}
