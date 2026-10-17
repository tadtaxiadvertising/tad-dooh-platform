import {
  Controller,
  Get,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { SyncService } from "./sync.service";
import { Public } from "../auth/decorators/public.decorator";
import type { Response } from "express";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

@Controller("sync")
export class SyncController {
  private readonly etagCache = new Map<string, CacheEntry>();
  private readonly ttlMs = 5 * 60 * 1000;

  constructor(private readonly syncService: SyncService) {}

  private resolveCachedEtag(deviceId: string, ifNoneMatch?: string): boolean {
    if (!ifNoneMatch) return false;
    const cached = this.etagCache.get(deviceId);
    if (!cached || cached.expiresAt < Date.now()) {
      if (cached) this.etagCache.delete(deviceId);
      return false;
    }
    return cached.value === ifNoneMatch;
  }

  private cacheEtag(deviceId: string, etag: string): void {
    this.etagCache.set(deviceId, {
      value: etag,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  @Public()
  @Get(":deviceId")
  async getDeviceManifest(
    @Param("deviceId") deviceId: string,
    @Headers("if-none-match") ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new HttpException("DEVICE_ID_REQUIRED", HttpStatus.BAD_REQUEST);
    }

    if (this.resolveCachedEtag(deviceId, ifNoneMatch)) {
      res.status(HttpStatus.NOT_MODIFIED).send();
      return;
    }

    const manifest = await this.syncService.getDeviceManifest(deviceId);

    if ((manifest as Record<string, unknown>).killSwitch === true) {
      res.setHeader("Cache-Control", "no-store");
      res.status(HttpStatus.PAYMENT_REQUIRED).json(manifest);
      return;
    }

    const etag = ((manifest as Record<string, unknown>).etag as string) || "";
    this.cacheEtag(deviceId, etag);
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    return manifest;
  }
}
