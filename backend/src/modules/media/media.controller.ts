import { 
  Controller, 
  Post, 
  Get, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Body
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
  async uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A file payload is required');
    }
    return this.mediaService.uploadFile(file);
  }

  @Get()
  async getMedia() {
    return this.mediaService.listFiles();
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
}
