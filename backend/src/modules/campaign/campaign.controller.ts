import { Controller, Post, Get, Delete, Patch, Body, Param, NotFoundException, UseInterceptors, UploadedFile, Logger, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MediaService } from '../media/media.service';

import { PrismaService } from '../prisma/prisma.service';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService
  ) {}

  @Public() // Catálogo público de marcas (Hub)
  @Get('advertiser/hub')
  async getAdvertiserHub() {
    const advertisers = await this.prisma.advertiser.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        companyName: true,
        category: true,
        whatsapp: true,
        instagram: true,
        websiteUrl: true,
        pedidosYaUrl: true,
        uberEatsUrl: true,
      },
      orderBy: { companyName: 'asc' }
    });
    return advertisers;
  }

  @Public() // Perfil público accesible desde QR (Escaner de pasajero)
  @Get('advertiser/:id/profile')
  async getAdvertiserProfile(@Param('id') id: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        whatsapp: true,
        instagram: true,
        facebook: true,
        websiteUrl: true,
        pedidosYaUrl: true,
        uberEatsUrl: true,
        productsData: true,
      }
    });

    if (!advertiser) throw new NotFoundException('Anunciante no encontrado');

    // Buscar si hay una campaña activa para este anunciante que tenga links personalizados
    // (Buscamos la campaña más reciente por nombre o ID de anunciante si tuviéramos la relación fuerte)
    const activeCampaign = await this.prisma.campaign.findFirst({
      where: { 
        OR: [
          { advertiserId: advertiser.id },
          { advertiser: advertiser.companyName } // Legacy fallback por nombre
        ],
        active: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Si hay campaña, sobreescribimos los links del anunciante con los de la campaña (si existen en la campaña)
    const profile = {
      ...advertiser,
      whatsapp: activeCampaign?.whatsapp || advertiser.whatsapp,
      instagram: activeCampaign?.instagram || advertiser.instagram,
      facebook: activeCampaign?.facebook || advertiser.facebook,
      websiteUrl: activeCampaign?.websiteUrl || advertiser.websiteUrl,
      pedidosYaUrl: activeCampaign?.pedidosYaUrl || advertiser.pedidosYaUrl,
      uberEatsUrl: activeCampaign?.uberEatsUrl || advertiser.uberEatsUrl,
    };

    return profile;
  }

  @Patch(':id')
  @Roles('ADMIN', 'ADVERTISER')
  async updateCampaign(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const { role, entityId } = req.user;
    const campaign = await this.campaignService.getCampaignById(id);
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
      throw new ForbiddenException('No tienes permisos para editar esta campaña');
    }

    return this.campaignService.updateCampaign(id, dto);
  }

  @Post()
  @Roles('ADMIN', 'ADVERTISER')
  async createCampaign(@Body() dto: CreateCampaignDto, @Req() req: any) {
    return this.campaignService.createCampaign(dto, req.user);
  }

  /**
   * Single Source of Truth: Direct Upload & Metadata Sync.
   * El cliente sube directo a Supabase, el backend solo registra metadatos confirmados.
   */
  @Post('register-media')
  @Roles('ADMIN', 'ADVERTISER')
  async registerMedia(@Body() dto: any, @Req() req: any) {
    return this.campaignService.registerDirectMedia(dto, req.user);
  }

  @Post(':id/assets')
  @Roles('ADMIN', 'ADVERTISER')
  async addMediaAsset(@Param('id') id: string, @Body() dto: AddMediaAssetDto, @Req() req: any) {
    const { role, entityId } = req.user;
    const campaign = await this.campaignService.getCampaignById(id);
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
      throw new ForbiddenException('No tienes permisos para agregar archivos a esta campaña');
    }

    return await this.campaignService.addMediaAsset(id, dto);
  }


  @Get()
  @Roles('ADMIN', 'ADVERTISER')
  async getAllCampaigns(@Req() req: any) {
    const { role, entityId } = req.user;
    if (role === 'ADVERTISER') {
       return this.prisma.campaign.findMany({
         where: { advertiserId: entityId },
         include: { mediaAssets: true, media: true },
         orderBy: { createdAt: 'desc' },
       });
    }
    return this.campaignService.getAllCampaigns();
  }

  @Post(':id/assign')
  async assignToDevices(@Param('id') id: string, @Body('deviceIds') deviceIds: string[]) {
    return this.campaignService.assignCampaignToDevices(id, deviceIds);
  }

  // 1. Mapa de Calor / Distribución por Campaña
  @Get('stats/:id/distribution')
  async getCampaignDistribution(@Param('id') id: string) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
        select: { name: true }
      });

      if (!campaign) throw new NotFoundException('Campaña no encontrada');

      const distributions = await this.prisma.deviceCampaign.findMany({
        where: { campaign_id: id }
      });

      // Quick fallback mechanism to support previous v1 deployments during schema sync
      if (distributions.length === 0) {
        const v1Dist = await this.prisma.playlistItem.findMany({
          where: { campaignId: id }
        });
        
        const deviceIds = v1Dist.map(v => v.deviceId);
        const devices = await this.prisma.device.findMany({
          where: { deviceId: { in: deviceIds } }
        });

        const assignedTaxis = devices.map(d => ({
          id: d.id,
          deviceId: d.deviceId,
          taxiNumber: d.taxiNumber || d.deviceId,
          driverName: 'No asignado',
          status: d.status,
          last_heartbeat: d.lastHeartbeat,
          is_online: d.lastHeartbeat 
            ? (new Date().getTime() - new Date(d.lastHeartbeat).getTime() < 300000) 
            : false
        }));

        return {
          campaign_name: campaign.name,
          total_screens: assignedTaxis.length,
          monthly_revenue: assignedTaxis.length * 1500,
          taxis: assignedTaxis
        };
      }

      // V2 Real Map extraction using DeviceUUIDs directly from explicit assignments
      const deviceUuids = distributions.map(d => d.device_id || (d as any).deviceId);
      const devices = await this.prisma.device.findMany({
        where: { id: { in: deviceUuids.filter(Boolean) } }
      });

      const assignedTaxis = devices.map(d => ({
        id: d.id,
        deviceId: d.deviceId,
        taxiNumber: d.taxiNumber || d.deviceId,
        driverName: 'No asignado',
        status: d.status,
        last_heartbeat: d.lastHeartbeat,
        is_online: d.lastHeartbeat 
          ? (new Date().getTime() - new Date(d.lastHeartbeat).getTime() < 300000) 
          : false
      }));

      return {
        campaign_name: campaign.name,
        total_screens: assignedTaxis.length,
        monthly_revenue: assignedTaxis.length * 1500,
        taxis: assignedTaxis
      };
    } catch (e) {
      console.error('DISTRIBUTION_ERROR:', e.message);
      throw e;
    }
  }

  // 2. Reporte de Cobertura — Pantallas que reciben esta campaña
  @Get(':campaignId/devices')
  async getCampaignDevices(@Param('campaignId') campaignId: string) {
    console.log(`[CAMPAIGN_DEBUG] Fetching devices for campaign: ${campaignId}`);
    // First, get the campaign to check if it's global
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { targetAll: true, isGlobal: true, targetCity: true, name: true }
    });

    if (!campaign) {
      console.warn(`[CAMPAIGN_DEBUG] Campaign ${campaignId} NOT FOUND`);
      return [];
    }
    console.log(`[CAMPAIGN_DEBUG] Campaign: ${campaign.name}, targetAll: ${campaign.targetAll}, isGlobal: ${campaign.isGlobal}`);

    // If global → return ALL active devices
    if (campaign.targetAll || campaign.isGlobal) {
      const allDevices = await this.prisma.device.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { lastSeen: 'desc' }
      });

      return allDevices.map(d => ({
        ...d,
        assigned_at: null, // Global → no explicit assignment date
        assignment_type: 'GLOBAL'
      }));
    }

    // Otherwise → only explicitly assigned devices
    const assignments = await this.prisma.deviceCampaign.findMany({
      where: { campaign_id: campaignId },
      include: {
        device: true, 
      },
    });
    console.log(`[CAMPAIGN_DEBUG] Explicit assignments found: ${assignments.length}`);

    // Also check drivers targeted
    const targetedDriverDevices = await this.prisma.device.findMany({
      where: {
        driver: {
          campaigns: { some: { id: campaignId } }
        }
      }
    });
    console.log(`[CAMPAIGN_DEBUG] Driver targeted devices found: ${targetedDriverDevices.length}`);
    
    // Merge both (avoid duplicates)
    const deviceMap = new Map<string, any>();
    
    for (const a of assignments) {
      if (a.device) {
        deviceMap.set(a.device.id, {
          ...a.device,
          assigned_at: a.assigned_at,
          assignment_type: 'DIRECT'
        });
      }
    }
    
    for (const d of targetedDriverDevices) {
      if (!deviceMap.has(d.id)) {
        deviceMap.set(d.id, {
          ...d,
          assigned_at: null,
          assignment_type: 'DRIVER'
        });
      }
    }

    const result = Array.from(deviceMap.values());
    console.log(`[CAMPAIGN_DEBUG] Final merged device list: ${result.length}`);
    return result;
  }

  // 3. Playlist Personalizada para Tablet (Segmentación por Chofer)
  @Public()
  @Get('tablet/:deviceId/playlist')
  async getTabletPlaylist(@Param('deviceId') deviceId: string) {
    // Buscar el dispositivo y su chofer asociado
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ deviceId }, { id: deviceId }] },
      include: { driver: true }
    });

    if (!device) {
      return { campaigns: [], message: 'Dispositivo no encontrado' };
    }

    // Si no tiene chofer asignado, solo devolver campañas globales
    const driverId = device.driver?.id;

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        active: true,
        OR: [
          { targetAll: true },
          ...(driverId ? [{ targetDrivers: { some: { id: driverId } } }] : []),
        ]
      },
      select: {
        id: true,
        name: true,
        advertiser: true,
        media: {
          select: {
            id: true,
            url: true,
            name: true,
            mimeType: true,
            hashMd5: true,
          }
        },
        mediaAssets: {
          select: {
            id: true,
            url: true,
            filename: true,
          }
        },
        targetAll: true,
      }
    });

    return {
      deviceId: device.deviceId,
      driverName: device.driver?.fullName || 'Sin chofer',
      totalCampaigns: campaigns.length,
      campaigns,
    };
  }

  // 4. Asignar choferes a una campaña (segmentación)
  @Post(':id/drivers')
  async assignDrivers(
    @Param('id') id: string,
    @Body() body: { driverIds: string[]; targetAll: boolean }
  ) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        targetAll: body.targetAll,
        targetDrivers: {
          set: body.driverIds.map(dId => ({ id: dId })),
        },
      },
      include: { targetDrivers: { select: { id: true, fullName: true } } }
    });
  }

  // 5. Link existing media to a campaign (key for content distribution)
  @Post(':id/link-media')
  async linkMediaToCampaign(
    @Param('id') campaignId: string,
    @Body('mediaId') mediaId: string
  ) {
    if (!mediaId) throw new NotFoundException('mediaId is required');
    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: { campaign_id: campaignId },
    });
    
    // Invalidate campaign cache and force sync devices
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
          commandParams: JSON.stringify({ reason: 'media_linked' }),
        }))
      });
    }

    Logger.log(`[CONTENT_DIST] Linked media ${mediaId} → campaign ${campaignId}`);
    return { success: true, media: updated };
  }

  // 5.1. Unlink media from a campaign
  @Post(':id/unlink-media')
  async unlinkMediaFromCampaign(
    @Param('id') campaignId: string,
    @Body('mediaId') mediaId: string
  ) {
    if (!mediaId) throw new NotFoundException('mediaId is required');
    let success = false;
    
    // Attempt to unlink from Media (v2)
    try {
      const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
      if (media && media.campaign_id === campaignId) {
        await this.prisma.media.update({
          where: { id: mediaId },
          data: { campaign_id: null },
        });
        success = true;
      }
    } catch(e) { /* ignore */ }

    // Attempt to delete MediaAsset (v1)
    if (!success) {
      try {
        const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
        if (asset && asset.campaignId === campaignId) {
          await this.prisma.mediaAsset.delete({ where: { id: mediaId } });
          success = true;
        }
      } catch(e) { /* ignore */ }
    }

    if (!success) {
      // Intenta borrar por checksum para la compatibilidad
      try {
        await this.prisma.mediaAsset.deleteMany({
          where: { checksum: mediaId, campaignId: campaignId }
        });
        success = true;
      } catch(e) { /* ignore */ }
    }

    if (success) {
      // Invalidate campaign cache and force sync
      const campaign = await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { updatedAt: new Date() }
      });
      
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
            commandParams: JSON.stringify({ reason: 'media_unlinked' }),
          }))
        });
      }
      Logger.log(`[CONTENT_DIST] Unlinked/deleted media ${mediaId} from campaign ${campaignId}`);
    }

    return { success: true };
  }

  // 6. Delete a campaign
  @Delete(':id')
  @Roles('ADMIN', 'ADVERTISER')
  async deleteCampaign(@Param('id') id: string, @Req() req: any) {
    const { role, entityId } = req.user;
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
      throw new ForbiddenException('No tienes permisos para eliminar esta campaña');
    }

    // Delete related records first
    await this.prisma.mediaAsset.deleteMany({ where: { campaignId: id } });
    await this.prisma.video.deleteMany({ where: { campaignId: id } });
    await this.prisma.deviceCampaign.deleteMany({ where: { campaign_id: id } });
    await this.prisma.playlistItem.deleteMany({ where: { campaignId: id } });
    await this.prisma.playlist.deleteMany({ where: { campaignId: id } });
    await this.prisma.campaignMetric.deleteMany({ where: { campaignId: id } });
    await this.prisma.media.updateMany({ where: { campaign_id: id }, data: { campaign_id: null } });
    return this.prisma.campaign.delete({ where: { id } });
  }

  @Get('reports/summary')
  @Roles('ADMIN', 'ADVERTISER')
  async getReportsSummary(@Req() req: any) {
    const { role, entityId } = req.user;
    const advertiserId = role === 'ADVERTISER' ? entityId : undefined;
    return this.campaignService.getCampaignReports(advertiserId);
  }

  // 6. Generic ID lookup MUST BE LAST to avoid route conflicts
  @Get(':id')
  @Roles('ADMIN', 'ADVERTISER')
  async getCampaignById(@Param('id') id: string, @Req() req: any) {
    const { role, entityId } = req.user;
    const campaign = await this.campaignService.getCampaignById(id);
    
    if (!campaign) throw new NotFoundException('Campaña no encontrada');

    if (role === 'ADVERTISER' && campaign.advertiserId !== entityId) {
       throw new ForbiddenException('No tienes permisos para ver esta campaña');
    }
    
    return campaign;
  }
}
