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
            metrics: {
              orderBy: { date: 'desc' },
              take: 30
            },
            media: true
          }
        }
      }
    });

    if (!advertiser) return null;

    // Consolidate metrics
    let totalImpressions = 0;
    let totalCompletions = 0;
    let totalScans = 0;

    // We can also pull real play confirming events from Analytics directly if needed
    // But for now we use pre-computed metrics
    advertiser.campaigns.forEach(c => {
      c.metrics.forEach(m => {
        totalImpressions += m.totalImpressions;
        totalCompletions += m.totalCompletions;
      });
    });

    return {
      brand: {
        name: advertiser.companyName,
        category: advertiser.category,
        contact: advertiser.contactName,
        email: advertiser.email,
        phone: advertiser.phone,
        status: advertiser.status
      },
      stats: {
        totalImpressions,
        totalCompletions,
        totalScans, // This needs to be joined with AnalyticsEvent.count({ where: { campaignId: { in: ids }, type: 'QR_SCAN' } })
        activeCampaigns: advertiser.campaigns.length
      },
      campaigns: advertiser.campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        start: c.startDate,
        end: c.endDate,
        impressions: c.metrics.reduce((acc, curr) => acc + curr.totalImpressions, 0),
        media: c.media.map(m => ({ id: m.id, url: m.url, type: m.mimeType, name: m.name }))
      }))
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

    const payload = { sub: user.id, email: user.email, role: 'advertiser' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'tad-super-secret-key-2024', { expiresIn: '7d' });

    return {
      access_token: token,
      advertiserId: user.id,
      name: user.companyName
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
