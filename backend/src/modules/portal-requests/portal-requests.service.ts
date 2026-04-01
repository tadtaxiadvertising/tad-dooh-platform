import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    advertiserId: string;
    campaignId?: string;
    type: string;
    title: string;
    description?: string;
    data?: any;
  }) {
    return (this.prisma as any).portalRequest.create({
      data: {
        advertiserId: data.advertiserId,
        campaignId: data.campaignId,
        type: data.type,
        title: data.title,
        description: data.description,
        data: data.data ? JSON.stringify(data.data) : '{}',
        status: 'PENDING',
      },
    });
  }

  async findAll() {
    return (this.prisma as any).portalRequest.findMany({
      include: {
        advertiser: {
          select: {
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAdvertiser(advertiserId: string) {
    return (this.prisma as any).portalRequest.findMany({
      where: { advertiserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return (this.prisma as any).portalRequest.findUnique({
      where: { id },
      include: {
        advertiser: true,
      },
    });
  }

  async update(id: string, updateData: {
    status?: string;
    adminNotes?: string;
  }) {
    return (this.prisma as any).portalRequest.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return (this.prisma as any).portalRequest.delete({
      where: { id },
    });
  }
}
