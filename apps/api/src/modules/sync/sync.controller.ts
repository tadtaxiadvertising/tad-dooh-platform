import { Controller, Get, Param, Headers, HttpException, HttpStatus, Res } from '@nestjs/common';
import { SyncService } from './sync.service';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Public()
  @Get(':deviceId')
  async getDeviceManifest(
    @Param('deviceId') deviceId: string,
    @Headers('if-none-match') ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new HttpException('DEVICE_ID_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    
    const manifest = await this.syncService.getDeviceManifest(deviceId);
    
    // Fast-path: Si el hash coincide, devolvemos 304 Not Modified instantáneo sin payload
    if (ifNoneMatch && ifNoneMatch === manifest.etag) {
      res.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }
    
    res.setHeader('ETag', manifest.etag);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return manifest;
  }
}
