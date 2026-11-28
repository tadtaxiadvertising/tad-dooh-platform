import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Res,
  UseGuards,
} from "@nestjs/common";
import { SyncService } from "./sync.service";
import { Public } from "../auth/decorators/public.decorator";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";
import type { Response } from "express";

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // The portal JWT is bypassed only for purpose-bound hardware auth.
  // Never issue an OFFLINE_LICENSE based on a guessable deviceId alone.
  @Public()
  @UseGuards(DeviceTokenGuard)
  @Get(":deviceId")
  async getDeviceManifest(
    @Param("deviceId") deviceId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new HttpException("DEVICE_ID_REQUIRED", HttpStatus.BAD_REQUEST);
    }

    // Important: do not return a cached 304 before checking device state,
    // subscription expiry and kill switch. A manifest's ETag describes media
    // changes, NOT license-token validity or device authorization.
    //
    // Always create a fresh time-limited license and explicit current
    // device state. Clients can retain downloaded media independently;
    // the manifest and signed token must never be cached by a proxy.
    const manifest = await this.syncService.getDeviceManifest(deviceId);

    res.setHeader("Cache-Control", "private, no-store");
    if ("killSwitch" in manifest && manifest.killSwitch === true) {
      res.status(HttpStatus.PAYMENT_REQUIRED).json(manifest);
      return;
    }

    // Keep the deterministic media fingerprint for client-side comparison,
    // but do not rely on conditional 304 responses for license renewal.
    res.setHeader("ETag", manifest.etag || "");
    return manifest;
  }
}
