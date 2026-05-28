import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { Public } from '../auth/decorators/public.decorator';

@Public() // Tablets fetch manifests without JWT
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('manifest')
  async getAssetManifest(@Query('device_id') deviceId: string) {
    return this.assetsService.getAssetManifest(deviceId);
  }

  @Post('webhook/supabase')
  async handleWebhook(@Body() payload: any) {
    return this.assetsService.handleAssetWebhook(payload);
  }
}
