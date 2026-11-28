import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  NotFoundException,
  Logger,
  Req,
  ForbiddenException,
} from "@nestjs/common";

import { CampaignService } from "./campaign.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { AddMediaAssetDto } from "./dto/add-media-asset.dto";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/decorators/roles.decorator";
import { MediaService } from "../media/media.service";
import { withLegacyCampaignMedia } from "../media/media-mime-contract";
import { PrismaService } from "../prisma/prisma.service";
import { VideoGeneratorService } from "./video-generator.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import type { Device } from "@prisma/client";

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
} as const;

const mediaSafeSelect = {
  id: true,
  name: true,
  filename: true,
  originalFilename: true,
  mimeType: true,
  durationSeconds: true,
  width: true,
  height: true,
  storageKey: true,
  url: true,
  cdnUrl: true,
  hash: true,
  hashMd5: true,
  hashSha256: true,
  campaign_id: true,
  status: true,
  createdAt: true,
  qrUrl: true,
};

/**
 * Only operational coverage data belongs in advertiser-facing API responses.
 * Never query or serialize Device.authToken, GPS coordinates, or driver PII.
 * Admin campaign screens use id, deviceId, taxiNumber, city and sync dates.
 */
const campaignCoverageDeviceSelect = {
  id: true,
  deviceId: true,
  taxiNumber: true,
  city: true,
  status: true,
  lastHeartbeat: true,
  lastSeen: true,
  lastSync: true,
} as const;

type CampaignCoverageDevice = Pick<
  Device,
  | "id"
  | "deviceId"
  | "taxiNumber"
  | "city"
  | "status"
  | "lastHeartbeat"
  | "lastSeen"
  | "lastSync"
>;

/**
 * Advertisers may keep their own QR / commerce links current, but must never
 * change ownership, active status, pricing, targeting or device assignments.
 * Admin campaign edits use the original full DTO and retain existing behavior.
 */
const ALLOWED_ADVERTISER_CAMPAIGN_PATCH_FIELDS = new Set([
  "whatsapp",
  "instagram",
  "facebook",
  "websiteUrl",
  "pedidosYaUrl",
  "uberEatsUrl",
]);

