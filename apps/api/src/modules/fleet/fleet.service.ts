import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceService } from "../device/device.service";
import { SupabaseService } from "../supabase/supabase.service";
import { TrackBatchDto, GPS_TRACK_BATCH_LIMIT } from "./dto/track-batch.dto";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import { deviceIdentityWhere } from "../campaign/device-identity-lookup";
import { assertNoDeviceHardwareUuidAlias } from "../device/device-identity-collision.guard";

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deviceService: DeviceService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Return all devices in the fleet, determining online/offline status logically.
   */
  async getFleetDevices() {
    const devices = await this.prisma.device.findMany({
      select: {
        id: true,
        deviceId: true,
        taxiNumber: true,
        lastSeen: true,
        batteryLevel: true,
        playerStatus: true,
        storageFree: true,
        storageUsed: true,
        storageTotal: true,
        appVersion: true,
        status: true,
        city: true,
        fleet: true,
        lastHeartbeat: true,
        lastPlayback: true,
        driver: {
          select: {
            fullName: true,
            id: true,
          },
        },
      },
      orderBy: {
        lastSeen: "desc",
      },
    });

    const now = new Date();
    // 30 min in ms
    const tenMinMs = 10 * 60 * 1000;

    return devices.map((d) => {
      let isOnline = false;
      if (d.lastSeen && now.getTime() - d.lastSeen.getTime() <= tenMinMs) {
        isOnline = true;
      }

      return {
        ...d,
        id: d.id,
        device_id: d.deviceId,
        status: isOnline
          ? "online"
          : d.status === BUSINESS_RULES.STATUS.DEVICE.SUSPENDED
            ? "inactive"
            : "offline",
        last_seen: d.lastSeen,
        battery_level: d.batteryLevel,
        player_status: d.playerStatus,
        storage_free: d.storageFree,
        storage_used: d.storageUsed ? Number(d.storageUsed) : null,
        storage_total: d.storageTotal ? Number(d.storageTotal) : null,
        is_online: isOnline,
        driver_name: d.driver?.fullName || "Sín Conductor",
        last_playback: d.lastPlayback,
      };
    });
  }

  async getFleetStats() {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Executes parallel micro-queries in Supabase, leveraging indices
    const [total, online, withErrors] = await Promise.all([
      this.prisma.device.count(),
      this.prisma.device.count({
        where: { lastSeen: { gte: tenMinAgo } },
      }),
      this.prisma.device.count({
        // Devices with a playerStatus that is not null and not empty string
        where: {
          playerStatus: {
            not: null,
          },
          NOT: {
            playerStatus: {
              in: ["playing", ""],
            },
          },
        },
      }),
    ]);

    return {
      total,
      online,
      offline: total - online,
      withErrors,
    };
  }

  async getFleetMap(advertiserId?: string) {
    try {
      const now = new Date();
      const onlineWindowMs = 180 * 1000; // 3 min — alineado con frontend

      // Build filter: if advertiserId is provided, only show devices assigned to their campaigns
      const where: Record<string, unknown> = {};
      if (advertiserId) {
        where.campaigns = {
          some: {
            campaign: {
              advertiserId: advertiserId,
              active: true,
              startDate: { lte: now },
              endDate: { gte: now },
            },
          },
        };
      }

      const devices = await this.prisma.device.findMany({
        where,
        select: {
          id: true,
          deviceId: true,
          driverId: true,
          taxiNumber: true,
          city: true,
          lastSeen: true,
          lastLat: true,
          lastLng: true,
          isOnline: true,
          status: true,
          batteryLevel: true,
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              taxiPlate: true,
              licensePlate: true,
              status: true,
              subscriptionPaid: true,
              subscriptionEnd: true,
            },
          },
          locations: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: {
              latitude: true,
              longitude: true,
              speed: true,
              timestamp: true,
            },
          },
        },
      });

      return devices.map((d) => {
        const lastLocation = d.locations[0] || null;
        const lastLat = d.lastLat ?? lastLocation?.latitude ?? null;
        const lastLng = d.lastLng ?? lastLocation?.longitude ?? null;
        const lastSeen = d.lastSeen ?? lastLocation?.timestamp ?? null;
        // Online determination: use BOTH DB isOnline flag AND lastSeen freshness.
        // The DB flag is set to true by ingestTelemetryBatch, syncDeviceCampaigns,
        // processBulkSync, deviceHeartbeat, etc. The monitoring cron clears it after
        // 15 minutes of silence.
        // Trust the DB isOnline flag only when lastSeen is within the cron's clearing
        // window (15 min). Beyond that, the flag may be stale (cron hasn't yet flipped it).
        const cronWindowMs = 15 * 60 * 1000;
        const lastSeenAge = lastSeen
          ? now.getTime() - new Date(lastSeen).getTime()
          : Infinity;
        const dbIsOnlineTrustworthy = d.isOnline && lastSeenAge <= cronWindowMs;
        const isOnlineByTimestamp = !!lastSeen && lastSeenAge <= onlineWindowMs;
        const isOnline = dbIsOnlineTrustworthy || isOnlineByTimestamp;

        // Derive subscription status from the flag + expiry date (simpler, no nested query)
        let subscriptionStatus = "PENDING";
        if (d.driver) {
          if (d.driver.subscriptionPaid) {
            const notExpired =
              !d.driver.subscriptionEnd || d.driver.subscriptionEnd > now;
            subscriptionStatus = notExpired ? "ACTIVE" : "EXPIRED";
          } else {
            subscriptionStatus = d.driver.status || "PENDING";
          }
        }

        return {
          driverId: d.driver?.id ?? d.driverId ?? null,
          deviceId: d.deviceId,
          taxiNumber: d.taxiNumber ?? null,
          city: d.city ?? null,
          lastSeen,
          lastLat,
          lastLng,
          lat: lastLat,
          lng: lastLng,
          status: d.status,
          isOnline,
          driverName: d.driver?.fullName ?? null,
          phone: d.driver?.phone ?? null,
          plate: d.driver?.taxiPlate ?? d.driver?.licensePlate ?? null,
          subscriptionStatus,
          subscriptionEnd: d.driver?.subscriptionEnd ?? null,
          driverStatus: d.driver?.status ?? null,
          batteryLevel: d.batteryLevel ?? null,
          speed: lastLocation?.speed ?? null,
        };
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Never crash the map page — return empty array with a warning log
      const logger = new Logger("FleetService");
      logger.error(
        `[FleetService] getFleetMap() failed — returning empty array: ${errorMessage}`,
      );
      return [];
    }
  }

  async getOfflineDevices() {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    return this.prisma.device.findMany({
      where: {
        OR: [{ lastSeen: { lt: tenMinAgo } }, { lastSeen: null }],
      },
      select: {
        deviceId: true,
        taxiNumber: true,
        lastSeen: true,
      },
    });
  }

  /**
   * Real financial data: playback counts per device + subscription status.
   * Replaces all simulated/hardcoded finance calculations.
   */
  async getFleetFinance() {
    // M15: tarifa centralizada en BUSINESS_RULES (antes 1.25 hardcodeado aquí).
    const RATE_PER_AD = BUSINESS_RULES.DRIVER_RATE_PER_AD_PLAY_RD;

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // M15: contar solo playbacks VERIFICADOS de tipo play_confirm.
    // Antes contaba todos los eventos del dispositivo (play_start + play_confirm)
    // sin filtrar verified → impresiones infladas/inyectadas pagaban nómina.
    const playbackCounts = await this.prisma.playbackEvent.groupBy({
      by: ["deviceId"],
      _count: { id: true },
      where: {
        eventType: "play_confirm",
        verified: true,
        timestamp: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Build a map: deviceId -> playCount
    const playsMap = new Map<string, number>();
    for (const row of playbackCounts) {
      playsMap.set(row.deviceId, row._count.id);
    }

    // Get all devices with driver + subscription info
    const devices = await this.prisma.device.findMany({
      include: {
        driver: {
          include: {
            subscriptions: {
              where: { status: "ACTIVE" },
              orderBy: { dueDate: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const tenMinMs = 10 * 60 * 1000;

    const fleetFinance = devices.map((d) => {
      const isOnline =
        d.lastSeen && now.getTime() - d.lastSeen.getTime() <= tenMinMs;
      const adsPlayed = playsMap.get(d.deviceId) || 0;
      const revenue = parseFloat((adsPlayed * RATE_PER_AD).toFixed(2));
      const subscription = d.driver?.subscriptions?.[0] || null;

      return {
        device_id: d.deviceId,
        display_name:
          d.taxiNumber ||
          d.name ||
          `TAXI-${d.deviceId.slice(0, 8).toUpperCase()}`,
        city: d.city || "Santo Domingo",
        status: isOnline ? "online" : "offline",
        ads_played: adsPlayed,
        revenue,
        driver: d.driver
          ? {
              name: d.driver.fullName,
              phone: d.driver.phone,
              status: d.driver.status,
            }
          : null,
        subscription: subscription
          ? {
              plan: subscription.plan,
              amount: subscription.amount,
              status: subscription.status,
              paid: !!subscription.paidAt,
              expiresAt: subscription.validUntil,
            }
          : null,
      };
    });

    const totalRevenue = fleetFinance.reduce((sum, d) => sum + d.revenue, 0);
    const totalAds = fleetFinance.reduce((sum, d) => sum + d.ads_played, 0);

    return {
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      rate_per_ad: RATE_PER_AD,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_ads_played: totalAds,
      devices: fleetFinance.sort((a, b) => b.revenue - a.revenue),
    };
  }

  async sendCommand(
    deviceId: string,
    type: string,
    params: Record<string, unknown> = {},
  ) {
    return this.prisma.deviceCommand.create({
      data: {
        deviceId:
          (await this.prisma.device.findUnique({ where: { deviceId } }))?.id ||
          deviceId,
        commandType: type,
        commandParams: JSON.stringify(params || {}),
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  async registerDeviceByAdmin(
    placa: string,
    nombreChofer: string,
    providedDeviceId?: string,
  ) {
    const crypto = require("crypto");
    let deviceId = providedDeviceId?.trim();
    if (!deviceId) {
      deviceId = "TAD-" + crypto.randomUUID().split("-")[0].toUpperCase();
    }

    await assertNoDeviceHardwareUuidAlias(this.prisma, deviceId);

    // 1. Verificar simultáneamente Dispositivo y Driver (por ID o por Teléfono generado)
    const phone = "PH-" + deviceId;

    const [existingDevice, existingDriver] = await Promise.all([
      this.prisma.device.findUnique({
        where: { deviceId },
        include: { driver: true },
      }),
      this.prisma.driver.findFirst({
        where: {
          OR: [{ devices: { some: { deviceId } } }, { phone }],
        },
      }),
    ]);

    // Lógica de Unión (Upsert):
    // Si ya existe el dispositivo, lo actualizamos.
    if (existingDevice) {
      const updated = await this.prisma.device.update({
        where: { deviceId },
        data: {
          taxiNumber: placa,
          status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
          driver: existingDevice.driver
            ? {
                update: {
                  fullName: nombreChofer,
                  licensePlate: placa,
                  taxiNumber: placa,
                  status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
                },
              }
            : {
                // Si el dispositivo no tiene driver pero encontramos uno huérfano con este ID/Phone
                connectOrCreate: {
                  where: { phone },
                  create: {
                    fullName: nombreChofer,
                    phone: phone,
                    licensePlate: placa,
                    taxiNumber: placa,
                    status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
                  },
                },
              },
        },
      });
      return {
        success: true,
        device_id: updated.deviceId,
        driver_name: nombreChofer,
        linked: true,
      };
    }

    // 2. Si el dispositivo es nuevo pero el driver ya existía (ej: registro manual previo del chofer)
    if (existingDriver) {
      const device = await this.prisma.device.create({
        data: {
          deviceId,
          status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
          taxiNumber: placa,
          driver: {
            connect: { id: existingDriver.id },
          },
        },
      });
      // Actualizar datos del driver vinculado
      await this.prisma.driver.update({
        where: { id: existingDriver.id },
        data: {
          fullName: nombreChofer,
          status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
        },
      });
      return {
        success: true,
        device_id: device.deviceId,
        driver_name: nombreChofer,
        linked_driver: true,
      };
    }

    // 3. Creación total desde cero
    const device = await this.prisma.device.create({
      data: {
        deviceId,
        status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE,
        taxiNumber: placa,
        appVersion: "3.0.0",
        lastSeen: new Date(),
        driver: {
          create: {
            fullName: nombreChofer,
            phone: phone,
            licensePlate: placa,
            taxiNumber: placa,
            status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
          },
        },
      },
    });

    return {
      success: true,
      device_id: device.deviceId,
      driver_name: nombreChofer,
      new_registration: true,
    };
  }

  /**
   * Retorna las últimas ubicaciones con datos de chofer y dispositivo.
   * Usado por la pestaña de Rastreo GPS en el Dashboard Admin.
   */
  async getTrackingData() {
    const locations = await this.prisma.driverLocation.findMany({
      orderBy: { timestamp: "desc" },
      take: 500,
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            taxiNumber: true,
            taxiPlate: true,
            licensePlate: true,
            status: true,
            subscriptionPaid: true,
          },
        },
        device: {
          select: {
            deviceId: true,
            taxiNumber: true,
            city: true,
            status: true,
            batteryLevel: true,
            lastSeen: true,
          },
        },
      },
    });

    return locations.map((loc) => ({
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      speed: loc.speed,
      timestamp: loc.timestamp,
      driver: loc.driver
        ? {
            id: loc.driver.id,
            name: loc.driver.fullName,
            phone: loc.driver.phone,
            taxiNumber: loc.driver.taxiNumber || loc.driver.licensePlate,
            plate: loc.driver.taxiPlate || loc.driver.licensePlate,
            status: loc.driver.status,
            subscriptionPaid: loc.driver.subscriptionPaid,
          }
        : null,
      device: loc.device
        ? {
            deviceId: loc.device.deviceId,
            taxiNumber: loc.device.taxiNumber,
            city: loc.device.city,
            status: loc.device.status,
            batteryLevel: loc.device.batteryLevel,
            lastSeen: loc.device.lastSeen,
          }
        : null,
    }));
  }

  /**
   * Retorna un resumen por chofer: total de puntos GPS, última ubicación, velocidad promedio.
   */
  async getTrackingSummary(advertiserId?: string) {
    try {
      // 1. Obtener todos los drivers con su(s) tablet(s) vinculada(s)
      const where: Record<string, unknown> = { devices: { some: {} } };
      if (advertiserId) {
        where.devices = {
          some: {
            campaigns: {
              some: {
                campaign: {
                  advertiserId: advertiserId,
                },
              },
            },
          },
        };
      }

      const drivers = await this.prisma.driver.findMany({
        where,
        include: {
          devices: {
            // We also want to filter the devices shown per driver if needed,
            // but usually a driver has 1 device and if that device is assigned to the advertiser, we show the driver.
            select: {
              deviceId: true,
              taxiNumber: true,
              city: true,
              batteryLevel: true,
              lastSeen: true,
            },
          },
          locations: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      });

      if (drivers.length === 0) return [];

      // 2. Contar puntos GPS de HOY (batch optimization)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const driverIds = drivers.map((d) => d.id);

      // Defensive parallel queries — if either groupBy fails, degrade gracefully
      let countMap = new Map<string, { count: number; avgSpeed: number }>();
      let totalMap = new Map<string, number>();

      try {
        const [counts, totalCounts] = await Promise.all([
          this.prisma.driverLocation.groupBy({
            by: ["driverId"],
            _count: { id: true },
            _avg: { speed: true },
            where: {
              driverId: { in: driverIds },
              timestamp: { gte: todayStart },
            },
          }),
          this.prisma.driverLocation.groupBy({
            by: ["driverId"],
            _count: { id: true },
            where: { driverId: { in: driverIds } },
          }),
        ]);

        countMap = new Map(
          counts.map((c) => [
            c.driverId,
            {
              count: c._count.id,
              avgSpeed: c._avg?.speed ?? 0,
            },
          ]),
        );

        totalMap = new Map(
          (
            totalCounts as Array<{ driverId: string; _count: { id: number } }>
          ).map((c) => [c.driverId, c._count.id]),
        );
      } catch (groupByError: unknown) {
        const errorMessage =
          groupByError instanceof Error
            ? groupByError.message
            : String(groupByError);
        // Degraded mode: return basic driver data without GPS stats
        const logger = new Logger("FleetService");
        logger.warn(
          `[FleetService] groupBy on driverLocation failed, degrading gracefully: ${errorMessage}`,
        );
      }

      const now = new Date();
      const fiveMinMs = 5 * 60 * 1000;

      return drivers.map((d) => {
        const lastLocation = d.locations[0] || null;
        const todayStats = countMap.get(d.id) || { count: 0, avgSpeed: 0 };
        const totalPoints = totalMap.get(d.id) || 0;

        // Determinar si está activo (señal en los últimos 5 minutos)
        const isActive = lastLocation
          ? now.getTime() - new Date(lastLocation.timestamp).getTime() <
            fiveMinMs
          : false;

        return {
          driverId: d.id,
          driverName: d.fullName,
          phone: d.phone,
          taxiNumber: d.taxiNumber || d.licensePlate,
          plate: d.taxiPlate || d.licensePlate,
          status: d.status,
          subscriptionPaid: d.subscriptionPaid,
          devicesCount: d.devices.length,
          device: d.devices[0]
            ? {
                deviceId: d.devices[0].deviceId,
                taxiNumber: d.devices[0].taxiNumber,
                city: d.devices[0].city,
                batteryLevel: d.devices[0].batteryLevel,
                lastSeen: d.devices[0].lastSeen,
              }
            : null,
          tracking: {
            isActive,
            pointsToday: todayStats.count,
            totalPoints,
            avgSpeedToday:
              typeof todayStats.avgSpeed === "number"
                ? parseFloat(todayStats.avgSpeed.toFixed(1))
                : 0,
            lastPosition: lastLocation
              ? {
                  lat: lastLocation.latitude,
                  lng: lastLocation.longitude,
                  speed: lastLocation.speed || 0,
                  timestamp: lastLocation.timestamp,
                }
              : null,
          },
        };
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const logger = new Logger("FleetService");
      logger.error(`CRITICAL: Error in getTrackingSummary: ${errorMessage}`);
      // Return empty array instead of throwing 500 — the UI handles empty state gracefully
      return [];
    }
  }

  // REMOVED legacy trackBatch in favor of ingestTelemetryBatch below

  /**
   * Envía un comando a toda la flota activa (Realtime + Persistencia)
   * Útil para el "Panic Button" o actualizaciones globales.
   */
  async broadcastCommand(type: string, params: Record<string, unknown> = {}) {
    Logger.log(`[FLEET_C2] Broadcasting global command: ${type}`);

    // 1. Emitir vía Realtime para efectos inmediatos en dispositivos conectados
    await this.supabaseService
      .broadcastEvent("fleet_sync", "WAKE_UP_CALL", {
        command: type,
        params,
        timestamp: new Date().toISOString(),
      })
      .catch((e) =>
        Logger.error(`[FLEET_C2] Realtime broadcast failed: ${e.message}`),
      );

    // 2. Registrar en DeviceCommand para dispositivos offline/desconectados
    const activeDevices = await this.prisma.device.findMany({
      where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
      select: { id: true },
    });

    if (activeDevices.length > 0) {
      await this.prisma.deviceCommand.createMany({
        data: activeDevices.map((d) => ({
          deviceId: d.id,
          commandType: type,
          commandParams: JSON.stringify(params),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days life
        })),
      });
    }

    return {
      success: true,
      broadcastType: type,
      deviceCount: activeDevices.length,
    };
  }

  /**
   * TAREA A: Backend Refactor - Batch Status Summary
   * Devuelve un resumen de todos los dispositivos con sus slots ocupados en una sola consulta.
   * Elimina la necesidad de 100+ peticiones individuales desde el frontend.
   */
  async getFleetStatusSummary() {
    return this.deviceService.getFleetStatusSummary();
  }

  /**
   * Obtiene la ruta reciente (trail) de un dispositivo específico.
   */
  async getDeviceRecentPath(deviceId: string) {
    // The route accepts a hardware ID or a canonical device UUID.
    // driver_locations.device_id is physically UUID, not hardware TEXT.
    const devices = await this.prisma.device.findMany({
      where: deviceIdentityWhere(deviceId),
      select: { id: true },
      take: 2,
    });
    if (devices.length === 0) return [];
    if (devices.length > 1) {
      throw new HttpException("DEVICE_IDENTITY_AMBIGUOUS", HttpStatus.CONFLICT);
    }

    return this.prisma.driverLocation.findMany({
      where: { deviceId: devices[0].id },
      orderBy: { timestamp: "desc" },
      take: 60,
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        timestamp: true,
      },
    });
  }

  /**
   * Procesa un lote de puntos GPS con validación de reglas de negocio críticas.
   * R3: Kill-Switch si la suscripción no está al día.
   * R2: Inserción masiva para optimizar latencia en producción.
   *
   * V12.1.3 (B3 PATCH): Ahora `skipDuplicates: true` es funcional porque
   * `DriverLocation.@@unique([deviceId, timestamp])` existe (migración
   * `20260110_driver_location_unique`). Sin UNIQUE el flag era NO-OP.
   *
   * Adicional: luego del createMany se hace un UPSERT del "last location" del
   * dispositivo (lastSeen/lastLat/lastLng) idempotente.
   */
  async ingestTelemetryBatch(data: TrackBatchDto) {
    const logger = new Logger("FleetService");

    // Defensa: payload vacío no debería llegar aquí (DTO valida IsArray),
    // pero protegemos contra puntos vacíos para no desperdiciar round-trip.
    if (!Array.isArray(data?.points)) {
      throw new HttpException("GPS_POINTS_INVALID", HttpStatus.BAD_REQUEST);
    }
    if (data.points.length > GPS_TRACK_BATCH_LIMIT) {
      // Never silently truncate genuine offline GPS or accept unbounded uploads.
      throw new HttpException("GPS_BATCH_TOO_LARGE", HttpStatus.BAD_REQUEST);
    }
    if (data.points.length === 0) {
      return { count: 0, input: 0 };
    }

    // 1. Validar que el dispositivo exista y esté OPERATIVO.
    //    SEC-02: rechazar cualquier telemetría de dispositivos
    //    desconocidos o en estado no-operativo. Ya no hacemos
    //    auto-registro de devices desde este endpoint.
    const device = await this.prisma.device.findUnique({
      where: { deviceId: data.deviceId },
      select: { id: true, deviceId: true, status: true, driverId: true },
    });

    if (!device) {
      throw new HttpException(
        "Device Not Found — track-batch rejected for unknown device",
        HttpStatus.NOT_FOUND,
      );
    }

    if (device.status !== BUSINESS_RULES.STATUS.DEVICE.ACTIVE) {
      throw new HttpException(
        `Device Not Operative — track-batch rejected (status: ${device.status})`,
        HttpStatus.FORBIDDEN,
      );
    }

    // Only an ADMIN-approved device-driver binding can attribute GPS.
    if (!device.driverId || data.driverId !== device.driverId) {
      throw new HttpException("DEVICE_DRIVER_MISMATCH", HttpStatus.FORBIDDEN);
    }
    const driverLookupId = device.driverId;

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverLookupId },
      select: {
        id: true,
        subscriptionPaid: true,
        status: true,
        fullName: true,
      },
    });

    if (!driver) {
      throw new HttpException("Driver Not Found", HttpStatus.NOT_FOUND);
    }

    // 2. Regla de Negocio #3: Kill-Switch si la suscripción no está al día
    if (
      driver.status !== BUSINESS_RULES.STATUS.DRIVER.ACTIVE ||
      !driver.subscriptionPaid
    ) {
      logger.warn(
        `🚫 Telemetry Rejected (402): Driver [${driver.fullName}] is delinquent or inactive.`,
      );
      throw new HttpException(
        "Payment Required - Subscription Inactive",
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 3. Inserción Masiva (Batching) para optimizar I/O (Regla de Negocio #2).
    //    `skipDuplicates: true` ahora es funcional gracias al UNIQUE constraint
    //    y previene que el mismo (deviceId, timestamp) duplique filas.
    const telemetryData = data.points.map((p) => ({
      driverId: driverLookupId,
      // driver_locations.device_id is UUID; data.deviceId is hardware TEXT.
      deviceId: device.id,
      latitude: p.lat,
      longitude: p.lng,
      speed: p.speed,
      timestamp: new Date(p.timestamp),
    }));

    const result = await this.prisma.driverLocation.createMany({
      data: telemetryData,
      skipDuplicates: true, // B3 PATCH: ahora SÍ funciona (UNIQUE existe)
    });

    logger.log(
      `✅ Telemetry Batch Processed: ${result.count} points from [${driver.fullName}] (input=${telemetryData.length})`,
    );

    // 4. Update Device 'lastSeen' and current position (idempotente)
    // ALL-SEEING EYE PATCH (v12.1.3): antes tomábamos
    // `data.points[data.points.length - 1]` como último punto, pero tras un
    // período offline el buffer de IndexedDB no garantiza order cronológico
    // estricto. Eso dejaba `Device.lastLat/lastLng` apuntando a un punto
    // intermedio, no al más reciente — el Admin Map mostraba posiciones
    // congeladas o retrocedidas (violación MAP-SPEC-2026).
    //
    // Ahora reducimos por `timestamp` máximo. `createMany` no se ve afectado
    // porque sigue recibiendo el arreglo completo (historial). No tocamos
    // `skipDuplicates: true` ni la transacción del WalletService (Regla #1).
    if (data.points.length > 0) {
      const lastPoint = data.points.reduce(
        (a, b) => (b.timestamp > a.timestamp ? b : a),
        data.points[0],
      );
      try {
        await this.prisma.device.update({
          where: { deviceId: data.deviceId },
          data: {
            isOnline: true,
            lastSeen: new Date(),
            lastLat: lastPoint.lat,
            lastLng: lastPoint.lng,
          },
        });
        logger.debug(
          `[FleetService] Device snapshot updated: ${data.deviceId} → (${lastPoint.lat}, ${lastPoint.lng}) @ ${new Date(lastPoint.timestamp).toISOString()}`,
        );
      } catch (e: unknown) {
        const errMessage = e instanceof Error ? e.message : String(e);
        // Nunca romper el acknowledgment del batch por una falla del snapshot —
        // el historial ya quedó persistido en `DriverLocation`.
        logger.error(
          `Failed to update device status (snapshot): ${errMessage}`,
        );
      }
    }

    return { count: result.count, input: telemetryData.length };
  }
}
