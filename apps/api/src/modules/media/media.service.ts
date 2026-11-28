import { errorMessage } from "../../utils/error.util";
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
  private supabase: ReturnType<SupabaseService["getClient"]>;

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
        .catch((err: Error) => ({ error: err }));
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
    } catch (e: unknown) {
      this.logger.error(`Falla en generateUploadUrl: ${errorMessage(e)}`);
      // REGLA SRE 01: Mensajes de error amigables pero con suficiente info para debug local
      throw new BadRequestException(`${errorMessage(e)}`);
    }
  }

  async registerBypassedMedia(data: {
    filename: string;
    contentType: string;
    publicUrl: string;
    storageKey: string;
    campaignId?: string;
    size?: string | number;
    qrUrl?: string;
    hashMd5?: string;
  }) {
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
      const cdnPrefix = String(this.config.get("CDN_URL_PREFIX"));
      const allowedHosts = [supabaseUrl, cdnPrefix]
        .filter((h): h is string => Boolean(h))
        .map((h) => new URL(h).host);
      if (allowedHosts.length > 0 && !allowedHosts.includes(parsed.host)) {
        throw new BadRequestException(
          `publicUrl debe apuntar al storage de TAD (${allowedHosts.join(", ")}) — se recibió ${parsed.host}`,
        );
      }
    } catch (e: unknown) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`publicUrl inválida: ${errorMessage(e)}`);
    }

    try {
      const cdnPrefix = String(this.config.get("CDN_URL_PREFIX"));
      const supabaseUrl = this.config.get<string>("SUPABASE_URL");
      let finalCdnUrl = data.publicUrl;

      // Si tenemos un CDN_PREFIX, reemplazamos la base de Supabase por el CDN
      if (cdnPrefix && supabaseUrl && data.publicUrl.includes(supabaseUrl)) {
        finalCdnUrl = data.publicUrl.replace(supabaseUrl, cdnPrefix);
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
        mime_type: media.mimeType,
        fileSize: Number(media.fileSize),
      };
    } catch (dbError: unknown) {
      this.logger.error("Database Insert Error on bypass: ", dbError);
      throw new BadRequestException(
        `Error guardando metadata: ${errorMessage(dbError)}`,
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
    } catch (error: unknown) {
      this.logger.error(`Error listing files from DB: ${errorMessage(error)}`);
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
        mime_type: media.mimeType,
        fileSize: Number(media.fileSize),
      };
    } catch (error: unknown) {
      this.logger.error(`Error updating media ${id}: ${errorMessage(error)}`);
      throw new BadRequestException(
        `Falla al actualizar metadata: ${errorMessage(error)}`,
      );
    }
  }

  /**
   * Renombrar un archivo multimedia.
   * Valida que el nuevo nombre no esté vacío, no contenga caracteres no permitidos
   * y actualiza filename + originalFilename en la BD.
   */
  async renameFile(id: string, newFilename: string) {
    if (
      !newFilename ||
      typeof newFilename !== "string" ||
      newFilename.trim().length === 0
    ) {
      throw new BadRequestException(
        "El nombre del archivo no puede estar vacío.",
      );
    }

    const sanitized = newFilename.trim().replace(/[\\/&?:*$#%'"!<>|?]/g, "_");
    if (sanitized.length === 0) {
      throw new BadRequestException(
        "El nombre del archivo contiene solo caracteres no permitidos.",
      );
    }

    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new BadRequestException("Media no encontrada");

    await this.prisma.media.update({
      where: { id },
      data: {
        filename: sanitized,
        originalFilename: sanitized,
      },
    });

    return { success: true };
  }

  async deleteFile(id: string) {
    try {
      const media = await this.prisma.media.findUnique({ where: { id } });
      if (!media) throw new BadRequestException("Media no encontrada");

      // VERIFICAR que el archivo no esté asignado a una campaña activa
      if (media.campaign_id) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: media.campaign_id },
          select: {
            id: true,
            active: true,
            status: true,
            targetAll: true,
            isGlobal: true,
          },
        });

        if (campaign && campaign.active) {
          throw new BadRequestException(
            `No se puede eliminar el archivo porque está asignado a la campaña activa "${campaign.id}". Desasigna primero el archivo de la campaña o pausa/completa la campaña.`,
          );
        }
      }

      // Eliminar de Supabase Storage
      if (media.storageKey) {
        await this.supabase.storage
          .from("ads-videos")
          .remove([media.storageKey])
          .catch(() => {});
      }

      // Eliminar de la Base de Datos
      await this.prisma.media.delete({ where: { id } });
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Error deleting file: ${errorMessage(error)}`);
      throw new BadRequestException(
        `Error al eliminar archivo: ${errorMessage(error)}`,
      );
    }
  }

  /**
   * Confirma una subida directa a Supabase Storage.
   * Valida: archivo existe, tamaño coincide, hash MD5 coincide.
   * Crea registro en BD con metadata verificada.
   */
  async confirmUpload(data: {
    path: string;
    campaignId?: string;
    expectedSize?: number;
    expectedHashMd5?: string;
    filename?: string;
    qrUrl?: string;
  }) {
    const { path, campaignId, expectedSize, expectedHashMd5, filename, qrUrl } =
      data;

    // SEC-04: Prevent Path Traversal in storage path
    if (
      !path ||
      typeof path !== "string" ||
      path.includes("..") ||
      path.startsWith("/") ||
      path.includes("\\")
    ) {
      throw new BadRequestException("Ruta de archivo inválida");
    }

    // 1. Verificar que el archivo existe en Supabase y obtener metadata
    const { data: fileData, error: statError } = await this.supabase.storage
      .from("ads-videos")
      .download(path);

    if (statError || !fileData) {
      this.logger.error(
        `Archivo no encontrado en storage: ${path} - ${statError?.message}`,
      );
      throw new BadRequestException(
        "Archivo no encontrado en storage tras subida",
      );
    }

    // 2. Calcular tamaño y hash reales
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const actualSize = buffer.length;
    const actualHashMd5 = this.generateHash(buffer);

    // 3. Validar tamaño si se esperaba
    if (expectedSize && actualSize !== expectedSize) {
      this.logger.warn(
        `Tamaño mismatch: esperado ${expectedSize}, real ${actualSize} para ${path}`,
      );
      throw new BadRequestException(
        `Tamaño de archivo no coincide: esperado ${expectedSize} bytes, recibido ${actualSize} bytes`,
      );
    }

    // 4. Validar hash si se esperaba
    if (expectedHashMd5 && actualHashMd5 !== expectedHashMd5) {
      this.logger.warn(
        `Hash mismatch: esperado ${expectedHashMd5}, real ${actualHashMd5} para ${path}`,
      );
      throw new BadRequestException(
        `Hash MD5 no coincide. El archivo pudo corromperse durante la subida.`,
      );
    }

    // 5. Validar tamaño máximo
    if (actualSize > BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException(
        `El archivo excede el límite permitido de ${BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`,
      );
    }

    // 6. Detectar MIME type desde extensión/nombre
    const fileName = filename || path.split("/").pop() || "video.mp4";
    const ext = extname(fileName).toLowerCase();
    let mimeType = "video/mp4";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";

    this.validateMediaFile(fileName, mimeType);

    // 7. Construir URLs
    const basePrefix =
      this.config.get("CDN_URL_PREFIX") || this.config.get("SUPABASE_URL");
    const publicUrl = `${basePrefix}/storage/v1/object/public/ads-videos/${path}`;

    const cdnPrefix = String(this.config.get("CDN_URL_PREFIX"));
    let finalCdnUrl = publicUrl;
    if (
      cdnPrefix &&
      publicUrl.includes(String(this.config.get("SUPABASE_URL") ?? ""))
    ) {
      finalCdnUrl = publicUrl
        .split(String(this.config.get("SUPABASE_URL") ?? ""))
        .join(cdnPrefix);
    }

    // 8. Crear registro en BD
    try {
      const media = await this.prisma.media.create({
        data: {
          filename: fileName,
          originalFilename: fileName,
          url: publicUrl,
          cdnUrl: finalCdnUrl,
          storageKey: path,
          campaign_id:
            campaignId && campaignId !== "general" ? campaignId : null,
          mimeType,
          fileSize: BigInt(actualSize),
          status: "READY",
          qrUrl: qrUrl || null,
          hashMd5: actualHashMd5,
        },
      });

      this.logger.log(
        `✅ Upload confirmado: ${path} (${actualSize} bytes, hash: ${actualHashMd5})`,
      );

      return {
        ...media,
        mime_type: media.mimeType,
        fileSize: Number(media.fileSize),
        verified: true,
      };
    } catch (dbError: unknown) {
      this.logger.error("Database Insert Error on confirm: ", dbError);
      throw new BadRequestException(
        `Error guardando metadata: ${errorMessage(dbError)}`,
      );
    }
  }

  /**
   * Obtener un archivo multimedia por ID (con todas sus propiedades).
   */
  async getMediaById(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    });

    if (!media) {
      throw new BadRequestException("Media no encontrada");
    }

    return {
      id: media.id,
      url: media.cdnUrl || media.url,
      filename: media.filename,
      originalFilename: media.originalFilename,
      size: Number(media.fileSize),
      mimeType: media.mimeType,
      mime_type: media.mimeType,
      durationSeconds: media.durationSeconds,
      width: media.width,
      height: media.height,
      storageKey: media.storageKey,
      campaign_id: media.campaign_id,
      campaign: media.campaign
        ? {
            id: media.campaign.id,
            name: media.campaign.name,
            active: media.campaign.active,
            status: media.campaign.status,
          }
        : null,
      status: media.status,
      createdAt: media.createdAt,
      qrUrl: media.qrUrl,
    };
  }

  /**
   * Desvincular un archivo de su campaña actual.
   */
  async unlinkMediaFromCampaign(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new BadRequestException("Media no encontrada");
    }

    if (!media.campaign_id) {
      throw new BadRequestException(
        "El archivo no está asignado a ninguna campaña",
      );
    }

    // Verificar que la campaña existe
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: media.campaign_id },
      select: {
        id: true,
        active: true,
        status: true,
        targetAll: true,
        isGlobal: true,
      },
    });

    if (!campaign) {
      throw new BadRequestException("Campaña no encontrada");
    }

    // Desvincular
    await this.prisma.media.update({
      where: { id },
      data: { campaign_id: null },
    });

    // Invalidar caché de campaña y forzar sync
    await this.prisma.campaign.update({
      where: { id: media.campaign_id },
      data: { updatedAt: new Date() },
    });

    // Broadcast a dispositivos
    let devicesToSync = [];
    if (campaign.targetAll || campaign.isGlobal) {
      devicesToSync = await this.prisma.device.findMany({
        where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
        select: { id: true, deviceId: true },
      });
    } else {
      const assignments = await this.prisma.deviceCampaign.findMany({
        where: { campaign_id: media.campaign_id },
        include: { device: { select: { deviceId: true } } },
      });
      devicesToSync = assignments.map((a) => ({
        id: a.device_id,
        deviceId: a.device.deviceId,
      }));
    }

    if (devicesToSync.length > 0) {
      await this.prisma.deviceCommand.createMany({
        data: devicesToSync.map((d) => ({
          deviceId: d.id,
          commandType: "FORCE_SYNC",
          commandParams: JSON.stringify({
            reason: "media_unlinked",
            campaignId: media.campaign_id,
            mediaId: id,
          }),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        })),
      });

      this.supabaseService
        .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
          reason: "media_unlinked",
          campaignId: media.campaign_id,
          mediaId: id,
          targets: devicesToSync.map((d) => d.deviceId),
        })
        .catch(() => {});
    }

    return { success: true };
  }
}
