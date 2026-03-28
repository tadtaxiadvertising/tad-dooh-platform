import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  }) {
    return this.prisma.advertiser.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
      }
    });
  }

  async update(id: string, data: any) {
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
}
