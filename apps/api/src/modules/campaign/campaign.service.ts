import { errorMessage } from "../../utils/error.util";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { AddMediaAssetDto } from "./dto/add-media-asset.dto";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SupabaseService } from "../supabase/supabase.service";
import { NotificationsService } from "../notifications/notifications.service";
import * as crypto from "crypto";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import { AuthUser } from "../auth/auth.types";
import {
  calculateAdvertiserOffer,
  calculateImpact,
  ImpactOutput,
} from "@tad/impact-calculator";
import { ReferralService } from "../referral/referral.service";
import type { Prisma } from "@prisma/client";
import {
  deviceIdentityWhere,
  deviceIdentityWhereMany,
} from "./device-identity-lookup";
import { withLegacyCampaignMedia } from "../media/media-mime-contract";

interface SyncMediaAsset {
  id?: string;
  checksum?: string | null;
  filename?: string | null;
  name?: string | null;
  title?: string | null;
  cdnUrl?: string | null;
  url?: string | null;
  hashMd5?: string | null;
  hash?: string | null;
  duration?: number | null;
  qrUrl?: string | null;
  weight?: number | null;
}

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

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly referralService: ReferralService,
  ) {}

  /**
   * Helper: calcular duración máxima de media para una campaña.
   * Por defecto 30 segundos; campañas con duración extendida permiten hasta 60s.
   */
  private getCampaignMaxMediaDuration(campaign: {
    status?: string;
    targetImpressions?: number;
  }): number {
    // Si la campaña tiene más de 100k impresiones objetivo o está en status SPECIAL,
    // permitimos videos de hasta 60 segundos. Caso contrario, 30 segundos estándar.
    if (campaign.targetImpressions && campaign.targetImpressions >= 100000) {
      return 60;
    }
    return 30;
  }

  // ... previous methods (createCampaign, addMediaAsset, etc. omitted for brevity if they match)
  // Note: I will include them to ensure the file remains functional.

  async updateCampaign(
    id: string,
    dto: Partial<CreateCampaignDto> & {
      target_devices?: string[];
      active?: boolean;
      target_city?: string;
      target_all?: boolean;
      advertiser_id?: string;
    },
  ) {
    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.advertiser) data.advertiser = dto.advertiser;
    if (dto.advertiser_id) data.advertiserId = dto.advertiser_id;
    if (dto.start_date) data.startDate = new Date(dto.start_date);
    if (dto.end_date) data.endDate = new Date(dto.end_date);
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.target_all !== undefined) data.targetAll = dto.target_all;
    if (dto.target_city) data.targetCity = dto.target_city;
    if (dto.target_cities !== undefined)
      data.targetCities = dto.target_cities.length > 0 ? dto.target_cities : [];
    if (dto.target_fleets !== undefined)
      data.targetFleets = dto.target_fleets.length > 0 ? dto.target_fleets : [];
    if (dto.budget !== undefined) data.budget = Number(dto.budget);
    if (dto.target_impressions !== undefined)
      data.targetImpressions = Number(dto.target_impressions);
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
        devicesToSync = await this.prisma.device.findMany({
          where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
          select: { id: true, deviceId: true },
        });
      } else {
        // Broadcast to both v1 and v2 assignments
        const assignmentsV2 = await this.prisma.deviceCampaign.findMany({
          where: { campaign_id: id },
          select: { device_id: true },
        });
        const assignmentsV1 = await this.prisma.playlistItem.findMany({
          where: { campaignId: id },
          include: { device: { select: { id: true } } },
        });

        const uniqueDeviceIds = new Set([
          ...assignmentsV2.map((a) => a.device_id),
          ...assignmentsV1.map((a) => a.device.id),
        ]);

        devicesToSync = Array.from(uniqueDeviceIds).map((id) => ({ id }));
      }

      if (devicesToSync.length > 0) {
        await this.prisma.deviceCommand.createMany({
          data: devicesToSync.map((d) => ({
            deviceId: d.id, // Device Command needs UUID usually
            commandType: "FORCE_SYNC",
            commandParams: JSON.stringify({ reason: "campaign_updated" }),
            status: "PENDING",
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          })),
        });
      }
    }

    if (campaign.status === "ACTIVE") {
      await this.prisma.refreshActiveCampaignsView();
      this.supabaseService
        .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
          reason: "campaign_updated",
          campaignId: id,
        })
        .catch(() => {});

      try {
        const adv = await this.prisma.advertiser.findUnique({
          where: { id: campaign.advertiserId || "" },
          select: {
            referredBy: true,
            _count: {
              select: {
                campaigns: {
                  where: { status: "ACTIVE" },
                },
              },
            },
          },
        });

        if (adv && adv.referredBy && adv._count?.campaigns === 1) {
          const driverId = adv.referredBy;

          // Delegar al servicio de referral para bonus idempotente (commission + ledger + wallet)
          await this.referralService.awardAdvertiserReferralBonus(
            driverId,
            campaign.advertiserId || "",
            campaign.id,
          );
          this.logger.log(
            `💸 [REFERRAL_LOOP] Delegated referral bonus for Driver ${driverId} (Advertiser ${campaign.advertiserId} activated 1st campaign)`,
          );
        }
      } catch (err) {
        this.logger.error(
          `❌ [REFERRAL_LOOP] Failed to process referral payout: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return campaign;
  }

  async createCampaign(dto: CreateCampaignDto, user?: AuthUser) {
    const isAdmin = user?.role === "ADMIN";
    const isAdvertiser = user?.role === "ADVERTISER";
    let assignedAdvertiser = dto.advertiser;
    let assignedAdvertiserId = dto.advertiser_id; // Support explicit ID from DTO
    let initialStatus = dto.active ? "ACTIVE" : "DRAFT";

    if (isAdvertiser && user?.entityId) {
      assignedAdvertiserId = user.entityId;
      // We can optionally fetch the company name to sync the 'advertiser' field (v1 fallback)
      const advertiser = await this.prisma.advertiser.findUnique({
        where: { id: user.entityId },
        select: { companyName: true },
      });
      assignedAdvertiser = advertiser?.companyName || assignedAdvertiser;
      initialStatus = "PENDING_REVIEW";
    } else if (!isAdmin && user?.email && !assignedAdvertiserId) {
      const advertiser = await this.prisma.advertiser.findUnique({
        where: { email: user.email },
        select: { id: true, companyName: true },
      });
      if (advertiser) {
        assignedAdvertiserId = advertiser.id;
        assignedAdvertiser = advertiser.companyName;
      }
      initialStatus = "PENDING_REVIEW";
    }

    // REGLA DE NEGOCIO 04: Máximo de campañas activas simultáneas por anunciante
    // FASE 4 FIX: El count + create se envuelve en $transaction con advisory lock.
    // Esto elimina el TOCTOU (Time-Of-Check Time-Of-Use) entre la lectura del
    // conteo y la inserción de la campaña.
    const result = await this.prisma.$transaction(async (tx) => {
      if (assignedAdvertiserId) {
        const activeCount = await tx.campaign.count({
          where: {
            advertiserId: assignedAdvertiserId,
            status: { in: ["ACTIVE", "PENDING_REVIEW", "PENDING_PAYMENT"] },
          },
        });
        if (activeCount >= BUSINESS_RULES.MAX_CAMPAIGNS_PER_ADVERTISER) {
          throw new BadRequestException(
            `Límite alcanzado: ya tienes ${activeCount} campañas activas (máx. ${BUSINESS_RULES.MAX_CAMPAIGNS_PER_ADVERTISER}). Finaliza o pausa una antes de crear otra.`,
          );
        }
      }

      return await tx.campaign.create({
        data: {
          name: dto.name,
          advertiser: assignedAdvertiser,
          advertiserId: assignedAdvertiserId,
          startDate: new Date(dto.start_date),
          endDate: new Date(dto.end_date),
          active: initialStatus === "ACTIVE",
          status: initialStatus,
          targetImpressions: dto.target_impressions || 0,
          budget: dto.budget || 0,
          targetAll: dto.target_all !== undefined ? dto.target_all : false,
          targetCity: dto.target_city || "Global",
          targetCities:
            dto.target_cities && dto.target_cities.length > 0
              ? dto.target_cities
              : [],
          targetFleets:
            dto.target_fleets && dto.target_fleets.length > 0
              ? dto.target_fleets
              : [],
          category: dto.category || "General",
          whatsapp: dto.whatsapp,
          instagram: dto.instagram,
          facebook: dto.facebook,
          websiteUrl: dto.websiteUrl,
          pedidosYaUrl: dto.pedidosYaUrl,
          uberEatsUrl: dto.uberEatsUrl,
        },
      });
    });

    // An advertiser-created campaign is only a REVIEW REQUEST, not sellable
    // inventory. Do not reserve slots, notify drivers, enqueue FORCE_SYNC or
    // broadcast a tablet wake-up until a separate commercial/payment approval
    // workflow has explicitly authorized publication.
    if (result.status === "PENDING_REVIEW") {
      return result;
    }

    // TAD-ADMIN: Distribución Inteligente de Inventario
    // Si no se pasaron dispositivos pero hay ciudad, auto-asignamos usando prioridad ORO > PLATA > BASE
    let devicesToAssign = dto.target_devices || [];

    if (devicesToAssign.length === 0 && !dto.target_all && dto.target_city) {
      this.logger.log(
        `🤖 Auto-asignando dispositivos para campaña ${result.id} en ${dto.target_city}`,
      );
      const limit = Math.floor((dto.budget || 3000) / 3000) || 10; // Estimado de pantallas según presupuesto
      const optimalDevices = await this.getOptimalDevicesForCampaign(
        dto.target_city,
        limit,
      );
      devicesToAssign = optimalDevices.map((d) => d.deviceId);
    }

    if (devicesToAssign.length > 0) {
      await this.assignCampaignToDevices(result.id, devicesToAssign);
    }

    if (result.status === "ACTIVE") {
      await this.prisma.refreshActiveCampaignsView();
      this.supabaseService
        .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
          reason: "campaign_created",
          campaignId: result.id,
        })
        .catch(() => {});
    }

    return result;
  }

  async assignCampaignToDevices(campaignId: string, idOrHwIds: string[]) {
    // 1. Fetch devices using either UUID (id) or Hardware ID (deviceId)
    const devices = await this.prisma.device.findMany({
      where: deviceIdentityWhereMany(idOrHwIds),
      select: { id: true, deviceId: true },
    });

    if (devices.length === 0 && idOrHwIds.length > 0) {
      this.logger.warn(
        `⚠️ No devices found for ${idOrHwIds.length} provided IDs.`,
      );
    }

    // 2. TRANSACTIONAL UPDATE: Clean old, re-check slot limit inside the tx
    // FASE 2 (Item 9): el filtro "14/15 slots" ya NO se lee fuera de la transacción
    // (_count con TOCTOU). Cada device se revalida bajo pg_advisory_xact_lock.
    return await this.prisma.$transaction(async (tx) => {
      // Clear all existing assignments for this campaign
      await tx.playlistItem.deleteMany({ where: { campaignId } });
      await tx.deviceCampaign.deleteMany({
        where: { campaign_id: campaignId },
      });

      // Update the campaign's updatedAt to trigger cache invalidation
      await tx.campaign.update({
        where: { id: campaignId },
        data: { updatedAt: new Date() },
      });

      // Re-count slots por device DENTRO de la tx (Revenue Protector R4)
      const eligible: { id: string; deviceId: string }[] = [];
      for (const d of devices) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"dc:" + d.id})::bigint)`;
        const currentCount = await tx.deviceCampaign.count({
          where: { device_id: d.id },
        });
        if (currentCount < BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER) {
          eligible.push(d);
        }
      }

      const skippedCount = devices.length - eligible.length;
      if (eligible.length === 0) return { count: 0, skipped: skippedCount };

      // Create new assignments (V1 Legacy & V2 Core)
      const dataV1 = eligible.map((d) => ({
        campaignId,
        deviceId: d.deviceId,
      }));
      const dataV2 = eligible.map((d) => ({
        campaign_id: campaignId,
        device_id: d.id,
      }));

      await tx.playlistItem.createMany({ data: dataV1 });
      await tx.deviceCampaign.createMany({ data: dataV2 });

      // Create FORCE_SYNC commands to wake tablets and trigger instant sync
      // We send to UUID (id) because DeviceCommand relation uses UUID
      const commands = eligible.map((d) => ({
        deviceId: d.id,
        commandType: "FORCE_SYNC",
        commandParams: JSON.stringify({
          reason: "campaign_assigned",
          campaignId,
          deviceId: d.deviceId,
        }),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      }));
      await tx.deviceCommand.createMany({ data: commands });

      // BROADCAST REALTIME: Send WAKE_UP_CALL to fleet_sync channel
      this.supabaseService
        .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
          reason: "campaign_assigned",
          campaignId,
          targets: eligible.map((d) => d.deviceId),
        })
        .catch((e) =>
          this.logger.warn(`Realtime broadcast failed: ${e.message}`),
        );

      if (eligible.length > 0) {
        // Notificar driver-specific: UNA query batcheada (fix N+1, A4)
        const boundDrivers = await tx.device.findMany({
          where: { deviceId: { in: eligible.map((d) => d.deviceId) } },
          select: { deviceId: true, driverId: true },
        });
        const driverByDevice = new Map(
          boundDrivers.map((b) => [b.deviceId, b.driverId]),
        );
        await Promise.all(
          eligible.map(async (device) => {
            const bound = driverByDevice.get(device.deviceId);
            if (!bound) return;
            void this.notificationsService
              .sendDriverNotification(bound, "CAMPAIGN_ASSIGNED", {
                campaignId,
                deviceId: device.deviceId,
                assignedAt: new Date().toISOString(),
              })
              .catch((err) =>
                this.logger.warn(
                  `[CAMPAIGN_NOTIFY] ${device.deviceId}: ${err.message}`,
                ),
              );
          }),
        );
      }

      // SRE Optimization: Refresh view so heartbeats get the new state immediately
      this.prisma
        .refreshActiveCampaignsView()
        .catch((e) => this.logger.error(`View refresh failed: ${e.message}`));

      return { count: eligible.length, skipped: skippedCount };
    });
  }

  // Revenue Protector: Enforce 15-slot limit on single assignment
  // FASE 2 (Item 9): el count se valida DENTRO de la transacción bajo
  // pg_advisory_xact_lock(device) — elimina el TOCTOU del count previo.
  async assignCampaignToDevice(deviceId: string, campaignId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Both the hardware ID and database UUID are accepted at the API edge.
      // DeviceCampaign stores the database UUID serialized as TEXT.
      const matches = await tx.device.findMany({
        where: deviceIdentityWhere(deviceId),
        select: { id: true, deviceId: true },
        take: 2,
      });

      if (matches.length === 0) {
        throw new NotFoundException("Dispositivo no encontrado");
      }
      if (matches.length > 1) {
        // A UUID-looking hardware ID can collide with a different device PK.
        // Fail closed rather than assign inventory to an arbitrary device.
        throw new BadRequestException("Identificador de dispositivo ambiguo");
      }

      const canonicalId = matches[0].id;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"dc:" + canonicalId})::bigint)`;

      const currentCount = await tx.deviceCampaign.count({
        where: { device_id: canonicalId },
      });

      if (currentCount >= BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER) {
        throw new BadRequestException(
          `Este taxi ya tiene los ${BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER} slots de 30s ocupados.`,
        );
      }

      return tx.deviceCampaign.create({
        data: { device_id: canonicalId, campaign_id: campaignId },
      });
    });
  }

  /**
   * Single Source of Truth: Registra metadatos de un archivo ya subido a Supabase.
   */
  async registerDirectMedia(
    dto: {
      brandId: string;
      fileName: string;
      url: string;
      fileSize?: number;
      storagePath: string;
    },
    user?: AuthUser,
  ) {
    this.logger.debug(
      `[MEDIA_REG] Intentando registro de ${dto.fileName} (${dto.fileSize} bytes)`,
    );

    // 🛡️ REGLA DE SEGURIDAD 10.2: Validación de Propiedad
    if (user?.role !== "ADMIN") {
      // 1. Intentamos validar por entityId (Token) - Más rápido y seguro
      if (user?.entityId) {
        if (dto.brandId && user.entityId !== dto.brandId) {
          this.logger.warn(
            `[MEDIA_REG] Rechazado: Entidad no coincide. Token=${user.entityId}, DTO=${dto.brandId}`,
          );
          throw new BadRequestException(
            "ID de marca no coincide con tu perfíl de anunciante",
          );
        }
      }
      // 2. Fallback a búsqueda por Email (Base de Datos)
      else if (user?.email && dto.brandId) {
        const advertiser = await this.prisma.advertiser.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (!advertiser || advertiser.id !== dto.brandId) {
          this.logger.warn(
            `[MEDIA_REG] Rechazado: No se encontró anunciante o ID incorrecto para ${user.email}`,
          );
          throw new BadRequestException(
            "No tienes permisos suficientes para esta marca",
          );
        }
      }
    }

    if (
      dto.fileSize &&
      Number(dto.fileSize) > BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES
    ) {
      this.logger.warn(
        `[MEDIA_REG] Archivo demasiado grande: ${dto.fileSize} > ${BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES}`,
      );
      throw new BadRequestException(
        `El archivo excede el límite permitido de ${BUSINESS_RULES.MAX_VIDEO_SIZE_MB}MB`,
      );
    }

    // REGLA DE SEGURIDAD 07: Solo MP4/JPG/PNG como piezas publicitarias
    const ext = (dto.fileName || "").split(".").pop()?.toLowerCase();
    const urlExt = (dto.url || "")
      .split("?")[0]
      .split(".")
      .pop()
      ?.toLowerCase();
    const isAllowed = (e?: string) =>
      e
        ? BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.some(
            (allowed) => allowed === `.${e}`,
          )
        : false;
    const fileExtOk = !dto.fileName || isAllowed(ext);
    const urlExtOk = !dto.url || isAllowed(urlExt);

    if (!fileExtOk || !urlExtOk) {
      this.logger.warn(
        `[MEDIA_REG] Rechazado: extensión no permitida (file=${ext}, url=${urlExt})`,
      );
      throw new BadRequestException(
        `Solo se aceptan piezas ${BUSINESS_RULES.ALLOWED_MEDIA_EXTENSIONS.join(", ")}.`,
      );
    }

    try {
      const media = await this.prisma.media.create({
        data: {
          filename: dto.fileName,
          originalFilename: dto.fileName,
          url: dto.url,
          fileSize: dto.fileSize
            ? BigInt(Math.round(Number(dto.fileSize)))
            : BigInt(0),
          storageKey: dto.storagePath,
          status: "READY",
        },
      });

      this.logger.log(`✅ [MEDIA_REG] Media registrada con éxito: ${media.id}`);
      return { success: true, media };
    } catch (e: unknown) {
      this.logger.error(
        `❌ [MEDIA_REG] Error en base de datos: ${errorMessage(e)}`,
      );
      throw new BadRequestException(
        `Error al guardar en base de datos: ${errorMessage(e)}`,
      );
    }
  }

  async addMediaAsset(campaignId: string, dto: AddMediaAssetDto) {
    // ── Validaciones de negocio ──────────────────────────────────────────────
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        advertiserId: true,
        targetImpressions: true,
        targetAll: true,
        isGlobal: true,
      },
    });
    if (!campaign) {
      throw new BadRequestException("Campaña no encontrada");
    }

    // Validar que el media existe y obtener sus propiedades
    const media = await this.prisma.media.findUnique({
      where: { id: dto.checksum || dto.url },
      select: {
        id: true,
        durationSeconds: true,
        mimeType: true,
        status: true,
        campaign_id: true,
      },
    });

    // Si no se encontró por checksum/url, buscar por filename
    const mediaByFilename = media
      ? media
      : await this.prisma.media.findFirst({
          where: { filename: dto.filename },
          select: {
            id: true,
            durationSeconds: true,
            mimeType: true,
            status: true,
            campaign_id: true,
          },
        });

    if (!mediaByFilename) {
      throw new BadRequestException(
        `Media no encontrado: ni por ID/checksum "${dto.checksum || dto.url}" ni por nombre "${dto.filename}"`,
      );
    }

    // Verificar que el media no esté ya asignado a otra campaña activa
    if (
      mediaByFilename.campaign_id &&
      mediaByFilename.campaign_id !== campaignId
    ) {
      const otherCampaign = await this.prisma.campaign.findUnique({
        where: { id: mediaByFilename.campaign_id },
        select: { id: true, active: true, status: true },
      });
      if (otherCampaign?.active) {
        throw new BadRequestException(
          `El archivo ya está asignado a la campaña activa "${otherCampaign.id}". Desasigna primero o usa otro archivo.`,
        );
      }
    }

    // Validar duración vs. restricciones de campaña
    const maxDuration = this.getCampaignMaxMediaDuration(campaign);
    if (
      mediaByFilename.durationSeconds &&
      mediaByFilename.durationSeconds > maxDuration
    ) {
      throw new BadRequestException(
        `El archivo excede la duración máxima permitida para esta campaña (${maxDuration}s). Duración del archivo: ${mediaByFilename.durationSeconds}s.`,
      );
    }

    // Validar formato MIME
    if (
      mediaByFilename.mimeType &&
      !BUSINESS_RULES.ALLOWED_MEDIA_MIME_TYPES.includes(
        mediaByFilename.mimeType as (typeof BUSINESS_RULES.ALLOWED_MEDIA_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Formato no permitido: ${mediaByFilename.mimeType}. Solo se aceptan MP4 (H.264), JPG o PNG.`,
      );
    }

    // Inventory Control: If targeted to specific devices, check their current slots
    const deviceId =
      "deviceId" in dto && typeof dto.deviceId === "string"
        ? dto.deviceId
        : undefined;
    if (deviceId) {
      const activeData = await this.getActiveSyncVideos(deviceId);
      if (
        activeData.media_assets.length >=
        BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER
      ) {
        throw new BadRequestException(
          `Pantalla llena (Límite de ${BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER} slots alcanzado)`,
        );
      }
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        campaignId,
        type: dto.type ?? "",
        filename: dto.filename,
        url: dto.url,
        fileSize: Math.round(Number(dto.fileSize || 0)),
        checksum: dto.checksum ?? "manual-upload",
        duration: Math.round(Number(dto.duration || 30)),
        version: 1,
      },
    });

    // Invalidate campaign cache
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { updatedAt: new Date() },
    });

    // Create FORCE_SYNC commands for assigned devices
    let devicesToSync: { deviceId: string }[] = [];
    if (campaign.targetAll || campaign.isGlobal) {
      devicesToSync = await this.prisma.device
        .findMany({
          where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
          select: { id: true },
        })
        .then((d) => d.map((dev) => ({ deviceId: dev.id })));
    } else {
      const assignments = await this.prisma.deviceCampaign.findMany({
        where: { campaign_id: campaignId },
      });
      devicesToSync = assignments.map((a) => ({ deviceId: a.device_id }));
    }

    if (devicesToSync.length > 0) {
      await this.prisma.deviceCommand.createMany({
        data: devicesToSync.map((d) => ({
          deviceId: d.deviceId,
          commandType: "FORCE_SYNC",
          commandParams: JSON.stringify({
            reason: "media_asset_added",
            campaignId,
            assetId: asset.id,
          }),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        })),
      });
    } else {
      // For global campaigns (targetAll/isGlobal), there are no explicit device assignments.
      // Queue FORCE_SYNC for ALL active devices so they pull the new content on next heartbeat.
      const allActiveDevices = await this.prisma.device.findMany({
        where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
        select: { id: true },
      });
      if (allActiveDevices.length > 0) {
        await this.prisma.deviceCommand.createMany({
          data: allActiveDevices.map((d) => ({
            deviceId: d.id,
            commandType: "FORCE_SYNC",
            commandParams: JSON.stringify({
              reason: "global_media_asset_added",
              campaignId,
              assetId: asset.id,
            }),
            status: "PENDING",
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          })),
        });
      }
    }

    // BROADCAST WAKE_UP_CALL only if not rendering
    const isRendering = dto.status === "RENDERING";

    if (!isRendering) {
      this.supabaseService
        .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
          reason: "media_asset_added",
          campaignId,
          assetId: asset.id,
          count: devicesToSync.length,
        })
        .catch(() => {});
    } else {
      Logger.log(
        `[CONTENT_DIST] MediaAsset ${asset.id} is rendering. WAKE_UP_CALL deferred.`,
      );
    }

    return asset;
  }

  async getAllCampaigns() {
    const campaigns = await this.prisma.campaign.findMany({
      // SRE Cache Bust: Adding a trivial condition to force PgBouncer to parse a new Prepared Statement
      // after the schedule_days column was added in the database.
      where: { id: { not: "00000000-0000-0000-0000-000000000000" } },
      include: {
        mediaAssets: { select: mediaAssetSafeSelect },
        media: { select: mediaSafeSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return campaigns.map(withLegacyCampaignMedia);
  }

  async getCampaignById(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        mediaAssets: { select: mediaAssetSafeSelect },
        media: { select: mediaSafeSelect },
      },
    });
    return campaign ? withLegacyCampaignMedia(campaign) : null;
  }

  /**
   * Returns a payload of videos specifically assigned to this device (Manual Distribution)
   */
  async getActiveSyncVideos(deviceIdOrUuid: string, deviceCity?: string) {
    const now = new Date();
    this.logger.log(
      `🕒 Sync Internal Clock: ${now.toISOString()} (${now.getTime()})`,
    );

    // 1. Resolve Identity: Find the device by Hardware ID or UUID
    const device = await this.prisma.device.findFirst({
      where: deviceIdentityWhere(deviceIdOrUuid),
      select: { id: true, deviceId: true, city: true, driverId: true },
    });

    if (!device) {
      this.logger.warn(
        `⚠️ getActiveSyncVideos: Device '${deviceIdOrUuid}' NOT FOUND in DB. Check if registerDevice was called first.`,
      );
      return { version: 0, sync_hash: "not-found", media_assets: [] };
    }

    const uuid = device.id;
    const hwId = device.deviceId;
    const city = deviceCity || device.city || "Santiago";
    const driverId = device.driverId;
    this.logger.log(
      `🔎 Sync for device: hwId=${hwId}, uuid=${uuid}, city=${city}, driverId=${driverId || "none"}`,
    );

    let activeCampaigns: Prisma.CampaignGetPayload<{
      include: {
        mediaAssets: { select: typeof mediaAssetSafeSelect };
        media: { select: typeof mediaSafeSelect };
        videos: true;
        advertiserRef: { select: { id: true; companyName: true } };
      };
    }>[] = [];

    try {
      // 2. MASTER SYNC (Materialized View)
      // Pre-calculated targeting avoids complex joins in heartbeats.
      // SRE Anti-OOM: LIMIT 15 en SQL — reduce memoria trasladada desde Postgres.
      const results = await this.prisma.$queryRaw<{ campaign_id: string }[]>`
        SELECT campaign_id FROM mv_active_campaigns
        WHERE active = true 
          AND start_date <= NOW() 
          AND end_date >= NOW()
          AND (
            target_all = true OR 
            target_city = ${city} OR
            target_cities @> ${JSON.stringify([city])}::jsonb OR
            assigned_device_uuids::jsonb @> ${JSON.stringify([uuid])}::jsonb OR
            assigned_hw_ids::jsonb @> ${JSON.stringify([hwId])}::jsonb OR
            (assigned_driver_ids::jsonb @> ${JSON.stringify([driverId])}::jsonb AND ${!!driverId})
          )
        LIMIT 15
      `;

      const campaignIds = results.map((r) => r.campaign_id);

      if (campaignIds.length > 0) {
        activeCampaigns = await this.prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
          include: {
            mediaAssets: { select: mediaAssetSafeSelect },
            media: { select: mediaSafeSelect },
            videos: true,
            advertiserRef: { select: { id: true, companyName: true } },
          },
          orderBy: { updatedAt: "desc" },
        });
      }
    } catch (primaryError: unknown) {
      this.logger.error(
        `❌ getActiveSyncVideos optimized query failed: ${errorMessage(primaryError)}. Falling back to legacy query.`,
      );
      // Fallback to legacy query if view fails
      activeCampaigns = await this.prisma.campaign.findMany({
        where: {
          // Do not expose unapproved or unpaid creative if the MV is unavailable.
          status: "ACTIVE",
          active: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            {
              targetAll: true,
              OR: [{ targetCity: "Global" }, { targetCity: city }],
            },
            { devices: { some: { device_id: uuid } } },
            { targets: { some: { deviceId: hwId } } },
            ...(driverId
              ? [{ targetDrivers: { some: { id: driverId } } }]
              : []),
          ],
        },
        include: {
          mediaAssets: { select: mediaAssetSafeSelect },
          media: { select: mediaSafeSelect },
          videos: true,
          advertiserRef: { select: { id: true, companyName: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    this.logger.log(
      `📊 Campaigns found for ${hwId}: ${activeCampaigns.length} total.`,
    );
    activeCampaigns.forEach((c) => {
      const assetsCount =
        (c.mediaAssets?.length || 0) +
        (c.media?.length || 0) +
        (c.videos?.length || 0);
      this.logger.log(
        `   📂 Campaign "${c.name}" [${c.id}] | active=${c.active} | targetAll=${c.targetAll} | assets=${assetsCount} | dates: ${c.startDate.toISOString()} to ${c.endDate.toISOString()}`,
      );
    });

    if (!activeCampaigns || activeCampaigns.length === 0) {
      this.logger.warn(
        `⚠️ No active campaigns found for device ${hwId}. Check campaign dates, active flag, and device assignments.`,
      );
      return { version: 0, sync_hash: "empty", media_assets: [] };
    }

    const mediaAssets: {
      id: string;
      campaignId: string;
      filename: string;
      url: string;
      checksum: string;
      hashMd5: string | null;
      duration: number;
      qrUrl: string | null;
      advertiserId: string | null;
      advertiserName: string;
      weight: number | null;
    }[] = [];
    for (const campaign of activeCampaigns) {
      const mapMediaAsset = (ma: SyncMediaAsset) => ({
        id:
          ma.id ||
          ma.checksum ||
          `asset-${Math.random().toString(36).substr(2, 9)}`,
        campaignId: campaign.id,
        filename: ma.filename || ma.name || ma.title || "video.mp4",
        url: ma.cdnUrl || ma.url || "",
        checksum: ma.hashMd5 || ma.hash || ma.checksum || "no-checksum",
        hashMd5: ma.hashMd5 || ma.hash || ma.checksum || null,
        duration: Number(ma.duration || 30),
        qrUrl: campaign.targetUrl || ma.qrUrl || null,
        advertiserId:
          campaign.advertiserRef?.id || campaign.advertiserId || null,
        advertiserName:
          campaign.advertiserRef?.companyName ||
          campaign.advertiser ||
          "TAD Advertiser",
        weight: ma.weight ?? null,
      });

      if (campaign.mediaAssets)
        mediaAssets.push(...campaign.mediaAssets.map(mapMediaAsset));
      if (campaign.media)
        mediaAssets.push(...campaign.media.map(mapMediaAsset));
      if (campaign.videos)
        mediaAssets.push(...campaign.videos.map(mapMediaAsset));
    }

    const MAX_SLOTS = BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER;
    const finalMediaAssets = mediaAssets.slice(0, MAX_SLOTS);
    const hashBase = finalMediaAssets
      .map((a) => `${a.id}:${a.checksum || "no-checksum"}`)
      .join("|");
    const syncHash = crypto.createHash("md5").update(hashBase).digest("hex");
    const latestUpdate = activeCampaigns[0].updatedAt.getTime();

    return {
      version: latestUpdate,
      sync_hash: syncHash,
      media_assets: finalMediaAssets,
    };
  }

  async getCampaignReports(
    advertiserId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.CampaignMetricWhereInput = {};
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
          select: { name: true, advertiser: true },
        },
      },
      orderBy: { date: "asc" },
    });

    const summary = metrics.reduce(
      (acc, curr) => {
        acc.impressions += curr.totalImpressions;
        acc.completions += curr.totalCompletions;
        return acc;
      },
      { impressions: 0, completions: 0 },
    );

    const byDate = metrics.reduce(
      (
        acc: Record<
          string,
          { date: string; impressions: number; completions: number }
        >,
        curr,
      ) => {
        const day = curr.date.toISOString().split("T")[0];
        if (!acc[day]) acc[day] = { date: day, impressions: 0, completions: 0 };
        acc[day].impressions += curr.totalImpressions;
        acc[day].completions += curr.totalCompletions;
        return acc;
      },
      {},
    );

    const byCity = metrics.reduce(
      (acc: Record<string, { city: string; impressions: number }>, curr) => {
        const city = curr.city || "Desconocido";
        if (!acc[city]) acc[city] = { city, impressions: 0 };
        acc[city].impressions += curr.totalImpressions;
        return acc;
      },
      {},
    );

    return {
      summary,
      timeSeries: Object.values(byDate),
      geographic: Object.values(byCity),
      totalRecords: metrics.length,
    };
  }

  async linkMediaToCampaign(campaignId: string, mediaId: string) {
    // ── Validaciones de negocio ──────────────────────────────────────────────
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        status: true,
        advertiserId: true,
        targetImpressions: true,
        targetAll: true,
        isGlobal: true,
      },
    });
    if (!campaign) {
      throw new BadRequestException("Campaña no encontrada");
    }

    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        durationSeconds: true,
        mimeType: true,
        status: true,
        campaign_id: true,
      },
    });

    if (!media) {
      throw new BadRequestException("Media no encontrado");
    }

    // Validar que el media no esté ya asignado a otra campaña activa
    if (media.campaign_id && media.campaign_id !== campaignId) {
      const otherCampaign = await this.prisma.campaign.findUnique({
        where: { id: media.campaign_id },
        select: { id: true, active: true, status: true },
      });
      if (otherCampaign?.active) {
        throw new BadRequestException(
          `El archivo ya está asignado a la campaña activa "${otherCampaign.id}". Desasigna primero o usa otro archivo.`,
        );
      }
    }

    // Validar duración vs. restricciones de campaña
    const maxDuration = this.getCampaignMaxMediaDuration(campaign);
    if (media.durationSeconds && media.durationSeconds > maxDuration) {
      throw new BadRequestException(
        `El archivo excede la duración máxima permitida para esta campaña (${maxDuration}s). Duración del archivo: ${media.durationSeconds}s.`,
      );
    }

    // Validar formato MIME
    if (
      media.mimeType &&
      !BUSINESS_RULES.ALLOWED_MEDIA_MIME_TYPES.includes(
        media.mimeType as (typeof BUSINESS_RULES.ALLOWED_MEDIA_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Formato no permitido: ${media.mimeType}. Solo se aceptan MP4 (H.264), JPG o PNG.`,
      );
    }

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: { campaign_id: campaignId },
    });

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { updatedAt: new Date() },
    });

    let devicesToSync = [];
    if (campaign.targetAll || campaign.isGlobal) {
      devicesToSync = await this.prisma.device.findMany({
        where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
        select: { id: true, deviceId: true },
      });
    } else {
      const assignments = await this.prisma.deviceCampaign.findMany({
        where: { campaign_id: campaignId },
        include: { device: { select: { deviceId: true } } },
      });
      devicesToSync = assignments.map((a) => ({
        id: a.device_id,
        deviceId: a.device.deviceId,
      }));
    }

    if (devicesToSync.length > 0) {
      await this.prisma.deviceCommand.createMany({
        data: devicesToSync.map((d) => ({
          deviceId: d.deviceId,
          commandType: "FORCE_SYNC",
          commandParams: JSON.stringify({
            reason: "media_linked",
            campaignId,
            mediaId,
          }),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        })),
      });

      // REALTIME BROADCAST
      this.supabaseService
        .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
          reason: "media_linked",
          campaignId,
          mediaId,
          targets: devicesToSync.map((d) => d.deviceId),
        })
        .catch(() => {});
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
        city: campaignCity === "Global" ? undefined : campaignCity,
        status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
        connectivityStatus: "ONLINE",
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
      const priorityA = priorityMap[a.driver?.level || "BASE"] || 0;
      const priorityB = priorityMap[b.driver?.level || "BASE"] || 0;
      return priorityB - priorityA; // Descendente
    });

    return availableDevices.slice(0, limit);
  }

  /**
   * TAD-ADVERTISER: Simulador de Presupuesto — v2.0 con fuentes auditables
   *
   * Reemplaza lógica hardcodeada v10.1.0 por @tad/impact-calculator.
   * Cada output incluye rango, fuentes, warnings y status de calibración.
   */
  async simulateImpact(
    budgetRD: number,
    city: string,
  ): Promise<{
    budget: number;
    city: string;
    recommendedScreens: number;
    uniqueReach: number;
    totalImpressions: number;
    onlineScreensInZone: number;
    // NUEVOS campos con transparencia
    uniqueReachRange: { min: number; expected: number; max: number };
    totalImpressionsRange: { min: number; expected: number; max: number };
    frequencyOTS: { min: number; expected: number; max: number };
    cpm: { min: number; expected: number; max: number };
    warnings: string[];
    calibrationLabel: string;
    calibrationDescription: string;
    sourceLabel: string;
  }> {
    // This simulation has no referral code, so it must use the REAL base
    // tariff, not RD$1,500 (the conditional 40%-discounted driver rate).
    // Keep historical BUSINESS_RULES untouched for old financial records.
    if (
      typeof budgetRD !== "number" ||
      !Number.isFinite(budgetRD) ||
      budgetRD < 0
    ) {
      throw new BadRequestException(
        "El presupuesto debe ser un monto válido no negativo.",
      );
    }
    const costPerScreen = calculateAdvertiserOffer({
      screens: 1,
      months: 1,
      includeProduction: false,
      verifiedDriverCode: false,
    }).baseMonthlyScreenRate;

    // Contar pantallas disponibles en la zona
    const onlineScreensCount = await this.prisma.device.count({
      where: {
        city: city === "Global" ? undefined : city,
        status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
        connectivityStatus: "ONLINE",
      },
    });

    const recommendedScreens = Math.min(
      onlineScreensCount,
      Math.floor(budgetRD / costPerScreen),
    );

    // Delegar cálculo completo al módulo único de verdad
    const detailed: ImpactOutput = calculateImpact({
      screens: recommendedScreens,
      months: 1, // asume 1 mes por defecto
      frequencySeconds: 30,
      includeProduction: false,
      mode: "expected",
    });

    // Mapear a respuesta compatible + campos extendidos
    return {
      budget: budgetRD,
      city,
      recommendedScreens,
      uniqueReach: detailed.totalUniqueReach.expected,
      totalImpressions: detailed.totalImpressions.expected,
      onlineScreensInZone: onlineScreensCount,
      // NUEVOS campos extendidos
      uniqueReachRange: detailed.totalUniqueReach,
      totalImpressionsRange: detailed.totalImpressions,
      frequencyOTS: detailed.frequencyOTS,
      cpm: detailed.cpm,
      warnings: detailed.warnings,
      calibrationLabel: "Benchmark internacional (sin datos RD propios)",
      calibrationDescription:
        "Calculado con benchmarks IAB/Geopath/NYC-TLC. Incertidumbre ~±40-60%. Datos propios DIGESETT/ONE/eye-tracking pendientes Q4 2026.",
      sourceLabel: "IAB DOOH Guidelines + Geopath 2024",
    };
  }

  async createIntent(
    dto: Pick<
      Prisma.CampaignIntentUncheckedCreateInput,
      "brandName" | "budget" | "expectedScreens" | "fileMetadata"
    >,
  ) {
    try {
      const intent = await this.prisma.campaignIntent.create({
        data: {
          brandName: dto.brandName,
          budget: dto.budget,
          expectedScreens: dto.expectedScreens,
          fileMetadata: dto.fileMetadata || {},
          status: "PENDING_PAYMENT",
        },
      });
      return { success: true, data: intent };
    } catch (error: unknown) {
      this.logger.error("Error creating campaign intent:", error);
      throw new BadRequestException(
        `No se pudo registrar la intención de campaña: ${errorMessage(error)}`,
      );
    }
  }
}
