import { errorMessage } from "../../utils/error.util";
import {
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Put,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceService } from "./device.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import { deviceIdentityWhere } from "../campaign/device-identity-lookup";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

// Only missing legacy assignment tables may be ignored for compatibility.
// Never report a successful removal after an authorization, schema or DB error.
function isMissingLegacyTable(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "P2021";
}

const KIOSK_COMMAND_TYPES = [
  "FORCE_SYNC",
  "SCREEN_ON",
  "SCREEN_OFF",
  "SET_BRIGHTNESS",
  "SET_VOLUME",
  "MUTE",
  "UNMUTE",
  "LOCK_KIOSK",
  "UNLOCK_KIOSK",
  "REBOOT",
  "RESTART_APP",
  "ENABLE_MOTION",
  "DISABLE_MOTION",
];

@Roles(UserRole.ADMIN)
@Controller("devices")
export class DeviceAdminController {
  private readonly logger = new Logger(DeviceAdminController.name);

  constructor(
    private prisma: PrismaService,
    private deviceService: DeviceService,
  ) {}

  // ─── PENDING DEVICE APPROVAL QUEUE ──────────────────────────────────────────

  /** List all devices awaiting admin approval */
  @Get("pending")
  getPendingDevices() {
    return this.deviceService.getPendingDevices();
  }

  /** Admin approves a device → sets it ACTIVE */
  @Post(":deviceId/approve")
  approveDevice(@Param("deviceId") deviceId: string) {
    return this.deviceService.approveDevice(deviceId);
  }

  /** Admin rejects a device → deletes it */
  @Delete(":deviceId/reject")
  rejectDevice(@Param("deviceId") deviceId: string) {
    return this.deviceService.rejectDevice(deviceId);
  }

  // Ver los anuncios asignados a un taxi específico
  @Get(":deviceId/campaigns")
  async getDeviceCampaigns(@Param("deviceId") paramId: string) {
    const devices = await this.prisma.device.findMany({
      where: deviceIdentityWhere(paramId),
      select: { id: true, deviceId: true },
      take: 2,
    });
    if (devices.length > 1) {
      throw new BadRequestException("Identificador de dispositivo ambiguo");
    }
    const device = devices[0];
    if (!device) return [];

    // device_campaigns.device_id is TEXT and may contain the canonical UUID
    // serialized as text or a legacy hardware ID. Never coerce it to UUID.
    const assignments = await this.prisma.deviceCampaign.findMany({
      where: { device_id: { in: [device.id, device.deviceId] } },
      include: { campaign: true },
    });

    const seenCampaigns = new Set<string>();
    return assignments
      .filter((assignment) => {
        if (seenCampaigns.has(assignment.campaign_id)) return false;
        seenCampaigns.add(assignment.campaign_id);
        return true;
      })
      .map((assignment) => ({
        ...assignment.campaign,
        assigned_at: assignment.assigned_at,
      }));
  }

  // Quitar un anuncio de un taxi específico
  @Delete(":deviceId/campaigns/:campaignId")
  async removeCampaignFromDevice(
    @Param("deviceId") paramDeviceId: string,
    @Param("campaignId") campaignId: string,
  ) {
    // Find device by either UUID or Hardware ID
    const devices = await this.prisma.device.findMany({
      where: deviceIdentityWhere(paramDeviceId),
      select: { id: true, deviceId: true },
      take: 2,
    });
    if (devices.length > 1) {
      throw new BadRequestException("Identificador de dispositivo ambiguo");
    }
    const device = devices[0];
    if (!device) {
      return { success: false, message: "Dispositivo no encontrado" };
    }

    // 1. Remove both canonical UUID-as-TEXT and legacy hardware assignments.
    try {
      await this.prisma.deviceCampaign.deleteMany({
        where: {
          device_id: { in: [device.id, device.deviceId] },
          campaign_id: campaignId,
        },
      });
    } catch (error: unknown) {
      // A deployment may only have the legacy assignment table; try it below.
      if (!isMissingLegacyTable(error)) throw error;
    }

    // 2. Intentamos borrar en la tabla v1 (legacy)
    try {
      await this.prisma.playlistItem.deleteMany({
        where: {
          campaignId: campaignId,
          deviceId: device.deviceId,
        },
      });
    } catch (error: unknown) {
      // Removing an assignment remains idempotent when the legacy table is absent.
      if (!isMissingLegacyTable(error)) throw error;
    }

    return {
      success: true,
      message: "Campaña removida del dispositivo exitosamente",
    };
  }

  // Crear un nuevo dispositivo manualmente
  @Post()
  async createDevice(
    @Body() data: { deviceId: string; taxiNumber?: string; city?: string },
  ) {
    if (!data.deviceId)
      throw new BadRequestException(
        "ID de dispositivo (hardware) es obligatorio",
      );

    // Check if hardware ID already exists
    const existing = await this.prisma.device.findUnique({
      where: { deviceId: data.deviceId },
    });
    if (existing)
      throw new BadRequestException(
        `El ID ${data.deviceId} ya está registrado`,
      );

    return this.prisma.device.create({
      data: {
        deviceId: data.deviceId,
        taxiNumber: data.taxiNumber,
        city: data.city || "Santo Domingo",
        status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
      },
    });
  }