@Controller("campaigns")
@Roles(UserRole.ADMIN, UserRole.ADVERTISER)
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly videoGenerator: VideoGeneratorService,
  ) {}

  @Public() // Catálogo público de marcas (Hub)
  @Get("advertiser/hub")
  async getAdvertiserHub() {
    const advertisers = await this.prisma.advertiser.findMany({
      where: { status: "ACTIVE" },
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
      orderBy: { companyName: "asc" },
    });
    return advertisers;
  }

  @Public() // Perfil público accesible desde QR (Escaner de pasajero)
  @Get("advertiser/:id/profile")
  async getAdvertiserProfile(@Param("id") id: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        status: true,
        whatsapp: true,
        instagram: true,
        facebook: true,
        websiteUrl: true,
        pedidosYaUrl: true,
        uberEatsUrl: true,
        productsData: true,
      },
    });

    // The QR landing is public. Never expose inactive advertisers or
    // internal contact names. Only published commerce details may be returned.
    if (!advertiser || advertiser.status !== "ACTIVE") {
      throw new NotFoundException("Anunciante no encontrado");
    }

    // Public QR overrides must belong to this advertiser by immutable ID.
    // Name-based matching can select an unrelated brand with the same name.
    // Campaign.active defaults to true, so require published status as well.
    const now = new Date();
    const activeCampaign = await this.prisma.campaign.findFirst({
      where: {
        advertiserId: advertiser.id,
        status: "ACTIVE",
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        whatsapp: true,
        instagram: true,
        facebook: true,
        websiteUrl: true,
        pedidosYaUrl: true,
        uberEatsUrl: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Si hay campaña, sobreescribimos los links del anunciante con los de la campaña (si existen en la campaña)
    const profile = {
      id: advertiser.id,
      companyName: advertiser.companyName,
      productsData: advertiser.productsData,
      whatsapp: activeCampaign?.whatsapp || advertiser.whatsapp,
      instagram: activeCampaign?.instagram || advertiser.instagram,
      facebook: activeCampaign?.facebook || advertiser.facebook,
      websiteUrl: activeCampaign?.websiteUrl || advertiser.websiteUrl,
      pedidosYaUrl: activeCampaign?.pedidosYaUrl || advertiser.pedidosYaUrl,
      uberEatsUrl: activeCampaign?.uberEatsUrl || advertiser.uberEatsUrl,
    };

    return profile;
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async updateCampaign(
    @Param("id") id: string,
    @Body() dto: Parameters<CampaignService["updateCampaign"]>[1],
    @Req() req: AuthenticatedRequest,
  ) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    if (role !== UserRole.ADMIN && role !== UserRole.ADVERTISER) {
      throw new ForbiddenException("Rol no autorizado para editar campañas.");
    }
    const campaign = await this.campaignService.getCampaignById(id);
    if (!campaign) throw new NotFoundException("Campaña no encontrada");

    if (role === UserRole.ADVERTISER) {
      if (!entityId || campaign.advertiserId !== entityId) {
        throw new ForbiddenException(
          "No tienes permisos para editar esta campaña",
        );
      }

      // Fail closed on any unexpected/privileged property, even if the
      // current CampaignService happens to ignore it. A client must not
      // smuggle "active", "advertiser_id", "budget" or target_devices.
      if (!dto || typeof dto !== "object" || Array.isArray(dto)) {
        throw new ForbiddenException(
          "Solo se permite editar enlaces comerciales de la campaña.",
        );
      }
      const entries = Object.entries(dto);
      if (
        entries.length === 0 ||
        entries.some(
          ([field, value]) =>
            !ALLOWED_ADVERTISER_CAMPAIGN_PATCH_FIELDS.has(field) ||
            typeof value !== "string" ||
            value.length > 2048,
        )
      ) {
        throw new ForbiddenException(
          "Solo se permite editar enlaces comerciales de la campaña.",
        );
      }
    }

    return this.campaignService.updateCampaign(id, dto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.campaignService.createCampaign(dto, req.user);
  }

  /**
   * Single Source of Truth: Direct Upload & Metadata Sync.
   * El cliente sube directo a Supabase, el backend solo registra metadatos confirmados.
   */
  @Post("register-media")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async registerMedia(
    @Body() dto: Parameters<CampaignService["registerDirectMedia"]>[0],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.campaignService.registerDirectMedia(dto, req.user);
  }

  @Post("simulate-budget")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async simulateBudget(@Body() body: { budgetRD: number; city: string }) {
    return this.campaignService.simulateImpact(body.budgetRD, body.city);
  }

  @Post(":id/generate-video")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async generateVideo(
    @Param("id") id: string,
    @Body()
    props: {
      logoUrl: string;
      brandColor: string;
      primaryText: string;
      secondaryText: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    const campaign = await this.campaignService.getCampaignById(id);
    if (!campaign) throw new NotFoundException("Campaña no encontrada");

    if (role === "ADVERTISER" && campaign.advertiserId !== entityId) {
      throw new ForbiddenException(
        "No tienes permisos para generar video en esta campaña",
      );
    }

    return this.videoGenerator.generateAdVideo(id, props);
  }

  @Post(":id/assets")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async addMediaAsset(
    @Param("id") id: string,
    @Body() dto: AddMediaAssetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    const campaign = await this.campaignService.getCampaignById(id);
    if (!campaign) throw new NotFoundException("Campaña no encontrada");

    if (role === "ADVERTISER" && campaign.advertiserId !== entityId) {
      throw new ForbiddenException(
        "No tienes permisos para agregar archivos a esta campaña",
      );
    }

    return await this.campaignService.addMediaAsset(id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getAllCampaigns(@Req() req: AuthenticatedRequest) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    if (role === UserRole.ADVERTISER) {
      // Never fall through to the admin-wide campaign listing if an
      // advertiser's validated identity is incomplete or missing.
      if (typeof entityId !== "string" || !entityId.trim()) {
        throw new ForbiddenException("Perfil de anunciante inválido.");
      }
      const campaigns = await this.prisma.campaign.findMany({
        where: { advertiserId: entityId },
        include: {
          mediaAssets: { select: mediaAssetSafeSelect },
          media: { select: mediaSafeSelect },
        },
        orderBy: { createdAt: "desc" },
      });
      return campaigns.map(withLegacyCampaignMedia);
    }
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "Rol no autorizado para consultar campañas.",
      );
    }
    return this.campaignService.getAllCampaigns();
  }

  @Post(":id/assign")
  @Roles(UserRole.ADMIN)
  async assignToDevices(
    @Param("id") id: string,
    @Body("deviceIds") deviceIds: string[],
  ) {
    return this.campaignService.assignCampaignToDevices(id, deviceIds);
  }

  // 1. Mapa de Calor / Distribución por Campaña
  @Get("stats/:id/distribution")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getCampaignDistribution(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
        select: { name: true, advertiserId: true },
      });

      if (!campaign) throw new NotFoundException("Campaña no encontrada");
      // Validate tenancy before fetching assignments or device information.
      if (
        req.user?.role === UserRole.ADVERTISER &&
        campaign.advertiserId !== req.user.entityId
      ) {
        throw new ForbiddenException(
          "No tienes permisos para ver esta distribución",
        );
      }

      const distributions = await this.prisma.deviceCampaign.findMany({
        where: { campaign_id: id },
      });

      // Quick fallback mechanism to support previous v1 deployments during schema sync
      if (distributions.length === 0) {
        const v1Dist = await this.prisma.playlistItem.findMany({
          where: { campaignId: id },
        });

        const deviceIds = v1Dist.map((v) => v.deviceId);
        const devices = await this.prisma.device.findMany({
          where: { deviceId: { in: deviceIds } },
          select: campaignCoverageDeviceSelect,
        });

        const assignedTaxis = devices.map((d) => ({
          id: d.id,
          deviceId: d.deviceId,
          taxiNumber: d.taxiNumber || d.deviceId,
          driverName: "No asignado",
          status: d.status,
          last_heartbeat: d.lastHeartbeat,
          is_online: d.lastHeartbeat
            ? new Date().getTime() - new Date(d.lastHeartbeat).getTime() <
              300000
            : false,
        }));

        return {
          campaign_name: campaign.name,
          total_screens: assignedTaxis.length,
          monthly_revenue:
            assignedTaxis.length *
            BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
          taxis: assignedTaxis,
        };
      }

      // V2 Real Map extraction using DeviceUUIDs directly from explicit assignments
      const deviceUuids = distributions.map(
        (d) => d.device_id || (d as typeof d & { deviceId?: string }).deviceId,
      );
      const devices = await this.prisma.device.findMany({
        where: {
          id: { in: deviceUuids.filter((id): id is string => Boolean(id)) },
        },
        select: campaignCoverageDeviceSelect,
      });

      const assignedTaxis = devices.map((d) => ({
        id: d.id,
        deviceId: d.deviceId,
        taxiNumber: d.taxiNumber || d.deviceId,
        driverName: "No asignado",
        status: d.status,
        last_heartbeat: d.lastHeartbeat,
        is_online: d.lastHeartbeat
          ? new Date().getTime() - new Date(d.lastHeartbeat).getTime() < 300000
          : false,
      }));

      return {
        campaign_name: campaign.name,
        total_screens: assignedTaxis.length,
        monthly_revenue:
          assignedTaxis.length * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
        taxis: assignedTaxis,
      };
    } catch (e) {
      console.error("DISTRIBUTION_ERROR:", e.message);
      throw e;
    }
  }

  // 2. Reporte de Cobertura — Pantallas que reciben esta campaña
  @Get(":campaignId/devices")
  async getCampaignDevices(
    @Param("campaignId") campaignId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    console.log(
      `[CAMPAIGN_DEBUG] Fetching devices for campaign: ${campaignId}`,
    );
    // First, get the campaign to check if it's global
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        targetAll: true,
        isGlobal: true,
        targetCity: true,
        name: true,
        advertiserId: true,
      },
    });

    if (!campaign) {
      console.warn(`[CAMPAIGN_DEBUG] Campaign ${campaignId} NOT FOUND`);
      return [];
    }

    // M7: un advertiser solo puede ver dispositivos de sus PROPIAS campañas.
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    if (role === "ADVERTISER" && campaign.advertiserId !== entityId) {
      throw new ForbiddenException(
        "No tienes permisos para ver los dispositivos de esta campaña",
      );
    }
    console.log(
      `[CAMPAIGN_DEBUG] Campaign: ${campaign.name}, targetAll: ${campaign.targetAll}, isGlobal: ${campaign.isGlobal}`,
    );

    // If global → return ALL active devices
    if (campaign.targetAll || campaign.isGlobal) {
      const allDevices = await this.prisma.device.findMany({
        where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
        orderBy: { lastSeen: "desc" },
        select: campaignCoverageDeviceSelect,
      });

      return allDevices.map((d) => ({
        ...d,
        assigned_at: null, // Global → no explicit assignment date
        assignment_type: "GLOBAL",
      }));
    }

    // Otherwise → only explicitly assigned devices
    const assignments = await this.prisma.deviceCampaign.findMany({
      where: { campaign_id: campaignId },
      include: {
        device: { select: campaignCoverageDeviceSelect },
      },
    });
    console.log(
      `[CAMPAIGN_DEBUG] Explicit assignments found: ${assignments.length}`,
    );

    // Also check drivers targeted
    const targetedDriverDevices = await this.prisma.device.findMany({
      where: {
        driver: {
          campaigns: { some: { id: campaignId } },
        },
      },
      select: campaignCoverageDeviceSelect,
    });
    console.log(
      `[CAMPAIGN_DEBUG] Driver targeted devices found: ${targetedDriverDevices.length}`,
    );

    // Merge both (avoid duplicates)
    const deviceMap = new Map<
      string,
      CampaignCoverageDevice & {
        assigned_at: Date | null;
        assignment_type: string;
      }
    >();

    for (const a of assignments) {
      if (a.device) {
        deviceMap.set(a.device.id, {
          ...a.device,
          assigned_at: a.assigned_at,
          assignment_type: "DIRECT",
        });
      }
    }

    for (const d of targetedDriverDevices) {
      if (!deviceMap.has(d.id)) {
        deviceMap.set(d.id, {
          ...d,
          assigned_at: null,
          assignment_type: "DRIVER",
        });
      }
    }

    const result = Array.from(deviceMap.values());
    console.log(`[CAMPAIGN_DEBUG] Final merged device list: ${result.length}`);
    return result;
  }

  // 3. Playlist Personalizada para Tablet (Segmentación por Chofer)
  @Public()
  @Get("tablet/:deviceId/playlist")
  async getTabletPlaylist(@Param("deviceId") deviceId: string) {
    // Buscar el dispositivo y su chofer asociado
    const device = await this.prisma.device.findFirst({
      where: { OR: [{ deviceId }, { id: deviceId }] },
      include: { driver: true },
    });

    if (!device) {
      return { campaigns: [], message: "Dispositivo no encontrado" };
    }

    // Si no tiene chofer asignado, solo devolver campañas globales
    const driverId = device.driver?.id;

    const campaigns = await this.prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        active: true,
        OR: [
          { targetAll: true },
          ...(driverId ? [{ targetDrivers: { some: { id: driverId } } }] : []),
        ],
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
          },
        },
        mediaAssets: {
          select: {
            id: true,
            url: true,
            filename: true,
          },
        },
        targetAll: true,
      },
    });

    return {
      deviceId: device.deviceId,
      driverName: device.driver?.fullName || "Sin chofer",
      totalCampaigns: campaigns.length,
      campaigns,
    };
  }

  // 4. Asignar choferes a una campaña (segmentación)
  @Post(":id/drivers")
  @Roles(UserRole.ADMIN)
  async assignDrivers(
    @Param("id") id: string,
    @Body() body: { driverIds: string[]; targetAll: boolean },
  ) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        targetAll: body.targetAll,
        targetDrivers: {
          set: body.driverIds.map((dId) => ({ id: dId })),
        },
      },
      include: { targetDrivers: { select: { id: true, fullName: true } } },
    });
  }

  // 5. Link existing media to a campaign (key for content distribution)
  @Post(":id/link-media")
  async linkMediaToCampaign(
    @Param("id") campaignId: string,
    @Body("mediaId") mediaId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!mediaId) throw new NotFoundException("mediaId is required");
    // M7: validar ownership antes de linkear media a la campaña.
    await this.assertCampaignOwnership(req, campaignId);
    return this.campaignService.linkMediaToCampaign(campaignId, mediaId);
  }

  // 5.1. Unlink media from a campaign
  @Post(":id/unlink-media")
  async unlinkMediaFromCampaign(
    @Param("id") campaignId: string,
    @Body("mediaId") mediaId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!mediaId) throw new NotFoundException("mediaId is required");
    // M7: validar ownership antes de desvincular media de la campaña.
    await this.assertCampaignOwnership(req, campaignId);
    let success = false;

    // Attempt to unlink from Media (v2)
    try {
      const media = await this.prisma.media.findUnique({
        where: { id: mediaId },
      });
      if (media && media.campaign_id === campaignId) {
        await this.prisma.media.update({
          where: { id: mediaId },
          data: { campaign_id: null },
        });
        success = true;
      }
    } catch (e) {
      /* ignore */
    }

    // Attempt to delete MediaAsset (v1)
    if (!success) {
      try {
        const asset = await this.prisma.mediaAsset.findUnique({
          where: { id: mediaId },
        });
        if (asset && asset.campaignId === campaignId) {
          await this.prisma.mediaAsset.delete({ where: { id: mediaId } });
          success = true;
        }
      } catch (e) {
        /* ignore */
      }
    }

    if (!success) {
      // Intenta borrar por checksum para la compatibilidad
      try {
        await this.prisma.mediaAsset.deleteMany({
          where: { checksum: mediaId, campaignId: campaignId },
        });
        success = true;
      } catch (e) {
        /* ignore */
      }
    }

    if (success) {
      // Invalidate campaign cache and force sync
      const campaign = await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { updatedAt: new Date() },
      });

      let devicesToSync = [];
      if (campaign.targetAll || campaign.isGlobal) {
        devicesToSync = await this.prisma.device.findMany({
          where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
          select: { id: true },
        });
      } else {
        const assignments = await this.prisma.deviceCampaign.findMany({
          where: { campaign_id: campaignId },
        });
        devicesToSync = assignments.map((a) => ({ id: a.device_id }));
      }

      if (devicesToSync.length > 0) {
        await this.prisma.deviceCommand.createMany({
          data: devicesToSync.map((d) => ({
            deviceId: d.id,
            commandType: "FORCE_SYNC",
            commandParams: JSON.stringify({ reason: "media_unlinked" }),
          })),
        });
      }
      Logger.log(
        `[CONTENT_DIST] Unlinked/deleted media ${mediaId} from campaign ${campaignId}`,
      );
    }

    return { success: true };
  }

  // 6. Delete a campaign
  @Delete(":id")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async deleteCampaign(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException("Campaña no encontrada");

    if (role === "ADVERTISER" && campaign.advertiserId !== entityId) {
      throw new ForbiddenException(
        "No tienes permisos para eliminar esta campaña",
      );
    }

    // M6: borrado atómico — envolver TODOS los deletes en una $transaction.
    // Antes cada deleteMany corría por separado: un fallo a mitad de camino
    // dejaba registros huérfanos referenciando una campaña inexistente.
    return this.prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.mediaAsset.deleteMany({ where: { campaignId: id } });
      await tx.video.deleteMany({ where: { campaignId: id } });
      await tx.deviceCampaign.deleteMany({ where: { campaign_id: id } });
      await tx.playlistItem.deleteMany({ where: { campaignId: id } });
      await tx.playlist.deleteMany({ where: { campaignId: id } });
      await tx.campaignMetric.deleteMany({ where: { campaignId: id } });
      await tx.media.updateMany({
        where: { campaign_id: id },
        data: { campaign_id: null },
      });
      return tx.campaign.delete({ where: { id } });
    });
  }

  @Get("reports/summary")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getReportsSummary(@Req() req: AuthenticatedRequest) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    const advertiserId = role === "ADVERTISER" ? entityId : undefined;
    return this.campaignService.getCampaignReports(advertiserId);
  }

  @Post("intent")
  @Public()
  async createIntent(
    @Body()
    createCampaignIntentDto: Parameters<CampaignService["createIntent"]>[0],
  ) {
    return this.campaignService.createIntent(createCampaignIntentDto);
  }

  // 6. Generic ID lookup MUST BE LAST to avoid route conflicts
  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getCampaignById(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    const campaign = await this.campaignService.getCampaignById(id);

    if (!campaign) throw new NotFoundException("Campaña no encontrada");

    if (role === "ADVERTISER" && campaign.advertiserId !== entityId) {
      throw new ForbiddenException("No tienes permisos para ver esta campaña");
    }

    return campaign;
  }

  // M7: valida que un ADVERTISER sea dueño de la campaña antes de operar sobre ella.
  private async assertCampaignOwnership(
    req: AuthenticatedRequest,
    campaignId: string,
  ): Promise<void> {
    const role = req.user?.role;
    const entityId = req.user?.entityId;
    if (role !== "ADVERTISER") return; // ADMIN puede operar sobre cualquier campaña
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiserId: true },
    });
    if (!campaign) throw new NotFoundException("Campaña no encontrada");
    if (campaign.advertiserId !== entityId) {
      throw new ForbiddenException("No tienes permisos sobre esta campaña");
    }
  }
}
