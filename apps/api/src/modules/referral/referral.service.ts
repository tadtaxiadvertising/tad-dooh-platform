import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { referralCode: true },
    });

    if (!driver) throw new NotFoundException("Driver not found");

    const code = driver.referralCode;
    const url = `https://tad-advertiser.rewvid.easypanel.host/register?ref=${code}`;

    return {
      driverId,
      referralCode: code,
      url,
      qrPayload: url,
    };
  }

  async getStats() {
    const topRecruiters = await this.prisma.driver.findMany({
      where: { referrals: { some: {} } },
      select: {
        id: true,
        fullName: true,
        referralCode: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: { referrals: { _count: "desc" } },
      take: 10,
    });

    const totalReferrals = await this.prisma.driver.count({
      where: { referredBy: { not: null } },
    });

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: { status: "PENDING", sourceType: "DRIVER_REFERRAL" },
      _sum: { amount: true },
    });

    return {
      topRecruiters,
      totalReferrals,
      pendingCommissions: pendingCommissions._sum.amount || 0,
    };
  }

  async getNetwork() {
    return this.prisma.driver.findMany({
      where: { referredBy: { not: null } },
      select: {
        id: true,
        fullName: true,
        referredBy: true,
        createdAt: true,
        status: true,
        referredByDriver: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
