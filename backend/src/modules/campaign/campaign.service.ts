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
        targetAll: dto.target_all !== undefined ? dto.target_all : true,
        status: 'ACTIVE',
      },
    });

    if (dto.target_devices && dto.target_devices.length > 0) {
      await this.assignCampaignToDevices(campaign.id, dto.target_devices);
    }

    return campaign;
  }

  async assignCampaignToDevices(campaignId: string, deviceIds: string[]) {
    // 1. Fetch current status of targeted devices to respect 15-slot limit
    const devices = await this.prisma.device.findMany({
       where: { deviceId: { in: deviceIds } },
       select: { id: true, deviceId: true, _count: { select: { campaigns: true } } }
    });

    // 2. Identify available devices (less than 15 ads)
    const availableDevices = devices.filter(d => d._count.campaigns < 15);
    const skippedCount = devices.length - availableDevices.length;
    
    if (skippedCount > 0) {
      console.log(`⚠️ Skipping ${skippedCount} devices because they reached 15-slot limit.`);
    }

    // 3. Clean old assignments for THIS campaign (v1 and v2)
    await this.prisma.playlistItem.deleteMany({ where: { campaignId } });
    await this.prisma.deviceCampaign.deleteMany({ where: { campaign_id: campaignId } });

    // 4. Create new assignments for available devices
    const dataV2 = availableDevices.map(d => ({
      campaign_id: campaignId,
      device_id: d.id
    }));

    const dataV1 = availableDevices.map(d => ({
      campaignId,
      deviceId: d.deviceId
    }));

    if (dataV1.length > 0) {
      await this.prisma.playlistItem.createMany({ data: dataV1 });
    }
    
    if (dataV2.length > 0) {
      await this.prisma.deviceCampaign.createMany({ data: dataV2 });
    }
    
    return { count: dataV2.length, skipped: skippedCount };
  }

  // Revenue Protector: Enforce 15-slot limit on single assignment
  async assignCampaignToDevice(deviceId: string, campaignId: string) {
    const currentCount = await this.prisma.deviceCampaign.count({
      where: { device_id: deviceId }
    });

    if (currentCount >= 15) {
      throw new BadRequestException('Este taxi ya tiene los 15 slots de 30s ocupados.');
    }

    return await this.prisma.deviceCampaign.create({
      data: { device_id: deviceId, campaign_id: campaignId }
    });
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
      include: { mediaAssets: true, media: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { mediaAssets: true, media: true },
    });
  }

  /**
   * Returns a payload of videos specifically assigned to this device (Manual Distribution)
   */
  async getActiveSyncVideos(deviceId: string, deviceCity?: string) {
    const now = new Date();
    
    let activeCampaigns: any[] = [];
    
    try {
      // Try the full query with all relations
      activeCampaigns = await this.prisma.campaign.findMany({
        where: {
          active: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            { targetAll: true },
            { devices: { some: { device_id: deviceId } } },
          ]
        },
        include: {
          mediaAssets: true,
          media: true,
        },
        orderBy: {
          updatedAt: 'desc',
        }
      });
    } catch (primaryError) {
      // Fallback: simplified query without optional relations that may not exist
      try {
        activeCampaigns = await this.prisma.campaign.findMany({
          where: {
            active: true,
            startDate: { lte: now },
            endDate: { gte: now },
            targetAll: true,
          },
          include: {
            mediaAssets: true,
            media: true,
          },
          orderBy: { updatedAt: 'desc' }
        });
      } catch (fallbackError) {
        // Last resort: return empty payload
        return { version: 0, sync_hash: 'error', media_assets: [] };
      }
    }

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return { version: 0, sync_hash: 'empty', media_assets: [] };
    }

    const mediaAssets: any[] = [];
    for (const campaign of activeCampaigns) {
      if ((campaign as any).mediaAssets) {
        mediaAssets.push(...(campaign as any).mediaAssets.map((ma: any) => ({
          ...ma,
          qrUrl: campaign.targetUrl || ma.qrUrl || null,
          campaignId: campaign.id
        })));
      }
      if ((campaign as any).media) {
        // Adapt Media to MediaAsset interface for backward compatibility with tablet
        mediaAssets.push(...(campaign as any).media.map((m: any) => ({
          id: m.id,
          campaignId: m.campaign_id || campaign.id,
          type: 'VIDEO',
          filename: m.filename || m.name || 'unknown.mp4',
          url: m.url || m.cdnUrl || '',
          fileSize: Number(m.size || m.fileSize || 0),
          checksum: m.hash || m.hashMd5 || 'no-checksum',
          duration: Number(m.durationSeconds || 0),
          qrUrl: campaign.targetUrl || m.qrUrl || null,
          version: 1,
          createdAt: m.createdAt
        })));
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

