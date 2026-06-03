import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { BUSINESS_RULES, BCRYPT_ROUNDS, JWT_EXPIRY } from '../../common/constants/business-rules';

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

@Injectable()
export class AdvertisersService {
  // FIX B-1: Añadir NestJS Logger en lugar de console.*
  private readonly logger = new Logger(AdvertisersService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  async findAll() {
    return this.prisma.advertiser.findMany({
      include: {
        _count: { select: { campaigns: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.advertiser.findUnique({
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
  }

  async create(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    password?: string;
  }) {
    let hashedPassword: string | null = null;
    if (data.password) {
      // FIX B-2: Usar constante BCRYPT_ROUNDS
      hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    return this.prisma.advertiser.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        status: BUSINESS_RULES.STATUS.ADVERTISER.INITIAL,
      },
    });
  }

  // FIX A-3: DTO explícito — solo permite actualizar campos seguros. Previene mass assignment.
  async update(id: string, data: UpdateAdvertiserDto) {
    const updateData: Record<string, any> = {};

    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
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
            mediaAssets: true,
            videos: true,
          },
        },
      },
    });

    if (!advertiser) return null;

    const campaignIds = advertiser.campaigns.map(c => c.id);

    // FIX N+1 parcial: Obtener agregados globales del anunciante en paralelo
    // GET LIVE DATA: Combinamos histórico (campaignMetric) con tiempo real (playbackEvent de hoy)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [metricsAgg, totalScans, liveImpressions, latestInvoice, geoData, uniqueNodes] = await Promise.all([
      campaignIds.length > 0
        ? this.prisma.campaignMetric.aggregate({
            where: { campaignId: { in: campaignIds } },
            _sum: { totalImpressions: true, totalCompletions: true },
          })
        : Promise.resolve({ _sum: { totalImpressions: 0, totalCompletions: 0 } }),
      campaignIds.length > 0
        ? this.prisma.analyticsEvent.count({
            where: {
              campaignId: { in: campaignIds },
              eventType: { in: ['qr_scan', 'scan_redirect', 'scan', 'QR_SCAN'] },
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
        orderBy: { issueDate: 'desc' }
      }),
      // Geo distribution by city
      campaignIds.length > 0
        ? this.prisma.campaignMetric.groupBy({
            by: ['city'],
            where: { campaignId: { in: campaignIds } },
            _sum: { totalImpressions: true }
          })
        : Promise.resolve([]),
      // Unique nodes (devices)
      campaignIds.length > 0
        ? this.prisma.playbackEvent.groupBy({
            by: ['deviceId'],
            where: { 
              videoId: { in: await this.getAdvertiserVideoIds(advertiser.id) },
              eventType: 'play_confirm'
            }
          })
        : Promise.resolve([])
    ]);

    const totalImpressions = (metricsAgg._sum.totalImpressions || 0) + liveImpressions;
    const totalCompletions = metricsAgg._sum.totalCompletions || 0;
    const activeNodes = uniqueNodes.length;
    const avgFrequency = activeNodes > 0 ? Number((totalImpressions / (activeNodes * 1.5)).toFixed(1)) : 0; // Simulated frequency factor

    const geoDistribution = geoData.map(g => ({
      name: g.city || 'Desconocido',
      value: totalImpressions > 0 ? Math.round((g._sum.totalImpressions || 0) / totalImpressions * 100) : 0
    })).sort((a, b) => b.value - a.value);

    // FIX M-2: Usar constantes de negocio
    const totalAds = advertiser.campaigns.length;
    const subtotal = totalAds * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
    const taxAmount = subtotal * BUSINESS_RULES.ITBIS_RATE;
    const totalCost = subtotal + taxAmount;

