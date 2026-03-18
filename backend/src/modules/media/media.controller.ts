/// <reference types="multer" />
import { 
  Controller, 
  Post, 
  Get, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Body,
  Param,
  Patch
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
      // Validate mp4 or webm natively inside Multer config
      if (file.mimetype === 'video/mp4' || file.mimetype === 'video/webm') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only .mp4 and .webm formats are permitted'), false);
      }
    }
  }))
  async uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body('campaignId') campaignId: string,
    @Body('qrUrl') qrUrl?: string
  ) {
    if (!file) {
      throw new BadRequestException('A file payload is required');
    }
    if (!campaignId) {
      throw new BadRequestException('campaignId is required');
    }
    return this.mediaService.uploadFile(file, campaignId, qrUrl);
  }

  @Get()
  async getMedia() {
    return this.mediaService.listFiles();
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.mediaService.getMediaStatus(id);
  }

  @Post('register-mock')
  async registerMockMedia(@Body() dto: { filename: string; mimetype: string; size: number; }) {
    if (!dto.filename || !dto.mimetype || !dto.size) {
      throw new BadRequestException('filename, mimetype, and size are required');
    }
    return this.mediaService.registerFileMock({
      originalname: dto.filename,
      mimetype: dto.mimetype,
      size: dto.size
    });
  }

  @Post(':id/delete')
  async deleteMediaAlt(@Param('id') id: string) {
    return this.mediaService.deleteFile(id);
  }

  @Post(':id')
  async deleteMediaPost(@Param('id') id: string) {
    // Para simplificar desde frontend fetchers que a veces confunden verbos
    return this.mediaService.deleteFile(id);
  }
 
  @Patch(':id')
  async updateMedia(@Param('id') id: string, @Body() dto: { qrUrl: string }) {
    return this.mediaService.updateMedia(id, dto);
  }
}
