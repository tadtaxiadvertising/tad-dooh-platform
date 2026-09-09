/// <reference types="multer" />
import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { extname } from "path";
import { PrismaService } from "../prisma/prisma.service";

import { SupabaseService } from "../supabase/supabase.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

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
    const crypto = require("crypto");
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * REGLA DE SEGURIDAD 07: Valida que el tipo MIME y la extensión estén permitidos.
   * Solo MP4 (H.264), JPG y PNG son aceptados como piezas publicitarias.
   */
  private validateMediaFile(fileName: string, mimeType?: string) {
    const fileExt = extname(fileName).toLowerCase();
    const allowedExt = BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.some(
      (allowed) => allowed === fileExt,
    );

    // B8: MIME obligatorio — no puede pasar en blanco (antes `!mimeType ||` lo permitía).
    if (!mimeType) {
      throw new BadRequestException(
        "El tipo MIME es obligatorio. Solo se aceptan MP4 (H.264), JPG o PNG.",
      );
    }
    const allowedMime = BUSINESS_RULES.ALLOWED_MEDIA_MIME_TYPES.some(
      (allowed) => allowed === mimeType,
    );

    if (!allowedExt) {
      throw new BadRequestException(
        `Extensión no permitida: ${fileExt || "(sin extensión)"}. Solo se aceptan ${BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.join(", ")}.`,
      );
    }
    if (!allowedMime) {
      throw new BadRequestException(
        `Tipo MIME no permitido: ${mimeType}. Solo se aceptan MP4 (H.264), JPG o PNG.`,
      );
    }
  }

  /**
   * REGLA DE SEGURIDAD 07: Signed URL — El video NO pasa por NestJS RAM
   * Genera una URL firmada válida por 15 minutos para subir directo a Supabase.
   * Esto evita errores de RLS en el frontend y permite archivos de hasta 100MB.
   */
  async generateUploadUrl(fileName: string, fileType: string) {
    try {
      this.validateMediaFile(fileName, fileType);

      // 0. Auto-create bucket if missing (Ensure we don't proceed if this fails silently)
      const { error: bucketError } = await this.supabase.storage
        .createBucket("ads-videos", { public: true })
        .catch((err) => ({ error: err }));
      if (
        bucketError &&
        bucketError.message !== "The resource already exists"
      ) {
        this.logger.warn(
          `Potential issue creating bucket ads-videos: ${bucketError.message}`,
        );
      }

      // 1. Sanitize and path
      const sanitized = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `advertiser-uploads/${Date.now()}-${sanitized}`;

      this.logger.log(`Generando URL firmada para: ${path} (${fileType})`);

      // 2. Create signed upload URL
      const { data, error } = await this.supabase.storage
        .from("ads-videos")
        .createSignedUploadUrl(path);

      if (error) {
        this.logger.error(
          `Error de Supabase creando URL firmada: ${JSON.stringify(error)}`,
        );
        // We include the Supabase error message in the exception so the developer can see it in the 400 response
        throw new Error(
          `Supabase error: ${error.message} (Bucket: ads-videos, Path: ${path})`,
        );
      }

      if (!data || !data.signedUrl) {
        throw new Error("Supabase returned no signed URL");
      }

      const basePrefix =
        this.config.get("CDN_URL_PREFIX") || this.config.get("SUPABASE_URL");
      const publicUrl = `${basePrefix}/storage/v1/object/public/ads-videos/${path}`;

      return {
        uploadUrl: data.signedUrl,
        path: path,
        publicUrl,
      };
    } catch (e: any) {
      this.logger.error(`Falla en generateUploadUrl: ${e.message}`);
      // REGLA SRE 01: Mensajes de error amigables pero con suficiente info para debug local
      throw new BadRequestException(`${e.message}`);
    }
  }

  async registerBypassedMedia(data: any) {
    if (data.size && Number(data.size) > BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException(
        `El archivo registro excede el límite permitido de ${BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`,
      );
    }

    this.validateMediaFile(data.filename, data.contentType);

    // B8: validar que publicUrl sea una URL absoluta http(s) apuntando a nuestro
    // storage (Supabase) o al CDN configurado — no URLs arbitrarias.
    try {
      const parsed = new URL(data.publicUrl);
      if (!/^https?:$/.test(parsed.protocol)) {
        throw new BadRequestException(
          "publicUrl inválida: solo se aceptan URLs http/https",
        );
      }
      const supabaseUrl = this.config.get("SUPABASE_URL");
      const cdnPrefix = this.config.get("CDN_URL_PREFIX");
      const allowedHosts = [supabaseUrl, cdnPrefix]
        .filter((h): h is string => Boolean(h))
        .map((h) => new URL(h).host);
      if (allowedHosts.length > 0 && !allowedHosts.includes(parsed.host)) {
        throw new BadRequestException(
          `publicUrl debe apuntar al storage de TAD (${allowedHosts.join(", ")}) — se recibió ${parsed.host}`,
        );
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`publicUrl inválida: ${e.message}`);
    }

    try {
      const cdnPrefix = this.config.get("CDN_URL_PREFIX");
      let finalCdnUrl = data.publicUrl;

      // Si tenemos un CDN_PREFIX, reemplazamos la base de Supabase por el CDN
      if (
        cdnPrefix &&
        data.publicUrl.includes(this.config.get("SUPABASE_URL"))
      ) {
        finalCdnUrl = data.publicUrl.replace(
          this.config.get("SUPABASE_URL"),
          cdnPrefix,
        );
      }

      const media = await this.prisma.media.create({
        data: {
          filename: data.filename,
          originalFilename: data.filename,
          url: data.publicUrl,
          cdnUrl: finalCdnUrl,
          storageKey: data.storageKey,
          campaign_id: data.campaignId !== "general" ? data.campaignId : null,
          mimeType: data.contentType,
          fileSize: BigInt(data.size || 0),
          status: "READY",
          // @ts-ignore
          qrUrl: data.qrUrl,
          hashMd5: data.hashMd5 || "bypassed",
        },
      });
      return {
        ...media,
        fileSize: Number(media.fileSize),
      };
    } catch (dbError: any) {
      this.logger.error("Database Insert Error on bypass: ", dbError);
      throw new BadRequestException(
        `Error guardando metadata: ${dbError.message}`,
      );
    }
  }

  async listFiles() {
    try {
      // Return media from database as sources of truth for the dashboard
      const mediaList = await this.prisma.media.findMany({
        orderBy: { createdAt: "desc" },
      });

      return mediaList.map((m) => ({
        id: m.id,
        url: m.cdnUrl,
        filename: m.filename,
        originalFilename: m.originalFilename,
        size: Number(m.fileSize),
        mime: m.mimeType,
        // @ts-ignore
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
      distinct: ["deviceId"],
      orderBy: {
        timestamp: "desc",
      },
    });

    return {
      media_id: mediaId,
      active_devices_count: activePlays.length,
      active_devices: activePlays.map((p) => p.deviceId),
      last_activity: activePlays[0]?.timestamp || null,
    };
  }

  async updateMedia(id: string, data: { qrUrl?: string }) {
    try {
      const media = await this.prisma.media.update({
        where: { id },
        data: {
          // @ts-ignore
          qrUrl: data.qrUrl,
        },
      });
      return {
        ...media,
        fileSize: Number(media.fileSize),
      };
    } catch (error: any) {
      this.logger.error(`Error updating media ${id}: ${error.message}`);
      throw new BadRequestException(
        `Falla al actualizar metadata: ${error.message}`,
      );
    }
  }

  async deleteFile(id: string) {
    try {
      const media = await this.prisma.media.findUnique({ where: { id } });
      if (!media) throw new BadRequestException("Media no encontrada");

      // Eliminar de Supabase Storage
      if (media.storageKey) {
        await this.supabase.storage
          .from("campaign-videos")
          .remove([media.storageKey])
          .catch(() => {});
      }

      // Eliminar de la Base de Datos
      await this.prisma.media.delete({ where: { id } });
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new BadRequestException(
        `Error al eliminar archivo: ${error.message}`,
      );
    }
  }
}
