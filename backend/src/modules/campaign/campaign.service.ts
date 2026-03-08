import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async createCampaign(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        advertiser: dto.advertiser,
        startDate: new Date(dto.start_date),
        endDate: new Date(dto.end_date),
        active: dto.active ?? true,
      },
    });
  }

  async addMediaAsset(campaignId: string, dto: AddMediaAssetDto) {
    return this.prisma.mediaAsset.create({
      data: {
        campaignId,
        type: dto.type,
        filename: dto.filename,
        url: dto.url,
        fileSize: dto.fileSize,
        checksum: dto.checksum,
        duration: dto.duration || null,
        version: 1,
      },
    });
  }

  async getAllCampaigns() {
    return this.prisma.campaign.findMany({
      include: { mediaAssets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { mediaAssets: true },
    });
  }

  /**
   * Returns a flattened payload of all videos belonging to active campaigns
   * whose dates overlap with the current date, and filter them by device location constraints.
   */
  async getActiveSyncVideos(deviceId?: string) {
    const now = new Date();
    
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        mediaAssets: true,
      },
      orderBy: {
        updatedAt: 'desc',
      }
    });

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return { version: 0, media_assets: [] };
    }

    // 1. Check device info if we have a deviceId to enforce Geolocation / Fleet segmentation
    let deviceCity = '';
    if (deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { deviceId },
        select: { city: true }
      });
      deviceCity = device?.city?.toLowerCase() || '';
    }

    const mediaAssets = [];
    for (const campaign of activeCampaigns) {
      // 2. Filter logic for targeted DOOH content deployment
      let isAllowed = true;
      try {
        const targetCitiesArr = JSON.parse(campaign.targetCities || '[]');
        if (targetCitiesArr.length > 0) {
          if (!deviceCity) {
            isAllowed = false; // Device doesn't have a city, but campaign is city-restricted
          } else {
            const hasMatch = targetCitiesArr.some((c: string) => c.toLowerCase() === deviceCity);
            if (!hasMatch) isAllowed = false;
          }
        }
      } catch(e) { /* ignore parse errors, default allow */ }

      if (!isAllowed) continue;

      for (const asset of campaign.mediaAssets) {
        mediaAssets.push({
          id: asset.id,
          url: asset.url,
          duration: asset.duration,
          checksum: asset.checksum,
          type: asset.type,
          filename: asset.filename
        });
      }
    }

    // We use the most recently updated campaign's timestamp as the version baseline 
    const latestUpdate = activeCampaigns[0].updatedAt.getTime();

    return { version: latestUpdate, media_assets: mediaAssets };
  }
}
