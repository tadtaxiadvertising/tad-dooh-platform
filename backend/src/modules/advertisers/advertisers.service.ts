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
        campaigns: true
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
    await this.prisma.campaign.deleteMany({ where: { advertiser_id: id } });
    return this.prisma.advertiser.delete({
      where: { id }
    });
  }
}
