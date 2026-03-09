import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  // ... previous methods (createCampaign, addMediaAsset, etc. omitted for brevity if they match)
  // Note: I will include them to ensure the file remains functional.

  async createCampaign(dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        advertiser: dto.advertiser,
        startDate: new Date(dto.start_date),
        endDate: new Date(dto.end_date),
        active: dto.active ?? true,
        targetImpressions: dto.target_impressions || 0,
        budget: dto.budget || 0,
        status: 'ACTIVE',
      },
    });

    if (dto.target_devices && dto.target_devices.length > 0) {
      await this.assignCampaignToDevices(campaign.id, dto.target_devices);
    }

    return campaign;
  }

  /**
   * Manual Distribution Logic (Point 1 from CTO)
   * This links a campaign to a set of Device IDs.
   */
  async assignCampaignToDevices(campaignId: string, deviceIds: string[]) {
    // 1. Limpiamos asignaciones viejas de esta campaña
    await this.prisma.playlistItem.deleteMany({
      where: { campaignId }
    });

    // 2. Creamos las nuevas asignaciones manuales
    const data = deviceIds.map(deviceId => ({
      campaignId,
      deviceId
    }));

    return this.prisma.playlistItem.createMany({ data });
  }

  async addMediaAsset(campaignId: string, dto: AddMediaAssetDto) {
    // Inventory Control: If targeted to specific devices, check their current slots
    const deviceId = (dto as any).device_id;
    if (deviceId) {
      const activeData = await this.getActiveSyncVideos(deviceId);
      if (activeData.media_assets.length >= 15) {
        throw new BadRequestException("Pantalla llena (Límite de 15 slots alcanzado)");
      }
    }

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
      include: { mediaAssets: true, targets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { mediaAssets: true, targets: true },
    });
  }

  /**
   * Returns a payload of videos specifically assigned to this device (Manual Distribution)
   */
  async getActiveSyncVideos(deviceId?: string) {
    const now = new Date();
    
    // Filter by manual assignment if deviceId is known
    let assignedCampaignIds: string[] | undefined = undefined;
    if (deviceId) {
      const targets = await this.prisma.playlistItem.findMany({
        where: { deviceId },
        select: { campaignId: true }
      });
      assignedCampaignIds = targets.map(t => t.campaignId);
    }

    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        id: assignedCampaignIds ? { in: assignedCampaignIds } : undefined,
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

    const mediaAssets = [];
    for (const campaign of activeCampaigns) {
      if (campaign.mediaAssets) {
        mediaAssets.push(...campaign.mediaAssets);
      }
    }

    // ============================================
    // SLOT LIMIT VALIDATION (MAX 15)
    // ============================================
    const MAX_SLOTS_PER_DEVICE = 15;
    const finalMediaAssets = mediaAssets.slice(0, MAX_SLOTS_PER_DEVICE);

    const hashBase = finalMediaAssets.map(a => `${a.id}:${a.checksum || 'no-checksum'}`).join('|');
    const syncHash = crypto.createHash('md5').update(hashBase).digest('hex');

    const latestUpdate = activeCampaigns[0].updatedAt.getTime();

    return {
      version: latestUpdate,
      sync_hash: syncHash,
      media_assets: finalMediaAssets
    };
  }
}

