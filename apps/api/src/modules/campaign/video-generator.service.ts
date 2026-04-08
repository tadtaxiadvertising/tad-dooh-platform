import { Injectable, Logger } from '@nestjs/common';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAdVideo(campaignId: string, props: {
    logoUrl: string;
    brandColor: string;
    primaryText: string;
    secondaryText: string;
  }) {
    const entryPoint = path.resolve(__dirname, 'templates', 'index.tsx');
    const outputDir = path.join(os.tmpdir(), 'tad-videos');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputLocation = path.join(outputDir, `ad-${campaignId}-${Date.now()}.mp4`);

    this.logger.log(`🎬 Iniciando renderizado de video para campaña: ${campaignId}`);

    try {
      // 1. Bundle the composition
      const bundled = await bundle(entryPoint);

      // 2. Select the composition
      const composition = await selectComposition({
        serveUrl: bundled,
        id: 'DynamicAd',
        inputProps: props,
      });

      // 3. Render the media (Optimized for STI Tablets)
      await renderMedia({
        composition,
        serveUrl: bundled,
        codec: 'h264',
        outputLocation,
        inputProps: props,
        videoBitrate: '2000k',
        pixelFormat: 'yuv420p', // Required for Android hardware acceleration
        concurrency: 2, // Limit concurrency to save RAM in VPS
      });

      this.logger.log(`✅ Renderizado completado: ${outputLocation}`);

      // 4. Upload to Supabase
      const fileBuffer = fs.readFileSync(outputLocation);
      const fileName = `ads/${campaignId}/${path.basename(outputLocation)}`;
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.storage
        .from('campaign-videos')
        .upload(fileName, fileBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (error) throw error;

      const publicUrl = this.supabaseService.getPublicUrl(fileName, 'campaign-videos');
      
      // Calculate checksum for tablet sync integrity
      const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

      // 5. Register in DB as MediaAsset
      const asset = await this.prisma.mediaAsset.create({
        data: {
          campaignId,
          type: 'VIDEO',
          filename: path.basename(outputLocation),
          url: publicUrl,
          fileSize: fileBuffer.length,
          checksum: checksum,
          duration: 10, // Match template duration
          version: 1,
        },
      });

      // Cleanup
      if (fs.existsSync(outputLocation)) {
        fs.unlinkSync(outputLocation);
      }

      this.logger.log(`🚀 Video generado y subido exitosamente: ${publicUrl}`);

      return {
        success: true,
        url: publicUrl,
        assetId: asset.id
      };

    } catch (err) {
      this.logger.error(`❌ Fallo en generación de video: ${err.message}`);
      throw err;
    }
  }
}
