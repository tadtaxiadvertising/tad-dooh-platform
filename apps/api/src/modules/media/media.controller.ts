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
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService } from "./media.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

@Roles(UserRole.ADMIN)
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get("upload-url")
  async getUploadUrl(
    @Query("fileName") fileName: string,
    @Query("fileType") fileType: string,
  ) {
    if (!fileName || !fileType) {
      throw new BadRequestException(
        "fileName and fileType are required query parameters",
      );
    }
    return this.mediaService.generateUploadUrl(fileName, fileType);
  }

  @Post("confirm")
  async confirmUpload(
    @Body()
    body: {
      path: string;
      campaignId?: string;
      expectedSize?: number;
      expectedHashMd5?: string;
      filename?: string;
      qrUrl?: string;
    },
  ) {
    if (!body.path) {
      throw new BadRequestException("path es requerido");
    }
    return this.mediaService.confirmUpload(body);
  }

  @Post("register-bypassed")
  async registerBypassed(@Body() body: any) {
    if (!body.filename || !body.storageKey || !body.publicUrl) {
      throw new BadRequestException(
        "Faltan campos (filename, storageKey, publicUrl)",
      );
    }
    return this.mediaService.registerBypassedMedia(body);
  }

  @Get()
  async getMedia() {
    return this.mediaService.listFiles();
  }

  @Get(":id/status")
  async getStatus(@Param("id") id: string) {
    return this.mediaService.getMediaStatus(id);
  }

  // ✅ Método HTTP estándar — Axios / fetch DELETE
  @Delete(":id")
  async deleteMedia(@Param("id") id: string) {
    return this.mediaService.deleteFile(id);
  }

  // Compatibilidad retroactiva con player tablets antiguas que usan POST
  @Post(":id/delete")
  async deleteMediaAlt(@Param("id") id: string) {
    return this.mediaService.deleteFile(id);
  }

  @Post(":id")
  async deleteMediaPost(@Param("id") id: string) {
    // Para simplificar desde frontend fetchers que a veces confunden verbos
    return this.mediaService.deleteFile(id);
  }

  @Patch(":id")
  async updateMedia(@Param("id") id: string, @Body() dto: { qrUrl: string }) {
    return this.mediaService.updateMedia(id, dto);
  }

  /**
   * PATCH /media/:id/rename — Renombrar archivo multimedia.
   * Valida nombre no vacío y sin caracteres peligrosos.
   */
  @Patch(":id/rename")
  async renameMedia(
    @Param("id") id: string,
    @Body() body: { filename: string },
  ) {
    if (!body.filename) {
      throw new BadRequestException("filename es requerido");
    }
    return this.mediaService.renameFile(id, body.filename);
  }

  /**
   * GET /media/:id — Obtener un archivo por ID (con todas sus propiedades).
   */
  @Get(":id")
  async getMediaById(@Param("id") id: string) {
    return this.mediaService.getMediaById(id);
  }

  /**
   * POST /media/:id/unlink — Desvincular un archivo de su campaña actual.
   */
  @Post(":id/unlink")
  async unlinkMedia(@Param("id") id: string) {
    return this.mediaService.unlinkMediaFromCampaign(id);
  }
}
