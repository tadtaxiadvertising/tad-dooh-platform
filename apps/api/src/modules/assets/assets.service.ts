import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";

const mediaAssetSafeSelect = {
  id: true,
  campaignId: true,
  type: true,
  filename: true,
  url: true,
  fileSize: true,
  checksum: true,
  duration: true,
  version: true,
  createdAt: true,
  qrUrl: true,
  weight: true,
};

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async getAssetManifest(deviceId: string) {
    const now = new Date();

    // SEC-04: Only return assets for campaigns explicitly assigned to this device.
    // Previously, all active campaigns' assets were exposed to any device.
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      select: {
        id: true,
        city: true,
        campaigns: {
          select: { campaign_id: true },
        },
      },
    });

    if (!device) {
      return { manifest: {}, version: 0 };
    }

    const assignedCampaignIds = device.campaigns.map((dc) => dc.campaign_id);

    if (assignedCampaignIds.length === 0) {
      return { manifest: {}, version: 0 };
    }

    // Fetch only the active campaigns that are assigned to this device
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        id: { in: assignedCampaignIds },
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        mediaAssets: { select: mediaAssetSafeSelect },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const manifest: Record<string, any> = {};
    for (const campaign of activeCampaigns) {
      for (const asset of campaign.mediaAssets) {
        manifest[asset.id] = {
          url: asset.url,
          checksum: asset.checksum,
          size: asset.fileSize,
          type: asset.type,
          filename: asset.filename,
        };
      }
    }

    return {
      manifest,
      version:
        activeCampaigns.length > 0 ? activeCampaigns[0].updatedAt.getTime() : 0,
    };
  }

  async handleAssetWebhook(payload: any) {
    this.logger.log(`📥 Webhook recibido: ${JSON.stringify(payload)}`);

    if (
      payload.type === "INVALID_ASSET" ||
      payload.record?.status === "INVALID_ASSET"
    ) {
      const assetId = payload.record?.id || payload.assetId;
      this.logger.warn(
        `⚠️ Asset inválido detectado (ID: ${assetId}). Iniciando recuperación automática...`,
      );

      // 1. Mark the asset as FAILED immediately
      if (assetId) {
        await this.prisma.mediaAsset
          .update({
            where: { id: assetId },
            data: {
              processingStatus: "FAILED",
              validationError:
                "Asset does not meet H.264 requirements or exceeded the limit.",
            },
          })
          .catch((e) =>
            this.logger.error(`Error updating asset: ${e.message}`),
          );
      }

      // 2. NOTE: Auto fallback recovery via Remotion was removed together with
      // tad-remotion. The asset stays FAILED; it is reported to the client and
      // requires manual intervention to regenerate the asset.
      this.logger.warn(
        `⚠️ Auto fallback recovery DISABLED (no tad-remotion available). Asset stays FAILED.`,
      );
    }

    return { received: true };
  }
}
