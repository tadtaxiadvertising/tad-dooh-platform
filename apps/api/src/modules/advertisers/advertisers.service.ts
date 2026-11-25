import { withMediaMimeAliases } from "../media/media-response";
import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import type { Prisma, Invoice } from "@prisma/client";
import {
  BUSINESS_RULES,
  BCRYPT_ROUNDS,
  JWT_EXPIRY,
} from "../../common/constants/business-rules";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  entityId?: string;
}

/** Solo los campos que el anunciante puede actualizar directamente */
interface UpdateAdvertiserDto {
  companyName?: string;
  contactName?: string;
  phone?: string;
  category?: string;
  password?: string;
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
  weight: true,
};

@Injectable()
export class AdvertisersService {
  // FIX B-1: Añadir NestJS Logger en lugar de console.*
  private readonly logger = new Logger(AdvertisersService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Read-only verification of legacy advertiser sessions issued by login().
   *
   * The Next middleware MUST NOT trust JWT.decode(), even when the upstream
   * identity provider is unreachable. Only a correctly signed, unexpired
   * advertiser token tied to an existing advertiser passes this check.
   * Never return credentials or the raw token.
   */
  async verifyAdvertiserSession(token: string): Promise<{
    role: "ADVERTISER";
    advertiserId: string;
    status: string;
  }> {
    const secret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");

    if (!secret || typeof token !== "string" || token.length > 8192) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }

    let claims: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof decoded === "string") {
        throw new Error("Unstructured JWT");
      }
      claims = decoded;
    } catch {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }

    if (
      claims.role !== "ADVERTISER" ||
      claims.app_metadata?.role !== "ADVERTISER" ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      claims.app_metadata?.entityId !== claims.sub ||
      typeof claims.email !== "string" ||
      !claims.email ||
      claims.purpose !== undefined
    ) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }

    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, status: true },
    });
    if (
      !advertiser ||
      advertiser.email.trim().toLowerCase() !==
        claims.email.trim().toLowerCase() ||
      !["ACTIVE", "PENDING_REVIEW"].includes(advertiser.status)
    ) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }
    return {
      role: "ADVERTISER",
      advertiserId: advertiser.id,
      status: advertiser.status,
    };
  }

  /**
   * Current commercial account status for a SUPABASE-VERIFIED identity.
   * Never use JWT metadata or a caller-supplied advertiser ID as the source
   * of authorization. Nest global auth guard supplies verified user data.
   */
  async verifyOAuthAdvertiserStatus(identity: {
    role?: string;
    entityId?: string | null;
    email?: string;
  }): Promise<{ role: "ADVERTISER"; advertiserId: string; status: string }> {
    if (
      identity?.role !== "ADVERTISER" ||
      typeof identity.entityId !== "string" ||
      !identity.entityId.trim() ||
      typeof identity.email !== "string" ||
      !identity.email.trim()
    ) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: identity.entityId },
      select: { id: true, email: true, status: true },
    });
    if (
      !advertiser ||
      advertiser.id !== identity.entityId ||
      advertiser.email.trim().toLowerCase() !==
        identity.email.trim().toLowerCase() ||
      !["ACTIVE", "PENDING_REVIEW", "PENDING_ONBOARDING"].includes(
        advertiser.status,
      )
    ) {
      throw new UnauthorizedException("Sesión de anunciante inválida.");
    }
    return {
      role: "ADVERTISER",
      advertiserId: advertiser.id,
      status: advertiser.status,
    };
  }

  async findAll() {
    return this.prisma.advertiser.findMany({
      include: {
        _count: { select: { campaigns: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id },
      include: {
        campaigns: {
          include: {
            metrics: true,
            media: true,
            targetDrivers: true,
          },
        },
      },
    });
    return advertiser
      ? {
          ...advertiser,
          campaigns: advertiser.campaigns.map((campaign) => ({
            ...campaign,
            media: campaign.media.map(withMediaMimeAliases),
          })),
        }
      : null;
  }

  async create(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    password?: string;
    referralCode?: string;
  }) {
    let hashedPassword: string | null = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    let referredByDriverId: string | null = null;
    if (data.referralCode) {
      const driver = await this.prisma.driver.findUnique({
        where: { referralCode: data.referralCode },
        select: { id: true, isSimulated: true },
      });
      // Do not attribute potential paid referrals to internal test drivers.
      if (driver && !driver.isSimulated) {
        referredByDriverId = driver.id;
        this.logger.log(
          `🔗 Advertiser ${data.companyName} referred by Driver ${driver.id}`,
        );
      }
    }

    return this.prisma.advertiser.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        status: BUSINESS_RULES.STATUS.ADVERTISER.INITIAL,
        referredBy: referredByDriverId,
      },
    });
  }

  // FIX A-3: DTO explícito — solo permite actualizar campos seguros. Previene mass assignment.
  async update(id: string, data: UpdateAdvertiserDto) {
    const updateData: Prisma.AdvertiserUpdateInput = {};

    if (data.companyName !== undefined)
      updateData.companyName = data.companyName;
    if (data.contactName !== undefined)
      updateData.contactName = data.contactName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.password) {
      // FIX B-2: Usar constante BCRYPT_ROUNDS
      updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    return this.prisma.advertiser.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.prisma.campaign.deleteMany({ where: { advertiserId: id } });
    return this.prisma.advertiser.delete({ where: { id } });
  }

  async getPortalData(id: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id },
      include: {
        campaigns: {
          where: { active: true },
          include: {
            media: true,
            mediaAssets: { select: mediaAssetSafeSelect },
            videos: true,
          },
        },
        // FIX MOCK-1: Incluir facturas reales del anunciante
        invoices: {
          orderBy: { issueDate: "desc" },
          take: 10, // Últimas 10 facturas para el portal
        },
      },
    });

    if (!advertiser) return null;

    const campaignIds = advertiser.campaigns.map((c) => c.id);
    const now = new Date();
    const onlineWindowMs = 180 * 1000; // 3 min — aligned with FleetService.getFleetMap
    const activeCampaignWhere = {
      advertiserId: id,
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
    };
    const contractedDeviceSelect = {
      deviceId: true,
      taxiNumber: true,
      city: true,
      lastSeen: true,
      lastLat: true,
      lastLng: true,
      isOnline: true,
      status: true,
      driverId: true,
      driver: {
        select: {
          id: true,
          fullName: true,
          taxiPlate: true,
          licensePlate: true,
          subscriptionPaid: true,
          subscriptionEnd: true,
          status: true,
        },
      },
      locations: {
        orderBy: { timestamp: "desc" as const },
        take: 1,
        select: {
          latitude: true,
          longitude: true,
          speed: true,
          timestamp: true,
        },
      },
    } as const;

    const [deviceAssignments, targetDriverAssignments] = await Promise.all([
      this.prisma.deviceCampaign.findMany({
        where: { campaign: activeCampaignWhere },
        include: {
          campaign: { select: { id: true, name: true } },
          device: { select: contractedDeviceSelect },
        },
      }),
      this.prisma.driver.findMany({
        where: { campaigns: { some: activeCampaignWhere } },
        select: {
          id: true,
          fullName: true,
          taxiPlate: true,
          licensePlate: true,
          subscriptionPaid: true,
          subscriptionEnd: true,
          status: true,
          devices: { select: contractedDeviceSelect },
        },
      }),
    ]);

    type ContractedDevice = Prisma.DeviceGetPayload<{
      select: typeof contractedDeviceSelect;
    }>;
    type ContractedScreen = {
      driverId: string | null;
      deviceId: string;
      taxiNumber: string | null;
      city: string | null;
      lastSeen: Date | null;
      lastLat: number | null;
      lastLng: number | null;
      status: ContractedDevice["status"];
      isOnline: boolean;
      driverName: string | null;
      plate: string | null;
      subscriptionStatus: string;
      speed: number | null;
      campaigns: string[];
    };
    const contractedByDeviceId = new Map<string, ContractedScreen>();
    const upsertContractedScreen = (
      device: ContractedDevice,
      campaignName?: string,
    ) => {
      if (!device?.deviceId) return;
      const lastLocation = device.locations?.[0] || null;
      const lastLat = device.lastLat ?? lastLocation?.latitude ?? null;
      const lastLng = device.lastLng ?? lastLocation?.longitude ?? null;
      const lastSeen = device.lastSeen ?? lastLocation?.timestamp ?? null;
      const cronWindowMs = 15 * 60 * 1000;
      const lastSeenAge = lastSeen
        ? now.getTime() - new Date(lastSeen).getTime()
        : Infinity;
      const dbIsOnlineTrustworthy =
        device.isOnline && lastSeenAge <= cronWindowMs;
      const isOnlineByTimestamp = !!lastSeen && lastSeenAge <= onlineWindowMs;
      const isOnline = dbIsOnlineTrustworthy || isOnlineByTimestamp;
      const driver = device.driver || null;
      const existing = contractedByDeviceId.get(device.deviceId);
      const campaigns = new Set<string>(existing?.campaigns || []);
      if (campaignName) campaigns.add(campaignName);

      let subscriptionStatus = "PENDING";
      if (driver) {
        if (driver.subscriptionPaid) {
          const notExpired =
            !driver.subscriptionEnd || driver.subscriptionEnd > now;
          subscriptionStatus = notExpired ? "ACTIVE" : "EXPIRED";
        } else {
          subscriptionStatus = driver.status || "PENDING";
        }
      }

      contractedByDeviceId.set(device.deviceId, {
        driverId: driver?.id ?? device.driverId ?? null,
        deviceId: device.deviceId,
        taxiNumber: device.taxiNumber ?? null,
        city: device.city ?? null,
        lastSeen,
        lastLat,
        lastLng,
        status: device.status,
        isOnline,
        driverName: driver?.fullName ?? null,
        plate: driver?.taxiPlate ?? driver?.licensePlate ?? null,
        subscriptionStatus,
        speed: lastLocation?.speed ?? null,
        campaigns: Array.from(campaigns),
      });
    };

    for (const assignment of deviceAssignments) {
      upsertContractedScreen(assignment.device, assignment.campaign.name);
    }
    for (const driver of targetDriverAssignments) {
      for (const device of driver.devices) {
        upsertContractedScreen(
          { ...device, driver: device.driver || driver },
          undefined,
        );
      }
    }

    const contractedScreens = Array.from(contractedByDeviceId.values());
    const driverIds = Array.from(
      new Set(
        contractedScreens
          .map((screen) => screen.driverId)
          .filter(
            (driverId): driverId is string =>
              typeof driverId === "string" && driverId.length > 0,
          ),
      ),
    );
    const deviceIds = Array.from(
      new Set(
        contractedScreens
          .map((screen) => screen.deviceId)
          .filter(
            (deviceId): deviceId is string =>
              typeof deviceId === "string" && deviceId.length > 0,
          ),
      ),
    );

    // FIX N+1 parcial: Obtener agregados globales del anunciante en paralelo
    // GET LIVE DATA: Combinamos histórico (campaignMetric) con tiempo real (playbackEvent de hoy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      metricsAgg,
      totalScans,
      liveImpressions,
      latestInvoice,
      geoData,
      uniqueNodes,
    ] = await Promise.all([
      campaignIds.length > 0
        ? this.prisma.campaignMetric.aggregate({
            where: { campaignId: { in: campaignIds } },
            _sum: { totalImpressions: true, totalCompletions: true },
          })
        : Promise.resolve({
            _sum: { totalImpressions: 0, totalCompletions: 0 },
          }),
      campaignIds.length > 0
        ? this.prisma.analyticsEvent.count({
            where: {
              campaignId: { in: campaignIds },
              eventType: {
                in: ["qr_scan", "scan_redirect", "scan", "QR_SCAN"],
              },
            },
          })
        : Promise.resolve(0),
      // Live impressions (Today only, as midnight cron handles previous days)
      campaignIds.length > 0
        ? this.getLiveImpressionsForCampaigns(advertiser.id)
        : Promise.resolve(0),
      // Latest Invoice for dashboard display
      this.prisma.invoice.findFirst({
        where: { advertiserId: id },
        orderBy: { issueDate: "desc" },
      }),
      // Geo distribution by city
      campaignIds.length > 0
        ? this.prisma.campaignMetric.groupBy({
            by: ["city"],
            where: { campaignId: { in: campaignIds } },
            _sum: { totalImpressions: true },
          })
        : Promise.resolve([]),
      // Unique nodes (devices)
      campaignIds.length > 0
        ? this.prisma.playbackEvent.groupBy({
            by: ["deviceId"],
            where: {
              videoId: { in: await this.getAdvertiserVideoIds(advertiser.id) },
              eventType: "play_confirm",
            },
          })
        : Promise.resolve([]),
    ]);

    const totalImpressions =
      (metricsAgg._sum.totalImpressions || 0) + liveImpressions;
    const totalCompletions = metricsAgg._sum.totalCompletions || 0;
    const activeNodes = uniqueNodes.length;
    const avgFrequency =
      activeNodes > 0
        ? Number((totalImpressions / (activeNodes * 1.5)).toFixed(1))
        : 0; // Simulated frequency factor

    const geoDistribution = geoData
      .map((g) => ({
        name: g.city || "Desconocido",
        value:
          totalImpressions > 0
            ? Math.round(
                ((g._sum.totalImpressions || 0) / totalImpressions) * 100,
              )
            : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // FIX M-2: Usar constantes de negocio
    const totalAds = advertiser.campaigns.length;
    const subtotal = totalAds * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
    const taxAmount = subtotal * BUSINESS_RULES.ITBIS_RATE;
    const totalCost = subtotal + taxAmount;

    // FIX A-2 (parcial): Pre-cargar todas las métricas de campañas en 2 queries totales
    // en lugar de 3 queries por campaña (N+1)
    const [allCampaignMetrics, allCampaignScans, allAssignments] =
      await Promise.all([
        campaignIds.length > 0
          ? this.prisma.campaignMetric.groupBy({
              by: ["campaignId"],
              where: { campaignId: { in: campaignIds } },
              _sum: { totalImpressions: true, totalCompletions: true },
            })
          : Promise.resolve([]),
        campaignIds.length > 0
          ? this.prisma.analyticsEvent.groupBy({
              by: ["campaignId"],
              where: {
                campaignId: { in: campaignIds },
                eventType: {
                  in: ["qr_scan", "scan_redirect", "scan", "QR_SCAN"],
                },
              },
              _count: { id: true },
            })
          : Promise.resolve([]),
        campaignIds.length > 0
          ? this.prisma.deviceCampaign.findMany({
              where: { campaign_id: { in: campaignIds } },
              include: {
                device: {
                  select: {
                    lastSyncAt: true,
                    lastSyncSuccess: true,
                    status: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

    // Indexar por campaignId para O(1) lookup
    const metricsMap = new Map(
      allCampaignMetrics.map((m) => [m.campaignId, m]),
    );
    const scansMap = new Map(
      allCampaignScans.map((s) => [s.campaignId, s._count.id]),
    );
    const assignmentsMap = new Map<string, typeof allAssignments>();
    for (const a of allAssignments) {
      const list = assignmentsMap.get(a.campaign_id) || [];
      list.push(a);
      assignmentsMap.set(a.campaign_id, list);
    }

    const campaignsWithMetrics = advertiser.campaigns.map((c) => {
      const campMetrics = metricsMap.get(c.id);
      const cScans = scansMap.get(c.id) || 0;
      const assignments = assignmentsMap.get(c.id) || [];

      const totalAssigned = assignments.length;
      const syncedCount = assignments.filter(
        (a) =>
          a.device.status === "OPERATIVO" &&
          a.device.lastSyncSuccess &&
          a.device.lastSyncAt &&
          a.device.lastSyncAt >= c.updatedAt,
      ).length;
      const syncProgress =
        totalAssigned > 0 ? (syncedCount / totalAssigned) * 100 : 100;

      const consolidatedMedia = [
        ...c.media.map((m) => ({
          id: m.id,
          url: m.cdnUrl || m.url,
          type: m.mimeType,
          name: m.name || m.filename,
          category: "Vault",
        })),
        ...c.mediaAssets.map((a) => ({
          id: a.id,
          url: a.url,
          type: a.type,
          name: a.filename,
          category: "Asset",
        })),
        ...c.videos.map((v) => ({
          id: v.id,
          url: v.url,
          type: v.mimeType || "video/mp4",
          name: v.title,
          category: "Video",
        })),
      ];

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        start: c.startDate,
        end: c.endDate,
        targetUrl: c.targetUrl,
        promocionesContratadas: c.targetImpressions || 0,
        impressions: campMetrics?._sum.totalImpressions || 0,
        completions: campMetrics?._sum.totalCompletions || 0,
        scans: cScans,
        syncProgress: Math.round(syncProgress),
        totalDevices: totalAssigned,
        media: consolidatedMedia,
      };
    });

    // Time series (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const metricsHistory = await this.prisma.campaignMetric.groupBy({
      by: ["date"],
      where: {
        campaignId: { in: campaignIds },
        date: { gte: sevenDaysAgo },
      },
      _sum: { totalImpressions: true, totalCompletions: true },
      orderBy: { date: "asc" },
    });

    const timeSeries = metricsHistory.map((m) => ({
      date: m.date.toISOString().split("T")[0],
      impressions: Number(m._sum.totalImpressions || 0),
      completions: Number(m._sum.totalCompletions || 0),
    }));

    // Add Today's live data to timeSeries
    timeSeries.push({
      date: new Date().toISOString().split("T")[0],
      impressions: liveImpressions,
      completions: 0, // We don't track live completions in this simple count yet
    });

    // FIX MOCK-2: Calcular balanceRD real desde facturas no pagadas
    const pendingInvoices = advertiser.invoices.filter(
      (inv) => inv.status !== "PAID",
    );
    const balanceRD = pendingInvoices.reduce(
      (acc, inv) => acc + inv.totalAmount,
      0,
    );

    // FIX MOCK-3: Serializar facturas reales para el portal
    const invoicesList = advertiser.invoices.map((inv) => ({
      id: inv.id,
      issueDate: inv.issueDate.toISOString().split("T")[0],
      dueDate: inv.dueDate.toISOString().split("T")[0],
      subtotal: inv.subtotal,
      taxAmount: inv.taxAmount,
      amount: inv.totalAmount,
      totalAmount: inv.totalAmount,
      status: inv.status,
      pdfUrl: inv.pdfUrl || null,
    }));

    // Estadísticas de facturas para el summary de billing
    const invoiceStatusSummary = {
      pending: advertiser.invoices.filter((i) => i.status === "PENDING").length,
      paid: advertiser.invoices.filter((i) => i.status === "PAID").length,
      overdue: advertiser.invoices.filter((i) => i.status === "OVERDUE").length,
    };

    return {
      brand: {
        id: advertiser.id,
        name: advertiser.companyName,
        category: advertiser.category,
        contact: advertiser.contactName,
        email: advertiser.email,
        phone: advertiser.phone,
        status: advertiser.status,
      },
      summary: {
        promocionesContratadas: advertiser.campaigns.reduce(
          (acc, curr) => acc + (curr.targetImpressions || 0),
          0,
        ),
        impressions: totalImpressions,
        completions: totalCompletions,
        scans: totalScans,
        activeCampaigns: totalAds,
        contractedScreens: contractedScreens.length,
        activeContractedScreens: contractedScreens.filter(
          (screen) => screen.isOnline,
        ).length,
      },
      telemetry: {
        contractedScreens,
        contractedScreensTotal: contractedScreens.length,
        activeContractedScreens: contractedScreens.filter(
          (screen) => screen.isOnline,
        ).length,
        driverIds,
        deviceIds,
      },
      contractedScreens,
      driverIds,
      deviceIds,
      activeDriverIds: driverIds,
      stats: {
        totalImpressions,
        totalCompletions,
        totalScans,
        activeCampaigns: totalAds,
        activeNodes,
        avgFrequency,
        // FIX MOCK-4: Eliminar fallback hardcoded de geoDistribution
        // Si no hay datos geográficos, devolver array vacío — la UI mostrará Zero State
        geoDistribution,
      },
      financials: {
        subtotal,
        taxAmount,
        totalCost,
        costPerAd: BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
        taxRate: BUSINESS_RULES.ITBIS_RATE,
        // FIX MOCK-5: balanceRD calculado desde facturas reales (no campo inexistente)
        balanceRD,
        invoices: invoicesList,
        invoiceStatusSummary,
        latestInvoice: latestInvoice
          ? {
              id: latestInvoice.id,
              date: latestInvoice.issueDate.toISOString().split("T")[0],
              status: latestInvoice.status,
              amount: latestInvoice.totalAmount,
            }
          : null,
      },
      campaigns: campaignsWithMetrics,
      timeSeries,
    };
  }

  // PORTAL LOGIN

  /**
   * GET /advertisers/:id/admin-profile — Perfil extendido para el admin.
   * Incluye campañas, medios, facturas y métricas consolidadas.
   */
  async getAdminProfile(id: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id },
      include: {
        campaigns: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { media: true, targetDrivers: true, metrics: true },
            },
            mediaAssets: { select: mediaAssetSafeSelect },
          },
        },
        invoices: {
          orderBy: { issueDate: "desc" },
          take: 20,
        },
        referrer: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });
    if (!advertiser) throw new BadRequestException("Anunciante no encontrado");

    // Total de campañas y devices contratados (agregado ligero)
    const totalCampaigns = advertiser.campaigns?.length ?? 0;
    const activeCampaigns = (advertiser.campaigns ?? []).filter(
      (c) => c.active && c.status !== "COMPLETED",
    ).length;

    return {
      ...advertiser,
      totalVerifiedPlays: totalCampaigns, // compat: total de campañas
      activeCampaigns,
      profileStatus: advertiser.status,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.advertiser.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Tu cuenta aún no tiene una contraseña configurada. Por favor, utiliza la opción "Recuperar Contraseña" para establecer una.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // Align token issuance with verifyAdvertiserSession(): suspended/unknown
    // advertisers must not receive a signed token that every protected route
    // will immediately reject. Validate after password to avoid enumeration.
    if (!["ACTIVE", "PENDING_REVIEW"].includes(user.status)) {
      throw new UnauthorizedException("Cuenta de anunciante no habilitada.");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: "ADVERTISER",
      app_metadata: { role: "ADVERTISER", entityId: user.id },
    };

    // FIX C-1: NO usar fallback hardcodeado. Sincronizado con SupabaseAuthGuard.
    const jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      this.logger.error(
        "🚨 [ADVERTISER_LOGIN] JWT_SECRET no configurado. Login bloqueado por seguridad.",
      );
      throw new Error("Error de configuración del servidor.");
    }

    // FIX M-2: Usar constante JWT_EXPIRY
    const token = jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRY });

    return {
      access_token: token,
      advertiserId: user.id,
      name: user.companyName,
      role: "ADVERTISER",
      entityId: user.id,
      status: user.status,
      category: user.category || null,
      phone: user.phone || null,
    };
  }

  // RECOVER PASSWORD
  async recoverPassword(email: string) {
    const user = await this.prisma.advertiser.findUnique({ where: { email } });
    if (!user) {
      // Return success to avoid email enumeration
      return { success: true, message: "If email exists, recovery sent." };
    }

    const jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      this.logger.error(
        `[ADVERTISER_AUTH][RECOVER_PASSWORD] JWT secret no configurado para email=${email}.`,
      );
      return {
        success: false,
        message: "Error de configuración del servidor.",
      };
    }

    jwt.sign({ sub: user.id, email: user.email, purpose: "reset" }, jwtSecret, {
      expiresIn: "15m",
    });

    // FIX B-1: Usar NestJS Logger en lugar de console.log
    this.logger.log(
      `[AUTH] Recovery token generado para ${email} — integrar con Resend/SendGrid`,
    );

    return { success: true, message: "Recovery instructions sent." };
  }

  // RESET PASSWORD (POST-RECOVERY)
  async resetPassword(token: string, newPass: string) {
    const jwtSecret =
      this.configService.get<string>("SUPABASE_JWT_SECRET") ||
      this.configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      this.logger.error(
        "[ADVERTISER_AUTH][RESET_PASSWORD] JWT secret no configurado.",
      );
      throw new Error("Error de configuración del servidor.");
    }

    try {
      const payload = jwt.verify(token, jwtSecret);
      if (
        typeof payload === "string" ||
        payload.purpose !== "reset" ||
        typeof payload.sub !== "string"
      ) {
        throw new BadRequestException("Token inválido para esta operación");
      }

      const hashedPassword = await bcrypt.hash(newPass, BCRYPT_ROUNDS);

      await this.prisma.advertiser.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });

      return {
        success: true,
        message: "Contraseña actualizada correctamente.",
      };
    } catch (err) {
      this.logger.error(
        `[ADVERTISER_AUTH][RESET_PASSWORD] Token inválido o expirado: ${err.message}`,
      );
      throw new UnauthorizedException("El enlace ha expirado o es inválido.");
    }
  }
  /**
   * Endpoint dedicado para obtener facturas del anunciante.
   * Optimizado para la página de Billing — no carga toda la data del portal.
   * TENANT ISOLATION: Solo devuelve facturas del advertiserId especificado.
   */
  async getInvoices(advertiserId: string): Promise<{
    invoices: Array<
      Pick<
        Invoice,
        "id" | "status" | "subtotal" | "taxAmount" | "totalAmount" | "pdfUrl"
      > & { issueDate: string; dueDate: string; amount: number }
    >;
    balanceRD: number;
    invoiceStatusSummary: { pending: number; paid: number; overdue: number };
  }> {
    const invoices = await this.prisma.invoice.findMany({
      where: { advertiserId },
      orderBy: { issueDate: "desc" },
    });

    const balanceRD = invoices
      .filter((inv) => inv.status !== "PAID")
      .reduce((acc, inv) => acc + inv.totalAmount, 0);

    return {
      invoices: invoices.map((inv) => ({
        id: inv.id,
        issueDate: inv.issueDate.toISOString().split("T")[0],
        dueDate: inv.dueDate.toISOString().split("T")[0],
        subtotal: inv.subtotal,
        taxAmount: inv.taxAmount,
        amount: inv.totalAmount,
        totalAmount: inv.totalAmount,
        status: inv.status,
        pdfUrl: inv.pdfUrl || null,
      })),
      balanceRD,
      invoiceStatusSummary: {
        pending: invoices.filter((i) => i.status === "PENDING").length,
        paid: invoices.filter((i) => i.status === "PAID").length,
        overdue: invoices.filter((i) => i.status === "OVERDUE").length,
      },
    };
  }

  private async getAdvertiserVideoIds(advertiserId: string): Promise<string[]> {
    const [videos, assets] = await Promise.all([
      this.prisma.video.findMany({
        where: { campaign: { advertiserId } },
        select: { id: true },
      }),
      this.prisma.mediaAsset.findMany({
        where: { campaign: { advertiserId } },
        select: { id: true },
      }),
    ]);
    return [...videos.map((v) => v.id), ...assets.map((a) => a.id)];
  }

  private async getLiveImpressionsForCampaigns(
    advertiserId: string,
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const videoIds = await this.getAdvertiserVideoIds(advertiserId);

    if (videoIds.length === 0) return 0;

    return this.prisma.playbackEvent.count({
      where: {
        videoId: { in: videoIds },
        timestamp: { gte: today },
        eventType: "play_confirm",
      },
    });
  }
}
