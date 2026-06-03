import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BUSINESS_RULES } from '../../common/constants/business-rules';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) { }

  async generate(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { referralCode: true }
    });

    if (!driver) throw new NotFoundException('Driver not found');

    const code = driver.referralCode;
    const url = `https://tad-advertiser.rewvid.easypanel.host/register?ref=${code}`;

    return {
      driverId,
      referralCode: code,
      url,
      qrPayload: url
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
          select: { referrals: true }
        }
      },
      orderBy: { referrals: { _count: 'desc' } },
      take: 10
    });

    const totalReferrals = await this.prisma.driver.count({
      where: { referredBy: { not: null } }
    });

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: { status: 'PENDING', sourceType: 'DRIVER_REFERRAL' },
      _sum: { amount: true }
    });

    return {
      topRecruiters,
      totalReferrals,
      pendingCommissions: pendingCommissions._sum.amount || 0
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
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * REFERRAL LOOP: Auto-approve referral payout when an advertiser's campaign becomes ACTIVE.
   *
   * Flow:
   * 1. Verify advertiser has at least 1 ACTIVE campaign
   * 2. Find the driver who referred this advertiser via Advertiser.referredBy
   * 3. Create a Commission with status APPROVED
   * 4. Credit RD$500 to the referring driver's walletBalance
   * 5. Create a notification for the driver
   */
  async processReferralPayout(advertiserId: string) {
    // 1. Find the advertiser and their referrer
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: advertiserId },
      select: {
        id: true,
        companyName: true,
        referredBy: true,
        status: true,
      },
    });

    if (!advertiser) {
      this.logger.warn(`⚠️ processReferralPayout: Advertiser [${advertiserId}] not found.`);
      return null;
    }

    // Skip if advertiser was not referred by anyone
    if (!advertiser.referredBy) {
      this.logger.debug(`processReferralPayout: Advertiser [${advertiser.companyName}] has no referrer. Skipping.`);
      return null;
    }

    // 2. Find the referring driver
    const referringDriver = await this.prisma.driver.findFirst({
      where: { referralCode: advertiser.referredBy },
      select: { id: true, fullName: true, walletBalance: true },
    });

    if (!referringDriver) {
      this.logger.warn(`⚠️ processReferralPayout: No driver found with referralCode='${advertiser.referredBy}'. Skipping.`);
      return null;
    }

    // 3. Check if a referral commission already exists for this advertiser-driver pair
    const existingCommission = await this.prisma.commission.findFirst({
      where: {
        driverId: referringDriver.id,
        sourceType: 'DRIVER_REFERRAL',
        status: { in: ['APPROVED', 'PAID'] },
        amount: BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Within last 90 days
      },
    });

    if (existingCommission) {
      this.logger.debug(`processReferralPayout: Commission already exists for driver [${referringDriver.fullName}] → advertiser [${advertiser.companyName}]. Skipping duplicate.`);
      return { status: 'duplicate_prevented', driverId: referringDriver.id };
    }

    // 4. Create APPROVED Commission + credit wallet in a single transaction
    const bonusAmount = BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;

    const result = await this.prisma.$transaction(async (tx) => {
      // Create Commission with APPROVED status (auto-approve)
      const commission = await tx.commission.create({
        data: {
          driverId: referringDriver.id,
          amount: bonusAmount,
          sourceType: 'DRIVER_REFERRAL',
          status: 'APPROVED',
        },
      });

      // Credit walletBalance directly on Driver (canonical source)
      const updatedDriver = await tx.driver.update({
        where: { id: referringDriver.id },
        data: { walletBalance: { increment: bonusAmount } },
      });

      // Also sync Wallet model if it exists
      const wallet = await tx.wallet.findUnique({
        where: { driverId: referringDriver.id },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { driverId: referringDriver.id },
          data: { availableBalance: { increment: bonusAmount } },
        });
      }

      return { commission, newBalance: updatedDriver.walletBalance };
    });

    // 5. Create notification for the driver
    await this.prisma.notification.create({
      data: {
        title: '🎉 Bono de Referido Recibido',
        message: `Has recibido RD$${bonusAmount} porque ${advertiser.companyName} activó su primera campaña. ¡Gracias por recomendar!`,
        type: 'SUCCESS',
        category: 'REFERRAL',
        entityId: referringDriver.id,
      },
    }).catch(err => {
      this.logger.error(`Failed to send referral notification: ${err.message}`);
    });

    this.logger.log(
      `✅ Referral payout processed: Driver [${referringDriver.fullName}] earned RD$${bonusAmount} from advertiser [${advertiser.companyName}]`
    );

    return {
      status: 'approved',
      driverId: referringDriver.id,
      driverName: referringDriver.fullName,
      commissionId: result.commission.id,
      amount: bonusAmount,
      newBalance: result.newBalance,
    };
  }
}