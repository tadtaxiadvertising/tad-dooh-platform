import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';
import * as crypto from 'crypto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  // ... previous methods (createCampaign, addMediaAsset, etc. omitted for brevity if they match)
  // Note: I will include them to ensure the file remains functional.

  async createCampaign(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        advertiser: dto.advertiser,
        startDate: new Date(dto.start_date),
        endDate: new Date(dto.end_date),
        active: dto.active ?? true,
        targetImpressions: dto.target_impressions || 0,
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
   * Includes a `sync_hash` for Delta Sync.
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
      return { version: 0, sync_hash: 'empty', media_assets: [] };
    }

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
      let isAllowed = true;
      try {
        const targetCitiesArr = JSON.parse(campaign.targetCities || '[]');
        if (targetCitiesArr.length > 0) {
          if (!deviceCity) {
            isAllowed = false;
          } else {
            const hasMatch = targetCitiesArr.some((c: string) => c.toLowerCase() === deviceCity);
            if (!hasMatch) isAllowed = false;
          }
        }
      } catch(e) { }

      if (!isAllowed) continue;

      }
    }

    // ============================================
    // SLOT LIMIT VALIDATION (MAX 15)
    // ============================================
    const MAX_SLOTS_PER_DEVICE = 15;
    const finalMediaAssets = mediaAssets.slice(0, MAX_SLOTS_PER_DEVICE);

    // Generate a unique hash based on the IDs and Checksums of the assets
    const hashBase = finalMediaAssets.map(a => `${a.id}:${a.checksum}`).join('|');
    const syncHash = crypto.createHash('md5').update(hashBase).digest('hex');

    const latestUpdate = activeCampaigns[0].updatedAt.getTime();

    return { 
      version: latestUpdate, 
      sync_hash: syncHash,
      media_assets: finalMediaAssets 
    };

  }
}

