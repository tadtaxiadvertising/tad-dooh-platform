import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import * as crypto from 'crypto';
import { BUSINESS_RULES } from '../../common/constants/business-rules';
import { AuthUser } from '../auth/auth.types';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ... previous methods (createCampaign, addMediaAsset, etc. omitted for brevity if they match)
  // Note: I will include them to ensure the file remains functional.

  async updateCampaign(id: string, dto: Partial<CreateCampaignDto> & { target_devices?: string[]; active?: boolean; target_city?: string; target_all?: boolean; advertiser_id?: string }) {
    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.advertiser) data.advertiser = dto.advertiser;
    if (dto.advertiser_id) data.advertiserId = dto.advertiser_id;
    if (dto.start_date) data.startDate = new Date(dto.start_date);
    if (dto.end_date) data.endDate = new Date(dto.end_date);
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.target_all !== undefined) data.targetAll = dto.target_all;
    if (dto.target_city) data.targetCity = dto.target_city;
    if (dto.budget !== undefined) data.budget = Number(dto.budget);
    if (dto.target_impressions !== undefined) data.targetImpressions = Number(dto.target_impressions);
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp;
    if (dto.instagram !== undefined) data.instagram = dto.instagram;
    if (dto.facebook !== undefined) data.facebook = dto.facebook;
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl;
    if (dto.pedidosYaUrl !== undefined) data.pedidosYaUrl = dto.pedidosYaUrl;
    if (dto.uberEatsUrl !== undefined) data.uberEatsUrl = dto.uberEatsUrl;

    const campaign = await this.prisma.campaign.update({
      where: { id },
      data,
    });

    if (dto.target_devices) {
      await this.assignCampaignToDevices(id, dto.target_devices);
    } else {
      let devicesToSync = [];
      if (campaign.targetAll || campaign.isGlobal) {
        devicesToSync = (await this.prisma.device.findMany({ where: { status: 'ACTIVE' }, select: { id: true, deviceId: true } }));
      } else {
        // Broadcast to both v1 and v2 assignments
        const assignmentsV2 = await this.prisma.deviceCampaign.findMany({ where: { campaign_id: id }, select: { device_id: true } });
        const assignmentsV1 = await this.prisma.playlistItem.findMany({ where: { campaignId: id }, include: { device: { select: { id: true } } } });
        
        const uniqueDeviceIds = new Set([
          ...assignmentsV2.map(a => a.device_id),
          ...assignmentsV1.map(a => a.device.id)
        ]);
        
        devicesToSync = Array.from(uniqueDeviceIds).map(id => ({ id }));
      }

      if (devicesToSync.length > 0) {
        await this.prisma.deviceCommand.createMany({
          data: devicesToSync.map(d => ({
            deviceId: d.id, // Device Command needs UUID usually
            commandType: 'FORCE_SYNC',
            commandParams: JSON.stringify({ reason: 'campaign_updated' }),
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
          }))
        });
      }
    }

    if (campaign.status === 'ACTIVE') {
      await this.prisma.refreshActiveCampaignsView();
      this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
        reason: 'campaign_updated',
        campaignId: id
      }).catch(() => {});
    }

    return campaign;
  }

  async createCampaign(dto: CreateCampaignDto, user?: AuthUser) {
    const isAdmin = user?.role === 'ADMIN';
    const isAdvertiser = user?.role === 'ADVERTISER';
    let assignedAdvertiser = dto.advertiser;
    let assignedAdvertiserId = dto.advertiser_id; // Support explicit ID from DTO
    let initialStatus = dto.active ? 'ACTIVE' : 'DRAFT';

    if (isAdvertiser && user?.entityId) {
       assignedAdvertiserId = user.entityId;
       // We can optionally fetch the company name to sync the 'advertiser' field (v1 fallback)
       const advertiser = await this.prisma.advertiser.findUnique({ where: { id: user.entityId } });
       assignedAdvertiser = advertiser?.companyName || assignedAdvertiser;
       initialStatus = 'PENDING_REVIEW';
    } else if (!isAdmin && user?.email && !assignedAdvertiserId) {
      const advertiser = await this.prisma.advertiser.findUnique({ where: { email: user.email } });
      if (advertiser) {
        assignedAdvertiserId = advertiser.id;
        assignedAdvertiser = advertiser.companyName;
      }
      initialStatus = 'PENDING_REVIEW';
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        advertiser: assignedAdvertiser,
        advertiserId: assignedAdvertiserId,
        startDate: new Date(dto.start_date),
        endDate: new Date(dto.end_date),
        active: initialStatus === 'ACTIVE',
        status: initialStatus,
        targetImpressions: dto.target_impressions || 0,
        budget: dto.budget || 0,
        targetAll: dto.target_all !== undefined ? dto.target_all : false,
        targetCity: dto.target_city || 'Global',
        category: dto.category || 'General',
        whatsapp: dto.whatsapp,
        instagram: dto.instagram,
        facebook: dto.facebook,
        websiteUrl: dto.websiteUrl,
        pedidosYaUrl: dto.pedidosYaUrl,
        uberEatsUrl: dto.uberEatsUrl,
      } as any,
    });

    // TAD-ADMIN: Distribución Inteligente de Inventario
    // Si no se pasaron dispositivos pero hay ciudad, auto-asignamos usando prioridad ORO > PLATA > BASE
    let devicesToAssign = dto.target_devices || [];
    
    if (devicesToAssign.length === 0 && !dto.target_all && dto.target_city) {
      this.logger.log(`🤖 Auto-asignando dispositivos para campaña ${campaign.id} en ${dto.target_city}`);
      const limit = Math.floor((dto.budget || 3000) / 3000) || 10; // Estimado de pantallas según presupuesto
      const optimalDevices = await this.getOptimalDevicesForCampaign(dto.target_city, limit);
      devicesToAssign = optimalDevices.map(d => d.deviceId);
    }

    if (devicesToAssign.length > 0) {
      await this.assignCampaignToDevices(campaign.id, devicesToAssign);
    }

    if (campaign.status === 'ACTIVE') {
      await this.prisma.refreshActiveCampaignsView();
      this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
        reason: 'campaign_created',
        campaignId: campaign.id
      }).catch(() => {});
    }

    return campaign;
  }

  async assignCampaignToDevices(campaignId: string, idOrHwIds: string[]) {
    // 1. Fetch devices using either UUID (id) or Hardware ID (deviceId)
    const devices = await this.prisma.device.findMany({
       where: { 
         OR: [
           { id: { in: idOrHwIds } },
           { deviceId: { in: idOrHwIds } }
         ]
       },
       select: { id: true, deviceId: true, _count: { select: { campaigns: true } } }
    });

    if (devices.length === 0 && idOrHwIds.length > 0) {
      this.logger.warn(`⚠️ No devices found for ${idOrHwIds.length} provided IDs.`);
    }

    // 2. Identify available devices (respecting the limit)
    const availableDevices = devices.filter(d => d._count.campaigns < BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER);
    const skippedCount = devices.length - availableDevices.length;
    
    // 3. TRANSACTIONAL UPDATE: Clean old and insert new
    return await this.prisma.$transaction(async (tx) => {
      // Clear all existing assignments for this campaign
      await tx.playlistItem.deleteMany({ where: { campaignId } });
      await tx.deviceCampaign.deleteMany({ where: { campaign_id: campaignId } });

      // Update the campaign's updatedAt to trigger cache invalidation
      await tx.campaign.update({
        where: { id: campaignId },
        data: { updatedAt: new Date() }
      });

      if (availableDevices.length === 0) return { count: 0, skipped: skippedCount };

      // Create new assignments (V1 Legacy & V2 Core)
      const dataV1 = availableDevices.map(d => ({ campaignId, deviceId: d.deviceId }));
      const dataV2 = availableDevices.map(d => ({ campaign_id: campaignId, device_id: d.id }));

      await tx.playlistItem.createMany({ data: dataV1 });
      await tx.deviceCampaign.createMany({ data: dataV2 });

      // Create FORCE_SYNC commands to wake tablets and trigger instant sync
      // We send to UUID (id) because DeviceCommand relation uses UUID
      const commands = availableDevices.map(d => ({
        deviceId: d.id,
        commandType: 'FORCE_SYNC',
        commandParams: JSON.stringify({ reason: 'campaign_assigned', campaignId, deviceId: d.deviceId }),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
      }));
      await tx.deviceCommand.createMany({ data: commands });

      // BROADCAST REALTIME: Send WAKE_UP_CALL to fleet_sync channel
      this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
        reason: 'campaign_assigned',
        campaignId,
        targets: availableDevices.map(d => d.deviceId)
      }).catch(e => this.logger.warn(`Realtime broadcast failed: ${e.message}`));

      return { count: availableDevices.length, skipped: skippedCount };
    });
  }

  // Revenue Protector: Enforce 15-slot limit on single assignment
  async assignCampaignToDevice(deviceId: string, campaignId: string) {
    const currentCount = await this.prisma.deviceCampaign.count({
      where: { device_id: deviceId }
    });

    if (currentCount >= BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER) {
      throw new BadRequestException(`Este taxi ya tiene los ${BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER} slots de 30s ocupados.`);
    }

    return await this.prisma.deviceCampaign.create({
      data: { device_id: deviceId, campaign_id: campaignId }
    });
  }

  /**
   * Registra metadatos de archivos subidos directamente a Supabase sin tocar la RAM.
   */
  async registerDirectMedia(dto: { brandId: string; fileName: string; url: string; fileSize?: number; storagePath: string }, user?: AuthUser) {
    if (user?.role !== 'ADMIN' && user?.email && dto.brandId) {
      const advertiser = await this.prisma.advertiser.findUnique({ where: { email: user.email } });
      if (!advertiser || advertiser.id !== dto.brandId) {
        throw new BadRequestException('No tiene permisos para registrar contenido en esta marca');
      }
    }

    if (dto.fileSize && Number(dto.fileSize) > BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException(`El archivo excede el límite permitido de ${BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`);
    }

    const media = await this.prisma.media.create({
      data: {
        filename: dto.fileName,
        originalFilename: dto.fileName,
        url: dto.url,
        fileSize: dto.fileSize ? Math.round(Number(dto.fileSize)) : 0,
        storageKey: dto.storagePath,
        status: 'READY'
      }
    });

    return { success: true, media };
  }

  async addMediaAsset(campaignId: string, dto: AddMediaAssetDto) {
    // Inventory Control: If targeted to specific devices, check their current slots
    const deviceId = (dto as any).deviceId;
    if (deviceId) {
      const activeData = await this.getActiveSyncVideos(deviceId);
      if (activeData.media_assets.length >= BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER) {
        throw new BadRequestException(`Pantalla llena (Límite de ${BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER} slots alcanzado)`);
      }
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        campaignId,
        type: dto.type,
        filename: dto.filename,
        url: dto.url,
        fileSize: Math.round(Number(dto.fileSize || 0)),
        checksum: dto.checksum || 'manual-upload',
        duration: Math.round(Number(dto.duration || 30)),
        version: 1,
      },
    });

    // Invalidate campaign cache
    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { updatedAt: new Date() }
    });

    // Create FORCE_SYNC commands for assigned devices
    let devicesToSync = [];
    if (campaign.targetAll || campaign.isGlobal) {
      devicesToSync = (await this.prisma.device.findMany({ where: { status: 'ACTIVE' }, select: { id: true } }));
    } else {
      const assignments = await this.prisma.deviceCampaign.findMany({ where: { campaign_id: campaignId } });
      devicesToSync = assignments.map(a => ({ id: a.device_id }));
    }

    if (devicesToSync.length > 0) {
      await this.prisma.deviceCommand.createMany({
        data: devicesToSync.map(d => ({
          deviceId: d.id,
          commandType: 'FORCE_SYNC',
          commandParams: JSON.stringify({ reason: 'media_asset_added', campaignId, assetId: asset.id }),
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
        }))
      });
    } else {
      // For global campaigns (targetAll/isGlobal), there are no explicit device assignments.
      // Queue FORCE_SYNC for ALL active devices so they pull the new content on next heartbeat.
      const allActiveDevices = await this.prisma.device.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      });
      if (allActiveDevices.length > 0) {
        await this.prisma.deviceCommand.createMany({
          data: allActiveDevices.map(d => ({
            deviceId: d.id,
            commandType: 'FORCE_SYNC',
            commandParams: JSON.stringify({ reason: 'global_media_asset_added', campaignId, assetId: asset.id }),
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
          }))
        });
      }
    }

    // BROADCAST WAKE_UP_CALL only if not rendering
    const isRendering = dto.status === 'RENDERING';
    
    if (!isRendering) {
      this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
        reason: 'media_asset_added',
        campaignId,
        assetId: asset.id,
        count: devicesToSync.length
      }).catch(() => {});
    } else {
      Logger.log(`[CONTENT_DIST] MediaAsset ${asset.id} is rendering. WAKE_UP_CALL deferred.`);
    }

    return asset;
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
    this.logger.log(`🕒 Sync Internal Clock: ${now.toISOString()} (${now.getTime()})`);
    
    // 1. Resolve Identity: Find the device by Hardware ID or UUID
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ id: deviceIdOrUuid }, { deviceId: deviceIdOrUuid }] },
      select: { id: true, deviceId: true, city: true, driverId: true }
    });

    if (!device) {
      this.logger.warn(`⚠️ getActiveSyncVideos: Device '${deviceIdOrUuid}' NOT FOUND in DB. Check if registerDevice was called first.`);
      return { version: 0, sync_hash: 'not-found', media_assets: [] };
    }

    const uuid = device.id;
    const hwId = device.deviceId;
    const city = deviceCity || device.city || 'Santiago';
    const driverId = device.driverId;
    this.logger.log(`🔎 Sync for device: hwId=${hwId}, uuid=${uuid}, city=${city}, driverId=${driverId || 'none'}`);

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
    } catch (primaryError: any) {
      this.logger.error(`❌ getActiveSyncVideos primary query failed: ${primaryError?.message}`);
      // Fallback
      activeCampaigns = await this.prisma.campaign.findMany({
        where: { active: true, targetAll: true },
        include: { mediaAssets: true, media: true, videos: true },
        orderBy: { updatedAt: 'desc' }
      });
    }

    this.logger.log(`📊 Campaigns found for ${hwId}: ${activeCampaigns.length} total.`);
    activeCampaigns.forEach(c => {
      const assetsCount = (c.mediaAssets?.length || 0) + (c.media?.length || 0) + (c.videos?.length || 0);
      this.logger.log(`   📂 Campaign "${c.name}" [${c.id}] | active=${c.active} | targetAll=${c.targetAll} | assets=${assetsCount} | dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`);
    });

    if (!activeCampaigns || activeCampaigns.length === 0) {
      this.logger.warn(`⚠️ No active campaigns found for device ${hwId}. Check campaign dates, active flag, and device assignments.`);
      return { version: 0, sync_hash: 'empty', media_assets: [] };
    }

    const mediaAssets: any[] = [];
    for (const campaign of activeCampaigns) {
      const mapMediaAsset = (ma: any) => ({
        id: ma.id || ma.checksum || `asset-${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        filename: ma.filename || ma.name || ma.title || 'video.mp4',
        url: ma.cdnUrl || ma.url || '',
        checksum: ma.hashMd5 || ma.hash || ma.checksum || 'no-checksum',
        hashMd5: ma.hashMd5 || ma.hash || ma.checksum || null,
        duration: Number(ma.duration || 30),
        qrUrl: campaign.targetUrl || ma.qrUrl || null,
        advertiserId: campaign.advertiserRef?.id || campaign.advertiserId || null,
        advertiserName: campaign.advertiserRef?.companyName || campaign.advertiser || 'TAD Advertiser'
      });

      if ((campaign as any).mediaAssets) mediaAssets.push(...campaign.mediaAssets.map(mapMediaAsset));
      if ((campaign as any).media) mediaAssets.push(...campaign.media.map(mapMediaAsset));
      if ((campaign as any).videos) mediaAssets.push(...campaign.videos.map(mapMediaAsset));
    }

    const MAX_SLOTS = BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER;
    const finalMediaAssets = mediaAssets.slice(0, MAX_SLOTS);
    const hashBase = finalMediaAssets.map(a => `${a.id}:${a.checksum || 'no-checksum'}`).join('|');
    const syncHash = crypto.createHash('md5').update(hashBase).digest('hex');
    const latestUpdate = activeCampaigns[0].updatedAt.getTime();

    return {
      version: latestUpdate,
      sync_hash: syncHash,
      media_assets: finalMediaAssets
    };
  }

  async getCampaignReports(advertiserId?: string, startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (advertiserId) {
      where.campaign = { advertiserId };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const metrics = await this.prisma.campaignMetric.findMany({
      where,
      include: {
        campaign: {
          select: { name: true, advertiser: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    const summary = metrics.reduce((acc: any, curr) => {
      acc.impressions += curr.totalImpressions;
      acc.completions += curr.totalCompletions;
      return acc;
    }, { impressions: 0, completions: 0 });

    const byDate = metrics.reduce((acc: any, curr) => {
      const day = curr.date.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { date: day, impressions: 0, completions: 0 };
      acc[day].impressions += curr.totalImpressions;
      acc[day].completions += curr.totalCompletions;
      return acc;
    }, {});

    const byCity = metrics.reduce((acc: any, curr) => {
      const city = curr.city || 'Desconocido';
      if (!acc[city]) acc[city] = { city, impressions: 0 };
      acc[city].impressions += curr.totalImpressions;
      return acc;
    }, {});

    return {
      summary,
      timeSeries: Object.values(byDate),
      geographic: Object.values(byCity),
      totalRecords: metrics.length
    };
  }

  async linkMediaToCampaign(campaignId: string, mediaId: string) {
    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: { campaign_id: campaignId },
    });

    const campaign = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { updatedAt: new Date() }
    });

    let devicesToSync = [];
    if (campaign.targetAll || campaign.isGlobal) {
      devicesToSync = await this.prisma.device.findMany({ where: { status: 'ACTIVE' }, select: { id: true, deviceId: true } });
    } else {
      const assignments = await this.prisma.deviceCampaign.findMany({ 
        where: { campaign_id: campaignId },
        include: { device: { select: { deviceId: true } } }
      });
      devicesToSync = assignments.map(a => ({ id: a.device_id, deviceId: a.device.deviceId }));
    }

    if (devicesToSync.length > 0) {
      await this.prisma.deviceCommand.createMany({
        data: devicesToSync.map(d => ({
          deviceId: d.id,
          commandType: 'FORCE_SYNC',
          commandParams: JSON.stringify({ reason: 'media_linked', campaignId, mediaId }),
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
        }))
      });

      // REALTIME BROADCAST
      this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
        reason: 'media_linked',
        campaignId,
        mediaId,
        targets: devicesToSync.map(d => d.deviceId)
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * TAD-ADMIN: Distribución de Inventario (Algoritmo de Prioridad)
   * Filtra por ciudad y aplica prioridad por nivel del chofer (ORO > PLATA > BASE)
   */
  async getOptimalDevicesForCampaign(campaignCity: string, limit: number) {
    const devices = await this.prisma.device.findMany({
      where: {
        city: campaignCity === 'Global' ? undefined : campaignCity,
        status: 'ACTIVE',
        connectivityStatus: 'ONLINE',
      },
      include: {
        driver: {
          select: { level: true },
        },
        _count: {
          select: { campaigns: true },
        },
      },
    });

    // Filtrar los que ya tienen el máximo de campañas
    const availableDevices = devices.filter(
      (d) => d._count.campaigns < BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER,
    );

    // Ordenar por Nivel (ORO: 3, PLATA: 2, BASE: 1)
    const priorityMap: Record<string, number> = {
      [BUSINESS_RULES.LEVELS.ORO.label]: BUSINESS_RULES.LEVELS.ORO.priority,
      [BUSINESS_RULES.LEVELS.PLATA.label]: BUSINESS_RULES.LEVELS.PLATA.priority,
      [BUSINESS_RULES.LEVELS.BASE.label]: BUSINESS_RULES.LEVELS.BASE.priority,
    };

    availableDevices.sort((a, b) => {
      const priorityA = priorityMap[a.driver?.level || 'BASE'] || 0;
      const priorityB = priorityMap[b.driver?.level || 'BASE'] || 0;
      return priorityB - priorityA; // Descendente
    });

    return availableDevices.slice(0, limit);
  }

  /**
   * TAD-ADVERTISER: Simulador de Presupuesto
   */
  async simulateImpact(budgetRD: number, city: string) {
    const avgCpm = 1500; // Referencia de costo por campaña
    const estimatedImpactsPerScreen = 10000; // Estimación mensual por pantalla

    // Contar pantallas disponibles en la zona
    const onlineScreensCount = await this.prisma.device.count({
      where: {
        city: city === 'Global' ? undefined : city,
        status: 'ACTIVE',
        connectivityStatus: 'ONLINE',
      },
    });

    const recommendedScreens = Math.min(
      onlineScreensCount,
      Math.floor(budgetRD / avgCpm),
    );

    const totalEstimatedImpacts = recommendedScreens * estimatedImpactsPerScreen;

    return {
      budget: budgetRD,
      city,
      recommendedScreens,
      estimatedImpacts: totalEstimatedImpacts,
      onlineScreensInZone: onlineScreensCount,
    };
  }
}

