import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssetManifest(deviceId: string) {
    const now = new Date();
    
    // Logic to generate checksum list, filter per device, optimize payload size
    // Grab all active campaigns with media Assets
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

    const manifest = {};
    for (const campaign of activeCampaigns) {
      for (const asset of campaign.mediaAssets) {
        manifest[asset.id] = {
          url: asset.url,
          checksum: asset.checksum,
          size: asset.fileSize,
          type: asset.type,
          filename: asset.filename
        };
      }
    }

    return { 
      manifest, 
      version: activeCampaigns.length > 0 ? activeCampaigns[0].updatedAt.getTime() : 0 
    };
  }
}
