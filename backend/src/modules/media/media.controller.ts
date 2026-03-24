/// <reference types="multer" />
import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Body,
  Param,
  Patch,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('upload-url')
  async getUploadUrl(
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string
  ) {
    if (!fileName || !fileType) {
      throw new BadRequestException('fileName and fileType are required query parameters');
    }
    return this.mediaService.generateUploadUrl(fileName, fileType);
  }

  @Post('register-bypassed')
  async registerBypassed(@Body() body: any) {
    if (!body.filename || !body.storageKey || !body.publicUrl) {
       throw new BadRequestException('Faltan campos (filename, storageKey, publicUrl)');
    }
    return this.mediaService.registerBypassedMedia(body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 200 * 1024 * 1024, // 200MB limit for high-quality taxi ads
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
    console.log(`[MEDIA_UPLOAD] Ingesting: ${file?.originalname} | Size: ${file?.size} bytes | Campaign: ${campaignId}`);
    
    if (!file) {
      console.error('[MEDIA_UPLOAD] Rejected: Missing file payload');
      throw new BadRequestException('A file payload is required');
    }

    const targetCampaignId = campaignId || 'general';
    
    try {
      return await this.mediaService.uploadFile(file, targetCampaignId, qrUrl);
    } catch (e) {
      console.error(`[MEDIA_UPLOAD] Critical Service Error: ${e.message}`);
      throw e;
    }
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

  // ✅ Método HTTP estándar — Axios / fetch DELETE
  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteFile(id);
  }

  // Compatibilidad retroactiva con player tablets antiguas que usan POST
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
