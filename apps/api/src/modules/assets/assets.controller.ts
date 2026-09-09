import { Controller, Get, Query, Post, Body, UseGuards } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { Public } from "../auth/decorators/public.decorator";
import { DeviceTokenGuard } from "../device/guards/device-token.guard";

@Public() // Tablets fetch manifests without JWT
@Controller("assets")
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // SEC-04: Only authenticated, OPERATIVO devices can fetch their own manifest
  @UseGuards(DeviceTokenGuard)
  @Get("manifest")
  async getAssetManifest(@Query("device_id") deviceId: string) {
    return this.assetsService.getAssetManifest(deviceId);
  }

  @Post("webhook/supabase")
  async handleWebhook(@Body() payload: any) {
    return this.assetsService.handleAssetWebhook(payload);
  }
}
