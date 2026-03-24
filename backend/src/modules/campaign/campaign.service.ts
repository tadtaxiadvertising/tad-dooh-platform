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
        targetCity: dto.target_city || 'Global',
        category: dto.category || 'General',
        whatsapp: dto.whatsapp,
        instagram: dto.instagram,
        facebook: dto.facebook,
        websiteUrl: dto.websiteUrl,
        pedidosYaUrl: dto.pedidosYaUrl,
        uberEatsUrl: dto.uberEatsUrl,
        status: 'ACTIVE',
      } as any,
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
  async getActiveSyncVideos(deviceIdOrUuid: string, deviceCity?: string) {
    const now = new Date();
    console.log(`🕒 Sync Internal Clock: ${now.toISOString()} (${now.getTime()})`);
    
    // 1. Resolve Identity: Find the device by Hardware ID or UUID
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: deviceIdOrUuid }, { deviceId: deviceIdOrUuid }] },
      select: { id: true, deviceId: true, city: true, driverId: true }
    });

    if (!device) {
      console.warn(`⚠️ getActiveSyncVideos: Device '${deviceIdOrUuid}' NOT FOUND in DB. Check if registerDevice was called first.`);
      return { version: 0, sync_hash: 'not-found', media_assets: [] };
    }

    const uuid = device.id;
    const hwId = device.deviceId;
    const city = deviceCity || device.city || 'Santo Domingo';
    const driverId = device.driverId;
    console.log(`🔎 Sync for device: hwId=${hwId}, uuid=${uuid}, city=${city}, driverId=${driverId || 'none'}`);

    let activeCampaigns: any[] = [];
    
    try {
      // 2. Hybrid Query: Universal Campaigns + Geofencing + Manual (v1/v2) Assignments
      activeCampaigns = await this.prisma.campaign.findMany({
        where: {
          active: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            // Canal Global
            { targetAll: true, OR: [{ targetCity: 'Global' }, { targetCity: city }] },
            // Canal Directo (v2 UUID)
            { devices: { some: { device_id: uuid } } },
            // Canal Legacy (v1 Hardware ID)
            { targets: { some: { deviceId: hwId } } },
            // Canal Segmentado (v2 Segmentación por Conductor)
            ...(driverId ? [{ targetDrivers: { some: { id: driverId } } }] : [])
          ]
        } as any,
        include: {
          mediaAssets: true,
          media: true,
          videos: true,
          advertiserRef: true,
        },
        orderBy: { updatedAt: 'desc' }
      });
    } catch (primaryError) {
      console.error(`❌ getActiveSyncVideos primary query failed: ${primaryError?.message}`);
      // Fallback
      activeCampaigns = await this.prisma.campaign.findMany({
        where: { active: true, targetAll: true },
        include: { mediaAssets: true, media: true, videos: true },
        orderBy: { updatedAt: 'desc' }
      });
    }

    console.log(`📊 Campaigns found for ${hwId}: ${activeCampaigns.length} total.`);
    activeCampaigns.forEach(c => {
      const assetsCount = ((c as any).mediaAssets?.length || 0) + ((c as any).media?.length || 0) + ((c as any).videos?.length || 0);
      console.log(`   📂 Campaign "${c.name}" [${c.id}] | active=${c.active} | targetAll=${c.targetAll} | assets=${assetsCount} | dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`);
    });

    if (!activeCampaigns || activeCampaigns.length === 0) {
      console.warn(`⚠️ No active campaigns found for device ${hwId}. Check campaign dates, active flag, and device assignments.`);
      return { version: 0, sync_hash: 'empty', media_assets: [] };
    }

    const mediaAssets: any[] = [];
    for (const campaign of activeCampaigns) {
      const mapMediaAsset = (ma: any) => ({
        id: ma.id || ma.checksum || `asset-${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        filename: ma.filename || ma.name || ma.title || 'video.mp4',
        url: ma.url || ma.cdnUrl || '',
        duration: Number(ma.duration || 30),
        qrUrl: campaign.targetUrl || ma.qrUrl || null,
        advertiserId: campaign.advertiserRef?.id || campaign.advertiserId || null,
        advertiserName: campaign.advertiserRef?.companyName || campaign.advertiser || 'TAD Advertiser'
      });

      if ((campaign as any).mediaAssets) mediaAssets.push(...campaign.mediaAssets.map(mapMediaAsset));
      if ((campaign as any).media) mediaAssets.push(...campaign.media.map(mapMediaAsset));
      if ((campaign as any).videos) mediaAssets.push(...campaign.videos.map(mapMediaAsset));
    }

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

