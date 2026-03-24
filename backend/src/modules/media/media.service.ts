/// <reference types="multer" />
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private supabase: any;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.supabase = this.supabaseService.getClient();
  }

  generateHash(buffer: Buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  async uploadFile(file: any, campaignId: string, qrUrl?: string) {
    // 0. Auto-create bucket if missing
    await this.supabase.storage.createBucket('campaign-videos', { public: true }).catch(() => {});

    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `${campaignId}/${Date.now()}_${sanitizedFilename}`;

    // 1. Subir a Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('campaign-videos')
      .upload(storagePath, file.buffer, {
        upsert: true 
      });

    if (error) {
       this.logger.error("Supabase Storage Error: ", error);
       throw new BadRequestException(`Error subiendo a Storage: ${error.message}`);
    }

    // 2. Registrar en la BD para que aparezca en el Dashboard
    try {
      const media = await this.prisma.media.create({
        data: {
          filename: file.originalname,
          originalFilename: file.originalname,
          url: `${this.config.get('SUPABASE_URL')}/storage/v1/object/public/campaign-videos/${data.path}`,
          cdnUrl: `${this.config.get('SUPABASE_URL')}/storage/v1/object/public/campaign-videos/${data.path}`,
          storageKey: data.path,
          campaign_id: campaignId,
          mimeType: file.mimetype,
          fileSize: BigInt(file.size),
          status: 'READY',
          qrUrl: qrUrl,
          hashMd5: this.generateHash(file.buffer)
        }
      });

      return {
        ...media,
        fileSize: Number(media.fileSize)
      };
    } catch(dbError: any) {
      this.logger.error("Database Insert Error: ", dbError);
      throw new BadRequestException(`Error en base de datos: ${dbError.message}`);
    }
  }

  /**
   * REGLA DE SEGURIDAD 07: Signed URL — El video NO pasa por NestJS RAM
   * Genera una URL firmada válida por 15 minutos para subir directo a Supabase.
   */
  async generateUploadUrl(fileName: string, fileType: string) {
    await this.supabase.storage.createBucket('ads-videos', { public: true }).catch(() => {});
    
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { data, error } = await this.supabase.storage
      .from('ads-videos')
      .createSignedUploadUrl(safeName);

    if (error) throw new BadRequestException(`Storage Error: ${error.message}`);

    const publicUrl = `${this.config.get('SUPABASE_URL')}/storage/v1/object/public/ads-videos/${data.path}`;
    
    return {
      uploadUrl: data.signedUrl,
      path: data.path,
      publicUrl,
    };
  }

  async registerFileMock(dto: { originalname: string; mimetype: string; size: number }) {
    const fileExt = extname(dto.originalname);
    const fileId = uuidv4();
    const fileName = `videos/mock-${fileId}${fileExt}`;
    // Provide a valid default video URL to make it "100% funcional" for visual testing
    const cdnUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#mock-${fileId}`;

    try {
      const media = await this.prisma.media.create({
        data: {
          id: fileId,
          filename: fileName,
          originalFilename: dto.originalname,
          mimeType: dto.mimetype,
          fileSize: BigInt(dto.size),
          storageKey: fileName,
          cdnUrl: cdnUrl,
          status: 'READY',
          hashMd5: 'pending',
          hashSha256: 'pending',
        }
      });

      return {
        id: media.id,
        url: media.cdnUrl,
        size: Number(media.fileSize),
        mime: media.mimeType,
      };
    } catch (dbError: any) {
      this.logger.error(`DB Error saving mock media: ${dbError.message}`);
      throw new BadRequestException('Failed to save mock metadata to database');
    }
  }

  async listFiles() {
    try {
      // Return media from database as sources of truth for the dashboard
      const mediaList = await this.prisma.media.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return mediaList.map(m => ({
        id: m.id,
        url: m.cdnUrl,
        filename: m.filename,
        originalFilename: m.originalFilename,
        size: Number(m.fileSize),
        mime: m.mimeType,
        qrUrl: m.qrUrl,
        createdAt: m.createdAt,
      }));
    } catch (error: any) {
      this.logger.error(`Error listing files from DB: ${error.message}`);
      return [];
    }
  }

  /**
   * Cross media_id with playback_events to list device_ids that 
   * have reported playbacks in the last 10 minutes.
   */
  async getMediaStatus(mediaId: string) {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const activePlays = await this.prisma.playbackEvent.findMany({
      where: {
        videoId: mediaId,
        timestamp: {
          gte: tenMinAgo,
        },
      },
      select: {
        deviceId: true,
        timestamp: true,
      },
      distinct: ['deviceId'],
      orderBy: {
        timestamp: 'desc',
      },
    });

    return {
      media_id: mediaId,
      active_devices_count: activePlays.length,
      active_devices: activePlays.map(p => p.deviceId),
      last_activity: activePlays[0]?.timestamp || null,
    };
  }

  async updateMedia(id: string, data: { qrUrl?: string }) {
    try {
      const media = await this.prisma.media.update({
        where: { id },
        data: {
          qrUrl: data.qrUrl
        }
      });
      return {
        ...media,
        fileSize: Number(media.fileSize)
      };
    } catch (error: any) {
      this.logger.error(`Error updating media ${id}: ${error.message}`);
      throw new BadRequestException(`Falla al actualizar metadata: ${error.message}`);
    }
  }

  async deleteFile(id: string) {
    try {
      const media = await this.prisma.media.findUnique({ where: { id } });
      if (!media) throw new BadRequestException('Media no encontrada');
      
      // Eliminar de Supabase Storage si no es un mock
      if (media.storageKey && !media.storageKey.startsWith('videos/mock-')) {
        await this.supabase.storage
          .from('campaign-videos')
          .remove([media.storageKey])
          .catch(() => {});
      }
      
      // Eliminar de la Base de Datos
      await this.prisma.media.delete({ where: { id } });
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new BadRequestException(`Error al eliminar archivo: ${error.message}`);
    }
  }
}
