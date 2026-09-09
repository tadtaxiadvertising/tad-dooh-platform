import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { PrismaService } from "../prisma/prisma.service";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as crypto from "crypto";
import axios from "axios";

@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAdVideo(
    campaignId: string,
    props: {
      logoUrl: string;
      brandColor: string;
      primaryText: string;
      secondaryText: string;
    },
  ) {
    const outputDir = path.join(os.tmpdir(), "tad-videos");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputLocation = path.join(
      outputDir,
      `ad-${campaignId}-${Date.now()}.mp4`,
    );

    this.logger.log(
      `🎬 Solicitando renderizado de video al microservicio Remotion para campaña: ${campaignId}`,
    );

    try {
      const remotionServiceUrl =
        process.env.REMOTION_SERVICE_URL || "http://localhost:8000/api/render";

      // 1. Solicitar renderizado al microservicio externo
      const response = await axios.post(
        remotionServiceUrl,
        {
          campaignId,
          props,
        },
        {
          responseType: "arraybuffer", // Necesitamos procesar el binario devuelto
          timeout: 120000, // Dar hasta 2 minutos para renderizar
        },
      );

      // 2. Escribir buffer temporalmente si se desea mantener el flujo local
      const fileBuffer = Buffer.from(response.data);
      fs.writeFileSync(outputLocation, fileBuffer);

      // 4. Upload to Supabase
      const fileName = `ads/${campaignId}/${path.basename(outputLocation)}`;
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase.storage
        .from("campaign-videos")
        .upload(fileName, fileBuffer, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (error) throw error;

      const publicUrl = this.supabaseService.getPublicUrl(
        fileName,
        "campaign-videos",
      );

      // Calculate checksum for tablet sync integrity
      const checksum = crypto
        .createHash("md5")
        .update(fileBuffer)
        .digest("hex");

      // 5. Register in DB as MediaAsset
      const asset = await this.prisma.mediaAsset.create({
        data: {
          campaignId,
          type: "VIDEO",
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
        assetId: asset.id,
      };
    } catch (err) {
      this.logger.error(`❌ Fallo en generación de video: ${err.message}`);
      throw err;
    }
  }
}