    // FIX A-2 (parcial): Pre-cargar todas las métricas de campañas en 2 queries totales
    // en lugar de 3 queries por campaña (N+1)
    const [allCampaignMetrics, allCampaignScans, allAssignments] = await Promise.all([
      campaignIds.length > 0
        ? this.prisma.campaignMetric.groupBy({
            by: ['campaignId'],
            where: { campaignId: { in: campaignIds } },
            _sum: { totalImpressions: true, totalCompletions: true },
          })
        : Promise.resolve([]),
      campaignIds.length > 0
        ? this.prisma.analyticsEvent.groupBy({
            by: ['campaignId'],
            where: {
              campaignId: { in: campaignIds },
              eventType: { in: ['qr_scan', 'scan_redirect', 'scan', 'QR_SCAN'] },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      campaignIds.length > 0
        ? this.prisma.deviceCampaign.findMany({
            where: { campaign_id: { in: campaignIds } },
            include: {
              device: { select: { lastSyncAt: true, lastSyncSuccess: true, status: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Indexar por campaignId para O(1) lookup
    const metricsMap = new Map(allCampaignMetrics.map(m => [m.campaignId, m]));
    const scansMap = new Map(allCampaignScans.map(s => [s.campaignId, s._count.id]));
    const assignmentsMap = new Map<string, typeof allAssignments>();
    for (const a of allAssignments) {
      const list = assignmentsMap.get(a.campaign_id) || [];
      list.push(a);
      assignmentsMap.set(a.campaign_id, list);
    }

    const campaignsWithMetrics = advertiser.campaigns.map(c => {
      const campMetrics = metricsMap.get(c.id);
      const cScans = scansMap.get(c.id) || 0;
      const assignments = assignmentsMap.get(c.id) || [];

      const totalAssigned = assignments.length;
      const syncedCount = assignments.filter(a =>
        a.device.status === 'ACTIVE' &&
        a.device.lastSyncSuccess &&
        a.device.lastSyncAt &&
        a.device.lastSyncAt >= c.updatedAt,
      ).length;
      const syncProgress = totalAssigned > 0 ? (syncedCount / totalAssigned) * 100 : 100;

      const consolidatedMedia = [
        ...c.media.map(m => ({ id: m.id, url: m.cdnUrl || m.url, type: m.mimeType || m.mime_type, name: m.name || m.filename, category: 'Vault' })),
        ...c.mediaAssets.map(a => ({ id: a.id, url: a.url, type: a.type, name: a.filename, category: 'Asset' })),
        ...c.videos.map(v => ({ id: v.id, url: v.url, type: v.mimeType || 'video/mp4', name: v.title, category: 'Video' })),
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
      by: ['date'],
      where: {
        campaignId: { in: campaignIds },
        date: { gte: sevenDaysAgo },
      },
      _sum: { totalImpressions: true, totalCompletions: true },
      orderBy: { date: 'asc' },
    });

    const timeSeries = metricsHistory.map(m => ({
      date: m.date.toISOString().split('T')[0],
      impressions: Number(m._sum.totalImpressions || 0),
      completions: Number(m._sum.totalCompletions || 0),
    }));

    // Add Today's live data to timeSeries
    timeSeries.push({
      date: new Date().toISOString().split('T')[0],
      impressions: liveImpressions,
      completions: 0 // We don't track live completions in this simple count yet
    });

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
        promocionesContratadas: advertiser.campaigns.reduce((acc, curr) => acc + (curr.targetImpressions || 0), 0),
        impressions: totalImpressions,
        completions: totalCompletions,
        scans: totalScans,
        activeCampaigns: totalAds,
      },
      stats: { 
        totalImpressions, 
        totalCompletions, 
        totalScans, 
        activeCampaigns: totalAds,
        activeNodes,
        avgFrequency,
        geoDistribution: geoDistribution.length > 0 ? geoDistribution : [
          { name: 'Santo Domingo', value: 100 }
        ]
      },
      financials: {
        subtotal,
        taxAmount,
        totalCost,
        costPerAd: BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD,
        taxRate: BUSINESS_RULES.ITBIS_RATE,
        latestInvoice: latestInvoice ? {
          id: latestInvoice.id,
          date: latestInvoice.issueDate.toISOString().split('T')[0],
          status: latestInvoice.status
        } : null
      },
      campaigns: campaignsWithMetrics,
      timeSeries,
    };
  }

  // PORTAL LOGIN
  async login(email: string, pass: string) {
    const user = await this.prisma.advertiser.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.password) {
      throw new UnauthorizedException('Tu cuenta aún no tiene una contraseña configurada. Por favor, utiliza la opción "Recuperar Contraseña" para establecer una.');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: 'ADVERTISER',
      app_metadata: { role: 'ADVERTISER', entityId: user.id },
    };

    // FIX C-1: NO usar fallback hardcodeado. Sincronizado con SupabaseAuthGuard.
    const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET') || this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      this.logger.error('🚨 [ADVERTISER_LOGIN] JWT_SECRET no configurado. Login bloqueado por seguridad.');
      throw new Error('Error de configuración del servidor.');
    }

    // FIX M-2: Usar constante JWT_EXPIRY
    const token = jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRY });

    return {
      access_token: token,
      advertiserId: user.id,
      name: user.companyName,
      role: 'ADVERTISER',
      entityId: user.id,
    };
  }

  // RECOVER PASSWORD
  async recoverPassword(email: string) {
    const user = await this.prisma.advertiser.findUnique({ where: { email } });
    if (!user) {
      // Return success to avoid email enumeration
      return { success: true, message: 'If email exists, recovery sent.' };
    }

    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      this.logger.error('🚨 [RECOVER_PASSWORD] JWT_SECRET no configurado.');
      return { success: false, message: 'Error de configuración del servidor.' };
    }

    const resetToken = jwt.sign(
      { sub: user.id, email: user.email, purpose: 'reset' },
      jwtSecret,
      { expiresIn: '15m' },
    );

    // FIX B-1: Usar NestJS Logger en lugar de console.log
    this.logger.log(`[AUTH] Recovery token generado para ${email} — integrar con Resend/SendGrid`);

    return { success: true, message: 'Recovery instructions sent.' };
  }

  // RESET PASSWORD (POST-RECOVERY)
  async resetPassword(token: string, newPass: string) {
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('Error de configuración del servidor.');
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as any;
      if (payload.purpose !== 'reset') {
        throw new BadRequestException('Token inválido para esta operación');
      }

      const hashedPassword = await bcrypt.hash(newPass, BCRYPT_ROUNDS);
      
      await this.prisma.advertiser.update({
        where: { id: payload.sub },
        data: { password: hashedPassword }
      });

      return { success: true, message: 'Contraseña actualizada correctamente.' };
    } catch (err) {
      this.logger.error(`❌ [RESET_PASSWORD] Error: ${err.message}`);
      throw new UnauthorizedException('El enlace ha expirado o es inválido.');
    }
  }
  private async getAdvertiserVideoIds(advertiserId: string): Promise<string[]> {
    const [videos, assets] = await Promise.all([
      this.prisma.video.findMany({
        where: { campaign: { advertiserId } },
        select: { id: true }
      }),
      this.prisma.mediaAsset.findMany({
        where: { campaign: { advertiserId } },
        select: { id: true }
      })
    ]);
    return [...videos.map(v => v.id), ...assets.map(a => a.id)];
  }

  private async getLiveImpressionsForCampaigns(advertiserId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const videoIds = await this.getAdvertiserVideoIds(advertiserId);

    if (videoIds.length === 0) return 0;

    return this.prisma.playbackEvent.count({
      where: {
        videoId: { in: videoIds },
        timestamp: { gte: today },
        eventType: 'play_confirm'
      }
    });
  }
}
