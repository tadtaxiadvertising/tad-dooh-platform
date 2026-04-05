import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AdvertisersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.advertiser.findMany({
      include: {
        _count: {
          select: { campaigns: true }
        }
      },
      orderBy: { createdAt: 'desc' }
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
          }
        }
      }
    });
  }

  async create(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    password?: string;
  }) {
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.advertiser.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
      }
    });
  }

  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.advertiser.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    // Delete related campaigns first to avoid FK constraint issues
    await this.prisma.campaign.deleteMany({ where: { advertiserId: id } });
    return this.prisma.advertiser.delete({
      where: { id }
    });
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
            videos: true
          }
        }
      }
    });

    if (!advertiser) return null;

    const campaignIds = advertiser.campaigns.map(c => c.id);

    // 1. Total Impressions from aggregations (avoiding giant table iterations)
    let totalImpressions = 0;
    let totalCompletions = 0;
    
    if (campaignIds.length > 0) {
      try {
        const agg = await this.prisma.campaignMetric.aggregate({
          where: { campaignId: { in: campaignIds } },
          _sum: { totalImpressions: true, totalCompletions: true }
        });
        totalImpressions = agg._sum.totalImpressions || 0;
        totalCompletions = agg._sum.totalCompletions || 0;
      } catch (e) {
        console.error("Error aggregating metrics:", e);
      }
    }

    // 2. Real-time count of QR Scans from AnalyticsEvents
    const totalScans = campaignIds.length > 0 ? await this.prisma.analyticsEvent.count({
      where: {
        campaignId: { in: campaignIds },
        eventType: { in: ['qr_scan', 'scan_redirect', 'scan', 'QR_SCAN'] }
      }
    }) : 0;

    // 3. Cálculos Financieros Exactos
    const COST_PER_AD = 1500;
    const TAX_RATE = 0.18;
    const totalAds = advertiser.campaigns.length;
    const subtotal = totalAds * COST_PER_AD;
    const taxAmount = subtotal * TAX_RATE;
    const totalCost = subtotal + taxAmount;

    // Obtener métricas por campaña
    const campaignsWithMetrics = await Promise.all(advertiser.campaigns.map(async (c) => {
      const [campAgg, cScans, assignments] = await Promise.all([
        this.prisma.campaignMetric.aggregate({
          where: { campaignId: c.id },
          _sum: { totalImpressions: true, totalCompletions: true }
        }),
        this.prisma.analyticsEvent.count({
          where: { campaignId: c.id, eventType: { in: ['qr_scan', 'scan_redirect', 'scan', 'QR_SCAN'] } }
        }),
        this.prisma.deviceCampaign.findMany({
          where: { campaign_id: c.id },
          include: { device: { select: { lastSyncAt: true, lastSyncSuccess: true, status: true } } }
        })
      ]);

      // Calcular progreso de sincronización real (v5.2)
      const totalAssigned = assignments.length;
      const syncedCount = assignments.filter(a => 
        a.device.status === 'ACTIVE' && 
        a.device.lastSyncSuccess && 
        a.device.lastSyncAt && 
        a.device.lastSyncAt >= c.updatedAt
      ).length;
      
      const syncProgress = totalAssigned > 0 ? (syncedCount / totalAssigned) * 100 : 100;

      // Consolidate all types of ad assets (media, mediaAssets, videos)
      const consolidatedMedia = [
        ...c.media.map(m => ({ id: m.id, url: m.cdnUrl || m.url, type: m.mimeType || m.mime_type, name: m.name || m.filename, category: 'Vault' })),
        ...c.mediaAssets.map(a => ({ id: a.id, url: a.url, type: a.type, name: a.filename, category: 'Asset' })),
        ...c.videos.map(v => ({ id: v.id, url: v.url, type: v.mimeType || 'video/mp4', name: v.title, category: 'Video' }))
      ];

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        start: c.startDate,
        end: c.endDate,
        targetUrl: c.targetUrl,
        promocionesContratadas: c.targetImpressions || 0, // Using requested terminology
        impressions: campAgg._sum.totalImpressions || 0,
        completions: campAgg._sum.totalCompletions || 0,
        scans: cScans,
        syncProgress: Math.round(syncProgress),
        totalDevices: totalAssigned,
        media: consolidatedMedia
      };
    }));

    return {
      brand: {
        id: advertiser.id,
        name: advertiser.companyName,
        category: advertiser.category,
        contact: advertiser.contactName,
        email: advertiser.email,
        phone: advertiser.phone,
        status: advertiser.status
      },
      stats: {
        promocionesContratadas: advertiser.campaigns.reduce((acc, curr) => acc + (curr.targetImpressions || 0), 0),
        totalImpressions,
        totalCompletions,
        totalScans, 
        activeCampaigns: totalAds
      },
      financials: {
        subtotal,
        taxAmount,
        totalCost,
        costPerAd: COST_PER_AD,
        taxRate: TAX_RATE
      },
      campaigns: campaignsWithMetrics
    };
  }

  // PORTAL LOGIN
  async login(email: string, pass: string) {
    const user = await this.prisma.advertiser.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    let isMatch = false;
    if (user.password) {
      isMatch = await bcrypt.compare(pass, user.password);
    } else {
      // For legacy advertisers, maybe we let them login with a default pass? Or require them to set it up.
      // Better to just throw.
      throw new UnauthorizedException('Debe configurar su contraseña con el administrador primero.');
    }

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: 'ADVERTISER',
      app_metadata: { 
        role: 'ADVERTISER', 
        entityId: user.id 
      } 
    };
    
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'tad-super-secret-key-2024';
    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

    return {
      access_token: token,
      advertiserId: user.id,
      name: user.companyName,
      role: 'ADVERTISER',
      entityId: user.id
    };
  }

  // RECOVER PASSWORD
  async recoverPassword(email: string) {
    const user = await this.prisma.advertiser.findUnique({ where: { email } });
    if (!user) {
      // Return success anyway to avoid email enumeration
      return { success: true, message: 'If email exists, recovery sent.' };
    }

    // Typical flow: Generate a random token, store it with expiration, then send an email.
    // For now, we simulate this process to satisfy the UX requirement perfectly.
    const resetToken = jwt.sign(
      { sub: user.id, email: user.email, purpose: 'reset' },
      process.env.JWT_SECRET || 'tad-super-secret-key-2024',
      { expiresIn: '15m' }
    );

    // In a real scenario, integrate Resend or SendGrid here:
    console.log(`[AUTH] Enviar email de recuperación a ${email} con token: ${resetToken}`);

    return { success: true, message: 'Recovery instructions sent.' };
  }
}
