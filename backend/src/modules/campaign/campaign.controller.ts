import { Controller, Post, Get, Delete, Body, Param, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';
import { Public } from '../auth/decorators/public.decorator';
import { MediaService } from '../media/media.service';

import { PrismaService } from '../prisma/prisma.service';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService
  ) {}

  @Post()
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaignService.createCampaign(dto);
  }

  @Post(':id/assets')
  async addMediaAsset(@Param('id') id: string, @Body() dto: AddMediaAssetDto) {
    console.log(`[CAMPAIGN_ASSETS] Linking to ${id}:`, JSON.stringify(dto));
    try {
      return await this.campaignService.addMediaAsset(id, dto);
    } catch (e) {
      console.error(`[CAMPAIGN_ASSETS] Failed: ${e.message}`);
      throw e;
    }
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Param('id') campaignId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }
    return this.mediaService.uploadFile(file, campaignId);
  }

  @Get()
  async getAllCampaigns() {
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
    // First, get the campaign to check if it's global
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { targetAll: true, isGlobal: true, targetCity: true }
    });

    if (!campaign) return [];

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

    // Also check drivers targeted
    const targetedDriverDevices = await this.prisma.device.findMany({
      where: {
        driver: {
          campaigns: { some: { id: campaignId } }
        }
      }
    });
    
    // Merge both (avoid duplicates)
    const deviceMap = new Map<string, any>();
    
    for (const a of assignments) {
      deviceMap.set(a.device.id, {
        ...a.device,
        assigned_at: a.assigned_at,
        assignment_type: 'DIRECT'
      });
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

    return Array.from(deviceMap.values());
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
      include: { targetDrivers: { select: { id: true, fullName: true, deviceId: true } } }
    });
  }

  // 5. Delete a campaign
  @Delete(':id')
  async deleteCampaign(@Param('id') id: string) {
    // Delete related records first
    await this.prisma.mediaAsset.deleteMany({ where: { campaignId: id } });
    await this.prisma.video.deleteMany({ where: { campaignId: id } });
    await this.prisma.deviceCampaign.deleteMany({ where: { campaign_id: id } });
    await this.prisma.playlistItem.deleteMany({ where: { campaignId: id } });
    await this.prisma.playlist.deleteMany({ where: { campaignId: id } });
    await this.prisma.campaignMetric.deleteMany({ where: { campaignId: id } });
    await this.prisma.media.updateMany({ where: { campaign_id: id }, data: { campaign_id: null } });
    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  // 6. Generic ID lookup MUST BE LAST to avoid route conflicts
  @Get(':id')
  async getCampaignById(@Param('id') id: string) {
    return this.campaignService.getCampaignById(id);
  }
}