  // Actualizar datos de un dispositivo
  @Put(":id")
  async updateDevice(
    @Param("id") id: string,
    @Body()
    data: {
      taxiNumber?: string;
      city?: string;
      status?: "OPERATIVO" | "PENDIENTE_PAGO" | "BLOQUEADO";
      driverId?: string | null;
    },
  ) {
    return this.prisma.device.update({
      where: { id },
      data: {
        taxiNumber: data.taxiNumber,
        city: data.city,
        status: data.status,
        ...(data.driverId !== undefined && { driverId: data.driverId }),
      },
      include: { driver: true },
    });
  }

  // Eliminar un dispositivo completamente
  @Delete(":deviceId")
  async deleteDevice(@Param("deviceId") deviceId: string) {
    // Find device by deviceId (hardware ID) or by UUID
    const devices = await this.prisma.device.findMany({
      where: deviceIdentityWhere(deviceId),
      take: 2,
    });
    if (devices.length > 1) {
      throw new BadRequestException("Identificador de dispositivo ambiguo");
    }
    const device = devices[0];
    if (!device)
      return { success: false, message: "Dispositivo no encontrado" };

    const uuid = device.id;
    const hwId = device.deviceId;

    // Perform atomic deletion of all related telemetry and assignments
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Analytics & Metrics (References by UUID or Hardware ID)
        await tx.analyticsEvent.deleteMany({ where: { deviceId: hwId } });
        await tx.campaignMetric.deleteMany({ where: { deviceId: uuid } });

        // 2. Telemetry & Logs (References by Hardware ID)
        await tx.playbackEvent.deleteMany({ where: { deviceId: hwId } });
        await tx.deviceHeartbeat.deleteMany({ where: { deviceId: hwId } });
        await tx.playlistItem.deleteMany({ where: { deviceId: hwId } });
        await tx.driverLocation.deleteMany({ where: { deviceId: hwId } });

        // 3. Operational Data (References by UUID or Hardware ID)
        await tx.deviceCommand.deleteMany({ where: { deviceId: uuid } });
        await tx.deviceCampaign.deleteMany({
          where: { device_id: { in: [uuid, hwId] } },
        });
        await tx.subscription.deleteMany({ where: { deviceId: hwId } });

        // 4. Notifications (References by either ID in string field)
        await tx.notification.deleteMany({
          where: {
            OR: [{ entityId: uuid }, { entityId: hwId }],
          },
        });

        // 5. Finally delete the device identity
        await tx.device.delete({ where: { id: uuid } });

        this.logger.log(
          `🗑️ Device ${hwId} (${uuid}) completely purged from system.`,
        );
        return {
          success: true,
          message: `Dispositivo ${hwId} eliminado correctamente`,
        };
      });
    } catch (error: unknown) {
      this.logger.error(
        `❌ Failed to delete device ${hwId}: ${errorMessage(error)}`,
      );
      throw new InternalServerErrorException(
        "Error al eliminar el dispositivo",
      );
    }
  }

  // Perfil completo del nodo (device + driver + campaigns)
  @Get(":deviceId/profile")
  async getDeviceProfile(@Param("deviceId") deviceId: string) {
    try {
      const device = await this.prisma.device.findFirst({
        where: deviceIdentityWhere(deviceId),
        include: {
          driver: true,
          campaigns: {
            include: {
              campaign: {
                select: {
                  id: true,
                  name: true,
                  advertiser: true,
                  active: true,
                },
              },
            },
          },
        },
      });

      if (!device) {
        this.logger.warn(
          `🔍 Perfil solicitado para dispositivo inexistente: ${deviceId}`,
        );
        return { error: "Dispositivo no encontrado" };
      }

      return {
        id: device.id,
        device_id: device.deviceId,
        taxi_number: device.taxiNumber,
        city: device.city,
        status: device.status,
        battery_level: device.batteryLevel,
        storage_free: device.storageFree,
        app_version: device.appVersion,
        last_seen: device.lastSeen,
        player_status: device.playerStatus,
        driver: device.driver
          ? {
              id: device.driver.id,
              fullName: device.driver.fullName,
              phone: device.driver.phone,
              cedula: device.driver.cedula,
              licensePlate: device.driver.licensePlate,
              taxiPlate: device.driver.taxiPlate,
              subscriptionPaid: device.driver.subscriptionPaid,
              status: device.driver.status,
            }
          : null,
        campaigns: device.campaigns
          .filter((c) => c.campaign) // Defensa contra campañas huérfanas
          .map((c) => ({
            id: c.campaign.id,
            name: c.campaign.name,
            advertiser: c.campaign.advertiser,
            active: c.campaign.active,
            assigned_at: c.assigned_at,
          })),
      };
    } catch (error: unknown) {
      this.logger.error(
        `❌ Error fatal cargando perfil de ${deviceId}: ${errorMessage(error)}`,
      );
      throw new InternalServerErrorException(
        "Error al obtener el perfil del dispositivo",
      );
    }
  }

  // Actualizar perfil completo (dispositivo y chofer)
  @Put(":deviceId/profile")
  async updateDeviceProfile(
    @Param("deviceId") deviceId: string,
    @Body()
    data: {
      taxi_number?: string;
      status?: string;
      driver_name?: string;
      driver_phone?: string;
      subscription_paid?: boolean;
    },
  ) {
    const device = await this.prisma.device.findFirst({
      where: deviceIdentityWhere(deviceId),
      include: { driver: true },
    });

    if (!device) throw new BadRequestException("Dispositivo no encontrado");

    // Update Device
    const updateData: import("@prisma/client").Prisma.DeviceUpdateInput = {};
    if (data.taxi_number !== undefined)
      updateData.taxiNumber = data.taxi_number;
    if (data.status !== undefined) {
      // Validar que sea un SystemStatus válido
      const validStatuses = ["OPERATIVO", "PENDIENTE_PAGO", "BLOQUEADO"];
      if (!validStatuses.includes(data.status)) {
        throw new BadRequestException(
          `Status inválido: ${data.status}. Valores válidos: ${validStatuses.join(", ")}`,
        );
      }
      updateData.status = data.status as import("@prisma/client").SystemStatus;
    }

    // Update Driver if exists
    if (device.driver) {
      updateData.driver = {
        update: {
          fullName:
            data.driver_name !== undefined
              ? data.driver_name
              : device.driver.fullName,
          phone:
            data.driver_phone !== undefined
              ? data.driver_phone
              : device.driver.phone,
          subscriptionPaid:
            data.subscription_paid !== undefined
              ? data.subscription_paid
              : device.driver.subscriptionPaid,
        },
      };
    } else if (data.driver_name) {
      // Create driver if not exists but name is provided
      updateData.driver = {
        create: {
          fullName: data.driver_name,
          phone: data.driver_phone || "N/A",
          subscriptionPaid: data.subscription_paid || false,
          licensePlate: data.taxi_number || "N/A",
          taxiNumber: data.taxi_number || "N/A",
        },
      };
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: updateData,
    });

    return { success: true, message: "Perfil actualizado", device: updated };
  }

  // ── FullyKiosk Remote Commands ──
  // Send kiosk management commands to tablet devices via DeviceCommand queue.
  // The player's FullyKioskBridge processes these on next sync cycle.

  /** Send a command to a single device */
  @Post(":deviceId/command")
  async sendDeviceCommand(
    @Param("deviceId") deviceId: string,
    @Body() body: { commandType: string; params?: Record<string, unknown> },
  ) {
    if (!KIOSK_COMMAND_TYPES.includes(body.commandType)) {
      throw new BadRequestException(
        `Invalid command type: ${body.commandType}. Valid types: ${KIOSK_COMMAND_TYPES.join(", ")}`,
      );
    }

    const device = await this.prisma.device.findFirst({
      where: deviceIdentityWhere(deviceId),
    });
    if (!device) throw new BadRequestException("Dispositivo no encontrado");

    const command = await this.prisma.deviceCommand.create({
      data: {
        deviceId: device.id,
        commandType: body.commandType,
        commandParams: body.params ? JSON.stringify(body.params) : null,
        status: "PENDING",
        expiresAt: new Date(
          Date.now() + BUSINESS_RULES.COMMAND_TTL_DAYS * 24 * 3600 * 1000,
        ),
      },
    });

    // Wake the device via Supabase Realtime
    this.logger.log(
      `📤 Command ${body.commandType} queued for device ${device.deviceId}`,
    );
    return { success: true, command };
  }

  /** Broadcast a command to all devices in a fleet or city */
  @Post("broadcast")
  async broadcastCommand(
    @Body()
    body: {
      commandType: string;
      params?: Record<string, unknown>;
      city?: string;
      fleet?: string;
    },
  ) {
    if (!KIOSK_COMMAND_TYPES.includes(body.commandType)) {
      throw new BadRequestException(
        `Invalid command type: ${body.commandType}`,
      );
    }

    const where: import("@prisma/client").Prisma.DeviceWhereInput = {
      status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
    };
    if (body.city) where.city = body.city;
    if (body.fleet) where.fleet = body.fleet;

    const devices = await this.prisma.device.findMany({
      where,
      select: { id: true, deviceId: true },
    });

    if (devices.length === 0) {
      return { success: false, message: "No devices found for this filter" };
    }

    const commands = await this.prisma.deviceCommand.createMany({
      data: devices.map((d) => ({
        deviceId: d.id,
        commandType: body.commandType,
        commandParams: body.params ? JSON.stringify(body.params) : null,
        status: "PENDING",
        expiresAt: new Date(
          Date.now() + BUSINESS_RULES.COMMAND_TTL_DAYS * 24 * 3600 * 1000,
        ),
      })),
    });

    this.logger.log(
      `📤 Broadcast ${body.commandType} to ${devices.length} devices`,
    );
    return {
      success: true,
      count: commands.count,
      commandType: body.commandType,
    };
  }
}
